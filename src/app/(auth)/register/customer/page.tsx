'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createUser } from '@/lib/firebase/firestore';
import { calculateGeohash, getCurrentLocation } from '@/lib/utils/geohash';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import PhoneInput from '@/components/auth/PhoneInput';
import { ArrowLeft, MapPin } from 'lucide-react';

export default function CustomerRegistrationPage() {
  const router = useRouter();
  const { firebaseUser, user, loading: authLoading } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
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
    try {
      const loc = await getCurrentLocation();
      setLocation(loc);
    } catch (err) {
      console.error('Error getting location:', err);
      setError('Could not get your location. Please enter address manually.');
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

    if (!location) {
      setError('Please allow location access for delivery');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const geohash = calculateGeohash(location.lat, location.lng);

      await createUser({
        uid: firebaseUser.uid,
        phone: phone || undefined,
        email: firebaseUser.email || '',
        displayName: name.trim(),
        role: 'customer',
        customerProfile: {
          addresses: [
            {
              label: 'Home',
              street: street.trim(),
              area: area.trim(),
              city: city.trim(),
              state: 'Maharashtra', // Default for now
              pincode: pincode.trim(),
              location: {
                lat: location.lat,
                lng: location.lng,
                geohash,
              },
            },
          ],
          defaultAddressIndex: 0,
        },
      });

      router.push('/dashboard');
    } catch (err: any) {
      console.error('Error creating user:', err);
      setError(err.message || 'Failed to create account. Please try again.');
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
          We need a few details to get you started
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
            label="Phone Number (optional)"
            value={phone}
            onChange={setPhone}
          />

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Delivery Location
            </label>
            {location ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                <MapPin className="w-5 h-5 text-green-600" />
                <span className="text-green-700 text-sm">
                  Location captured successfully
                </span>
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
          </div>

          <Input
            label="Street Address"
            placeholder="House no, Building, Street"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
          />

          <Input
            label="Area / Locality"
            placeholder="Area name"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City"
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <Input
              label="Pincode"
              placeholder="6-digit pincode"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={loading}
            disabled={!name.trim() || !location}
          >
            Create Account
          </Button>
        </form>
      </div>
    </div>
  );
}
