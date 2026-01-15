'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createUser } from '@/lib/firebase/firestore';
import { getCurrentLocationWithAddress } from '@/lib/utils/geohash';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import PhoneInput from '@/components/auth/PhoneInput';
import { ArrowLeft, MapPin, CheckCircle } from 'lucide-react';
import { Location } from '@/types';

export default function CustomerRegistrationPage() {
  const router = useRouter();
  const { firebaseUser, user, loading: authLoading } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState<Location | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already has profile
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login');
    }
  }, [firebaseUser, authLoading, router]);

  const handleGetLocation = async () => {
    setLocationLoading(true);
    setError('');
    try {
      const loc = await getCurrentLocationWithAddress();
      setLocation(loc);
    } catch (err) {
      console.error('Error getting location:', err);
      setError('Could not get your location. Please enable location access and try again.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firebaseUser) {
      setError('Not authenticated');
      return;
    }

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!phone.trim()) {
      setError('Please enter your phone number');
      return;
    }

    if (!location) {
      setError('Please allow location access');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createUser({
        uid: firebaseUser.uid,
        phone: phone,
        email: firebaseUser.email || '',
        displayName: name.trim(),
        role: 'customer',
        customerProfile: {
          location,
        },
      });

      router.push('/dashboard');
    } catch (err: unknown) {
      console.error('Error creating user:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create account';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
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
          onClick={() => router.push('/register')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold">Create Account</h1>
      </div>

      <div className="max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-2">Complete Your Profile</h2>
        <p className="text-gray-500 mb-6">
          We need a few details to help you find nearby pharmacies
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <PhoneInput
            label="Phone Number"
            value={phone}
            onChange={setPhone}
          />

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Your Location
            </label>
            {location ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-700 font-medium">Location captured</span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{location.address}</p>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  className="text-sm text-primary mt-2 hover:underline"
                >
                  Update location
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGetLocation}
                isLoading={locationLoading}
              >
                <MapPin className="w-4 h-4 mr-2" />
                {locationLoading ? 'Getting location...' : 'Allow Location Access'}
              </Button>
            )}
            <p className="text-xs text-gray-500 mt-1">
              We use your location to find pharmacies near you
            </p>
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={loading}
            disabled={!name.trim() || !phone.trim() || !location}
          >
            Create Account
          </Button>
        </form>
      </div>
    </div>
  );
}
