'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/admin';
import { getAllUsers } from '@/lib/firebase/firestore';
import { User } from '@/types';
import {
  ArrowLeft,
  User as UserIcon,
  MapPin,
  Phone,
} from 'lucide-react';

export default function AdminCustomersPage() {
  const router = useRouter();
  const { firebaseUser, loading: authLoading } = useAuth();
  const [customers, setCustomers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if user is admin
  useEffect(() => {
    if (!authLoading) {
      if (!firebaseUser || !isAdmin(firebaseUser.email)) {
        router.push('/');
      }
    }
  }, [firebaseUser, authLoading, router]);

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await getAllUsers('customer');
        setCustomers(data);
      } catch (err) {
        console.error('Error fetching customers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  if (authLoading || !firebaseUser || !isAdmin(firebaseUser.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold">Customers</h1>
            <p className="text-sm text-gray-500">{customers.length} registered</p>
          </div>
        </div>
      </header>

      <main className="px-6 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No customers registered yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {customers.map((customer) => (
              <div
                key={customer.uid}
                className="bg-white p-4 rounded-xl border border-gray-100"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">{customer.displayName}</h3>
                    {customer.phone && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Phone className="w-3 h-3" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    {customer.email && (
                      <p className="text-sm text-gray-500">{customer.email}</p>
                    )}
                    {customer.customerProfile?.location?.address && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">
                          {customer.customerProfile.location.address}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Joined:{' '}
                      {customer.createdAt?.toDate?.()?.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
