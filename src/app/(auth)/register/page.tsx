'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import Button from '@/components/ui/Button';
import { ArrowLeft, User, Store } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { firebaseUser, user, loading } = useAuth();

  // If user already has a profile, redirect to dashboard
  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'pharmacy') {
        router.push('/pharmacy/dashboard');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  // If not authenticated at all, redirect to login
  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.push('/login');
    }
  }, [firebaseUser, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push('/')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold">Choose Account Type</h1>
      </div>

      <div className="max-w-md mx-auto">
        <h2 className="text-2xl font-bold text-center mb-2">
          How do you want to use Where is My Medicine?
        </h2>
        <p className="text-gray-500 text-center mb-8">
          Select the option that best describes you
        </p>

        <div className="space-y-4">
          {/* Customer Option */}
          <button
            onClick={() => router.push('/register/customer')}
            className="w-full p-6 border-2 border-gray-200 rounded-2xl text-left hover:border-primary hover:bg-primary-light/30 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-primary-dark" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">I need medicines</h3>
                <p className="text-gray-500 text-sm mt-1">
                  Order medicines from local pharmacies near you. Upload
                  prescriptions or search by name.
                </p>
              </div>
            </div>
          </button>

          {/* Pharmacy Option */}
          <button
            onClick={() => router.push('/register/pharmacy')}
            className="w-full p-6 border-2 border-gray-200 rounded-2xl text-left hover:border-primary hover:bg-primary-light/30 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
                <Store className="w-6 h-6 text-primary-dark" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">I own a pharmacy</h3>
                <p className="text-gray-500 text-sm mt-1">
                  Receive orders from customers in your area. Grow your business
                  with Where is My Medicine.
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
