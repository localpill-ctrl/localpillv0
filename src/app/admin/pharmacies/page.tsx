'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/admin';
import { getAllUsers } from '@/lib/firebase/firestore';
import { User } from '@/types';
import {
  ArrowLeft,
  Store,
  MapPin,
  CheckCircle,
  Circle,
} from 'lucide-react';

export default function AdminPharmaciesPage() {
  const router = useRouter();
  const { firebaseUser, loading: authLoading } = useAuth();
  const [pharmacies, setPharmacies] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if user is admin
  useEffect(() => {
    if (!authLoading) {
      if (!firebaseUser || !isAdmin(firebaseUser.email)) {
        router.push('/');
      }
    }
  }, [firebaseUser, authLoading, router]);

  // Fetch pharmacies
  useEffect(() => {
    const fetchPharmacies = async () => {
      try {
        const data = await getAllUsers('pharmacy');
        setPharmacies(data);
      } catch (err) {
        console.error('Error fetching pharmacies:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPharmacies();
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
            <h1 className="text-xl font-semibold">Pharmacies</h1>
            <p className="text-sm text-gray-500">{pharmacies.length} registered</p>
          </div>
        </div>
      </header>

      <main className="px-6 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : pharmacies.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No pharmacies registered yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pharmacies.map((pharmacy) => (
              <div
                key={pharmacy.uid}
                className="bg-white p-4 rounded-xl border border-gray-100"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary-light rounded-full flex items-center justify-center flex-shrink-0">
                    <Store className="w-5 h-5 text-primary-dark" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">
                        {pharmacy.pharmacyProfile?.pharmacyName}
                      </h3>
                      {pharmacy.pharmacyProfile?.isOnline ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-green-600 bg-green-50">
                          <Circle className="w-2 h-2 fill-current" />
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-gray-500 bg-gray-100">
                          <Circle className="w-2 h-2" />
                          Offline
                        </span>
                      )}
                      {pharmacy.pharmacyProfile?.isVerified && (
                        <CheckCircle className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{pharmacy.displayName}</p>
                    <p className="text-sm text-gray-500">{pharmacy.phone}</p>
                    {pharmacy.pharmacyProfile?.location?.address && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">
                          {pharmacy.pharmacyProfile.location.address}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      License: {pharmacy.pharmacyProfile?.licenseNumber}
                    </p>
                    <p className="text-xs text-gray-400">
                      Joined:{' '}
                      {pharmacy.createdAt?.toDate?.()?.toLocaleDateString('en-IN', {
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
