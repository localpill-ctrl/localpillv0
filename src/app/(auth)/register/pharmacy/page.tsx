'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createUser, getUser } from '@/lib/firebase/firestore';
import { calculateGeohash, getCurrentLocation } from '@/lib/utils/geohash';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import PhoneInput from '@/components/auth/PhoneInput';
import { ArrowLeft, MapPin, Store } from 'lucide-react';

export default function PharmacyRegistrationPage() {
  const router = useRouter();
  const { firebaseUser, user, loading: authLoading } = useAuth();

  // Phone number (collected manually since Google doesn't provide it)
  const [phone, setPhone] = useState('');

  // Pharmacy details
  const [pharmacyName, setPharmacyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [street, setStreet] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [locationLoading, setLocationLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already has pharmacy profile
  useEffect(() => {
    if (!authLoading && user?.role === 'pharmacy') {
      router.push('/pharmacy/dashboard');
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
      setError('Could not get your location. Please try again.');
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

    if (!pharmacyName.trim() || !ownerName.trim() || !licenseNumber.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (!location) {
      setError('Please allow location access');
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
        displayName: ownerName.trim(),
        role: 'pharmacy',
        pharmacyProfile: {
          pharmacyName: pharmacyName.trim(),
          licenseNumber: licenseNumber.trim(),
          address: {
            label: 'Store',
            street: street.trim(),
            area: area.trim(),
            city: city.trim(),
            state: 'Maharashtra',
            pincode: pincode.trim(),
            location: {
              lat: location.lat,
              lng: location.lng,
              geohash,
            },
          },
          location: {
            lat: location.lat,
            lng: location.lng,
            geohash,
          },
          isVerified: true,
          isOnline: false,
          rating: 5.0,
          totalOrders: 0,
        },
      });

      router.push('/pharmacy/dashboard');
    } catch (err: any) {
      console.error('Error creating pharmacy:', err);
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
        <h1 className="text-xl font-semibold">Register Pharmacy</h1>
      </div>

      <div className="max-w-md mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center">
            <Store className="w-8 h-8 text-primary-dark" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center mb-2">Pharmacy Details</h2>
        <p className="text-gray-500 text-center mb-6">
          Fill in your pharmacy information
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Pharmacy Name *"
            placeholder="e.g., Apollo Pharmacy"
            value={pharmacyName}
            onChange={(e) => setPharmacyName(e.target.value)}
            required
          />

          <Input
            label="Owner Name *"
            placeholder="Your full name"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            required
          />

          <PhoneInput
            label="Phone Number (optional)"
            value={phone}
            onChange={setPhone}
          />

          <Input
            label="Drug License Number *"
            placeholder="e.g., MH-MUM-123456"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            required
          />

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Store Location *
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
                Allow Location Access
              </Button>
            )}
          </div>

          <Input
            label="Street Address"
            placeholder="Shop no, Building, Street"
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
              placeholder="6-digit"
              value={pincode}
              onChange={(e) =>
                setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))
              }
              maxLength={6}
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={loading}
            disabled={
              !pharmacyName.trim() ||
              !ownerName.trim() ||
              !licenseNumber.trim() ||
              !location
            }
          >
            Register Pharmacy
          </Button>
        </form>
      </div>
    </div>
  );
}
