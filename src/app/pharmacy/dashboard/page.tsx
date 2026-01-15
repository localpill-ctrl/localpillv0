'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  setPharmacyOnlineStatus,
  subscribeToNearbyRequests,
  getPharmacyResponseForRequest,
} from '@/lib/firebase/firestore';
import { calculateDistance } from '@/lib/utils/geohash';
import { MedicineRequest, RequestWithDistance } from '@/types';
import { signOut } from '@/lib/firebase/auth';
import Button from '@/components/ui/Button';
import {
  Power,
  LogOut,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Pill,
  FileImage,
  MapPin,
  Settings,
} from 'lucide-react';

export default function PharmacyDashboard() {
  const router = useRouter();
  const { user } = useAuth();

  const [isOnline, setIsOnline] = useState(false);
  const [nearbyRequests, setNearbyRequests] = useState<RequestWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Initialize online status from user profile
  useEffect(() => {
    if (user?.pharmacyProfile?.isOnline !== undefined) {
      setIsOnline(user.pharmacyProfile.isOnline);
    }
  }, [user?.pharmacyProfile?.isOnline]);

  // Toggle online status
  const handleToggleOnline = async () => {
    if (!user) return;

    const newStatus = !isOnline;
    setTogglingStatus(true);

    try {
      await setPharmacyOnlineStatus(user.uid, newStatus);
      setIsOnline(newStatus);
    } catch (err) {
      console.error('Error updating online status:', err);
    } finally {
      setTogglingStatus(false);
    }
  };

  // Subscribe to nearby requests when online
  useEffect(() => {
    console.log('=== Pharmacy Dashboard Debug ===');
    console.log('User:', user?.uid);
    console.log('Pharmacy Profile:', user?.pharmacyProfile);
    console.log('Is Online:', isOnline);
    console.log('Has Location:', !!user?.pharmacyProfile?.location);

    if (!user?.pharmacyProfile?.location || !isOnline) {
      console.log('Not subscribing - missing location or offline');
      setNearbyRequests([]);
      setLoading(false);
      return;
    }

    const pharmacyLat = user.pharmacyProfile.location.lat;
    const pharmacyLng = user.pharmacyProfile.location.lng;

    console.log('Subscribing to nearby requests at:', pharmacyLat, pharmacyLng);
    console.log('Search radius: 2km');

    const unsubscribe = subscribeToNearbyRequests(
      pharmacyLat,
      pharmacyLng,
      async (requests) => {
        console.log('Received requests:', requests.length, requests);
        // Add distance info and check if already responded
        const requestsWithInfo: RequestWithDistance[] = await Promise.all(
          requests.map(async (request) => {
            const distance = calculateDistance(
              pharmacyLat,
              pharmacyLng,
              request.location.lat,
              request.location.lng
            );

            // Check if already responded
            const myResponse = await getPharmacyResponseForRequest(
              request.requestId,
              user.uid
            );

            return {
              ...request,
              distance,
              hasResponded: !!myResponse,
              myResponse: myResponse || undefined,
            };
          })
        );

        // Sort by distance
        requestsWithInfo.sort((a, b) => a.distance - b.distance);
        setNearbyRequests(requestsWithInfo);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.pharmacyProfile?.location, user?.uid, isOnline]);

  const handleLogout = async () => {
    if (user && isOnline) {
      await setPharmacyOnlineStatus(user.uid, false);
    }
    await signOut();
    router.push('/');
  };

  const pendingRequests = nearbyRequests.filter((r) => !r.hasResponded);
  const respondedRequests = nearbyRequests.filter((r) => r.hasResponded);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">
              {user?.pharmacyProfile?.pharmacyName || 'Pharmacy'}
            </h1>
            <p className="text-gray-500 text-sm">
              {isOnline ? 'Receiving requests' : 'Currently offline'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleOnline}
              disabled={togglingStatus}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors ${
                isOnline
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              <Power className="w-4 h-4" />
              {isOnline ? 'Online' : 'Offline'}
            </button>
            <button
              onClick={() => router.push('/pharmacy/settings')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-500" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <LogOut className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
      </header>

      <main className="px-6 py-6">
        {/* Offline Message */}
        {!isOnline && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <p className="text-yellow-800 font-medium">You are currently offline</p>
            <p className="text-yellow-600 text-sm mt-1">
              Turn on &quot;Online&quot; to see medicine requests from nearby customers.
            </p>
          </div>
        )}

        {/* Stats */}
        {isOnline && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Search className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingRequests.length}</p>
                  <p className="text-sm text-gray-500">New Requests</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{respondedRequests.length}</p>
                  <p className="text-sm text-gray-500">Responded</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New Requests */}
        {isOnline && pendingRequests.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">
              Nearby Requests ({pendingRequests.length})
            </h2>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <RequestCard key={request.requestId} request={request} />
              ))}
            </div>
          </section>
        )}

        {/* Responded Requests */}
        {isOnline && respondedRequests.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Your Responses</h2>
            <div className="space-y-3">
              {respondedRequests.map((request) => (
                <RequestCard key={request.requestId} request={request} />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {isOnline && nearbyRequests.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 bg-primary-light rounded-full flex items-center justify-center">
              <Pill className="w-10 h-10 text-primary-dark" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No requests nearby</h3>
            <p className="text-gray-500">
              New medicine requests from nearby customers will appear here.
            </p>
          </div>
        )}

        {loading && isOnline && (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </main>
    </div>
  );
}

function RequestCard({ request }: { request: RequestWithDistance }) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/pharmacy/request/${request.requestId}`);
  };

  // Format time remaining
  const getTimeRemaining = () => {
    const expiresAt = request.expiresAt?.toDate?.();
    if (!expiresAt) return '';

    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    if (diff <= 0) return 'Expiring soon';

    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m left`;
    return `${Math.floor(minutes / 60)}h left`;
  };

  return (
    <button
      onClick={handleClick}
      className="w-full bg-white p-4 rounded-xl border border-gray-100 text-left hover:border-gray-200 transition-colors"
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
          {request.requestType === 'prescription' ? (
            <FileImage className="w-5 h-5 text-gray-600" />
          ) : (
            <Pill className="w-5 h-5 text-gray-600" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">
            {request.requestType === 'prescription'
              ? 'Prescription Upload'
              : request.medicineText?.slice(0, 40) || 'Medicine Request'}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">
              {request.customerName}
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-sm text-primary-dark font-medium">
              {request.distance.toFixed(1)} km
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {request.hasResponded ? (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  request.myResponse?.availability === 'available'
                    ? 'text-green-600 bg-green-50'
                    : 'text-gray-600 bg-gray-100'
                }`}
              >
                {request.myResponse?.availability === 'available' ? (
                  <CheckCircle className="w-3 h-3" />
                ) : (
                  <XCircle className="w-3 h-3" />
                )}
                {request.myResponse?.availability === 'available'
                  ? 'Marked Available'
                  : 'Marked Not Available'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-blue-600 bg-blue-50">
                <Clock className="w-3 h-3" />
                {getTimeRemaining()}
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
      </div>
    </button>
  );
}
