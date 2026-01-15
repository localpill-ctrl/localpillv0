'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeToRequest,
  getPharmacyResponseForRequest,
  submitResponse,
} from '@/lib/firebase/firestore';
import { calculateDistance } from '@/lib/utils/geohash';
import { MedicineRequest, PharmacyResponse, AvailabilityStatus } from '@/types';
import Button from '@/components/ui/Button';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Pill,
  FileImage,
  MapPin,
  MessageCircle,
  User,
} from 'lucide-react';

export default function PharmacyRequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const requestId = params.id as string;
  const { user } = useAuth();

  const [request, setRequest] = useState<MedicineRequest | null>(null);
  const [myResponse, setMyResponse] = useState<PharmacyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    if (!requestId || !user) return;

    const unsubRequest = subscribeToRequest(requestId, (data) => {
      setRequest(data);
      setLoading(false);

      // Calculate distance
      if (data && user.pharmacyProfile?.location) {
        const dist = calculateDistance(
          user.pharmacyProfile.location.lat,
          user.pharmacyProfile.location.lng,
          data.location.lat,
          data.location.lng
        );
        setDistance(dist);
      }
    });

    // Check if already responded
    getPharmacyResponseForRequest(requestId, user.uid).then((response) => {
      setMyResponse(response);
    });

    return () => unsubRequest();
  }, [requestId, user]);

  const handleSubmitResponse = async (availability: AvailabilityStatus) => {
    if (!request || !user || !user.pharmacyProfile) return;

    setSubmitting(true);
    setError('');

    try {
      const result = await submitResponse(
        requestId,
        user.uid,
        user.pharmacyProfile.pharmacyName,
        user.phone,
        user.pharmacyProfile.location,
        { lat: request.location.lat, lng: request.location.lng },
        availability
      );

      // Update local state
      setMyResponse({
        responseId: result.responseId,
        pharmacyId: user.uid,
        pharmacyName: user.pharmacyProfile.pharmacyName,
        pharmacyPhone: user.phone,
        pharmacyLocation: user.pharmacyProfile.location,
        distance: distance || 0,
        availability,
        chatId: result.chatId,
        respondedAt: { toDate: () => new Date() } as any,
      });

      // If marked available and chat created, navigate to chat
      if (availability === 'available' && result.chatId) {
        router.push(`/pharmacy/chat/${result.chatId}`);
      }
    } catch (err: unknown) {
      console.error('Error submitting response:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit response';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Get time remaining
  const getTimeRemaining = () => {
    if (!request || request.status !== 'active') return null;
    const expiresAt = request.expiresAt?.toDate?.();
    if (!expiresAt) return null;

    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    if (diff <= 0) return 'Expired';

    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} minutes left`;
    return `${Math.floor(minutes / 60)} hour left`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Request not found</p>
          <Button onClick={() => router.push('/pharmacy/dashboard')} className="mt-4">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isExpired = request.status === 'expired';
  const isClosed = request.status === 'closed';
  const canRespond = request.status === 'active' && !myResponse;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/pharmacy/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Medicine Request</h1>
        </div>
      </header>

      <main className="px-6 py-6">
        {/* Status Banner */}
        {(isExpired || isClosed) && (
          <div className={`p-4 rounded-xl mb-6 ${isExpired ? 'bg-gray-100' : 'bg-green-50'}`}>
            <p className={`font-medium ${isExpired ? 'text-gray-700' : 'text-green-700'}`}>
              {isExpired ? 'This request has expired' : 'This request has been closed'}
            </p>
          </div>
        )}

        {/* Customer Info */}
        <div className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-medium">{request.customerName}</h3>
              <p className="text-sm text-gray-500">
                {distance !== null && `${distance.toFixed(1)} km away`}
              </p>
            </div>
          </div>
          {request.status === 'active' && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Clock className="w-4 h-4" />
              <span>{getTimeRemaining()}</span>
            </div>
          )}
        </div>

        {/* Request Details */}
        <div className="bg-white rounded-xl p-4 mb-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            {request.requestType === 'prescription' ? (
              <FileImage className="w-5 h-5 text-primary-dark" />
            ) : (
              <Pill className="w-5 h-5 text-primary-dark" />
            )}
            <h3 className="font-medium">
              {request.requestType === 'prescription' ? 'Prescription' : 'Medicine Request'}
            </h3>
          </div>

          {/* Text Request */}
          {request.requestType === 'text' && request.medicineText && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-800">{request.medicineText}</p>
            </div>
          )}

          {/* Prescription Images */}
          {request.requestType === 'prescription' && request.prescriptionImageUrls && (
            <div className="space-y-3">
              {request.prescriptionImageUrls.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Prescription ${index + 1}`}
                  className="w-full rounded-lg"
                />
              ))}
            </div>
          )}
        </div>

        {/* Response Section */}
        {myResponse ? (
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <h3 className="font-medium mb-3">Your Response</h3>
            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${
                myResponse.availability === 'available'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {myResponse.availability === 'available' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span className="font-medium">
                {myResponse.availability === 'available'
                  ? 'Marked as Available'
                  : 'Marked as Not Available'}
              </span>
            </div>

            {myResponse.availability === 'available' && myResponse.chatId && (
              <Button
                className="w-full mt-4"
                onClick={() => router.push(`/pharmacy/chat/${myResponse.chatId}`)}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat with Customer
              </Button>
            )}
          </div>
        ) : canRespond ? (
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <h3 className="font-medium mb-3">Do you have this medicine?</h3>
            <p className="text-sm text-gray-500 mb-4">
              Let the customer know if you have the medicine available.
            </p>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => handleSubmitResponse('not_available')}
                isLoading={submitting}
                disabled={submitting}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Not Available
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleSubmitResponse('available')}
                isLoading={submitting}
                disabled={submitting}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Available
              </Button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
