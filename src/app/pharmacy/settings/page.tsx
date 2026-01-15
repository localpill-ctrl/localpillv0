'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { updateUser } from '@/lib/firebase/firestore';
import { getCurrentLocationWithAddress } from '@/lib/utils/geohash';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import PhoneInput from '@/components/auth/PhoneInput';
import { ArrowLeft, MapPin, CheckCircle, Save } from 'lucide-react';
import { Location } from '@/types';

export default function PharmacySettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [phone, setPhone] = useState('');
  const [pharmacyName, setPharmacyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [location, setLocation] = useState<Location | null>(null);

  const [locationLoading, setLocationLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Initialize form with current user data
  useEffect(() => {
    if (user) {
      setOwnerName(user.displayName || '');
      setPhone(user.phone || '');
      setPharmacyName(user.pharmacyProfile?.pharmacyName || '');
      setLocation(user.pharmacyProfile?.location || null);
    }
  }, [user]);

  // Redirect if not authenticated or not a pharmacy
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (!authLoading && user?.role !== 'pharmacy') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

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

    if (!user) {
      setError('Not authenticated');
      return;
    }

    if (!pharmacyName.trim() || !ownerName.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (!phone.trim()) {
      setError('Please enter your phone number');
      return;
    }

    if (!location) {
      setError('Please set your location');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await updateUser(user.uid, {
        displayName: ownerName.trim(),
        phone: phone,
        pharmacyProfile: {
          ...user.pharmacyProfile!,
          pharmacyName: pharmacyName.trim(),
          location,
        },
      });

      setSuccess('Profile updated successfully!');
    } catch (err: unknown) {
      console.error('Error updating profile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
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
          onClick={() => router.push('/pharmacy/dashboard')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold">Pharmacy Settings</h1>
      </div>

      <div className="max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-2">Update Profile</h2>
        <p className="text-gray-500 mb-6">
          Update your pharmacy information
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Pharmacy Name"
            placeholder="e.g., Apollo Pharmacy"
            value={pharmacyName}
            onChange={(e) => setPharmacyName(e.target.value)}
            required
          />

          <Input
            label="Owner Name"
            placeholder="Your full name"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            required
          />

          <PhoneInput
            label="Phone Number"
            value={phone}
            onChange={setPhone}
          />

          {/* License Number - Read Only */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Drug License Number
            </label>
            <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-xl">
              {user.pharmacyProfile?.licenseNumber || 'Not set'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Contact support to update license number
            </p>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Store Location
            </label>
            {location ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-700 font-medium">Location set</span>
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
                {locationLoading ? 'Getting location...' : 'Set Location'}
              </Button>
            )}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          {success && <p className="text-green-600 text-sm">{success}</p>}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={loading}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </form>
      </div>
    </div>
  );
}
