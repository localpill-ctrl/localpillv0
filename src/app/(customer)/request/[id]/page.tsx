'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeToRequest,
  subscribeToResponses,
  closeRequest,
} from '@/lib/firebase/firestore';
import { MedicineRequest, PharmacyResponse } from '@/types';
import Button from '@/components/ui/Button';
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Navigation,
  Clock,
  CheckCircle,
  XCircle,
  X,
  Pill,
  FileImage,
  MapPin,
} from 'lucide-react';

export default function RequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const requestId = params.id as string;
  const { user } = useAuth();

  const [request, setRequest] = useState<MedicineRequest | null>(null);
  const [responses, setResponses] = useState<PharmacyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!requestId) return;

    const unsubRequest = subscribeToRequest(requestId, (data) => {
      setRequest(data);
      setLoading(false);
    });

    const unsubResponses = subscribeToResponses(requestId, (data) => {
      // Sort by distance
      const sorted = [...data].sort((a, b) => a.distance - b.distance);
      setResponses(sorted);
    });

    return () => {
      unsubRequest();
      unsubResponses();
    };
  }, [requestId]);

  const handleCloseRequest = async () => {
    if (!request) return;
    setClosing(true);
    try {
      await closeRequest(requestId, 'manual');
      router.push('/dashboard');
    } catch (err) {
      console.error('Error closing request:', err);
      setClosing(false);
    }
  };

  const openGoogleMaps = (lat: number, lng: number) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      '_blank'
    );
  };

  const availableResponses = responses.filter((r) => r.availability === 'available');
  const unavailableResponses = responses.filter((r) => r.availability === 'not_available');

  // Get time remaining for active requests
  const getTimeRemaining = () => {
    if (!request || request.status !== 'active') return null;
    const expiresAt = request.expiresAt?.toDate?.();
    if (!expiresAt) return null;

    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    if (diff <= 0) return 'Expiring soon';

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
          <Button onClick={() => router.push('/dashboard')} className="mt-4">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Request Details</h1>
        </div>
      </header>

      <main className="px-6 py-6">
        {/* Request Info Card */}
        <div className="bg-white rounded-xl p-4 mb-6 border border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-primary-light rounded-full flex items-center justify-center flex-shrink-0">
              {request.requestType === 'prescription' ? (
                <FileImage className="w-5 h-5 text-primary-dark" />
              ) : (
                <Pill className="w-5 h-5 text-primary-dark" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="font-semibold">
                {request.requestType === 'prescription'
                  ? 'Prescription Upload'
                  : request.medicineText || 'Medicine Request'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                {request.status === 'active' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-blue-600 bg-blue-50">
                    <Clock className="w-3 h-3" />
                    {getTimeRemaining()}
                  </span>
                )}
                {request.status === 'closed' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-green-600 bg-green-50">
                    <CheckCircle className="w-3 h-3" />
                    Completed
                  </span>
                )}
                {request.status === 'expired' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-gray-600 bg-gray-100">
                    <XCircle className="w-3 h-3" />
                    Expired
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Prescription Images */}
          {request.requestType === 'prescription' && request.prescriptionImageUrls && (
            <div className="mt-4 flex gap-2 overflow-x-auto">
              {request.prescriptionImageUrls.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Prescription ${index + 1}`}
                  className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                />
              ))}
            </div>
          )}
        </div>

        {/* Responses Section */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">
            Pharmacy Responses ({responses.length})
          </h3>

          {responses.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center border border-gray-100">
              <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Waiting for pharmacy responses...</p>
              <p className="text-sm text-gray-400 mt-1">
                Nearby pharmacies are being notified
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Available pharmacies first */}
              {availableResponses.map((response) => (
                <PharmacyResponseCard
                  key={response.responseId}
                  response={response}
                  onDirections={() =>
                    openGoogleMaps(
                      response.pharmacyLocation.lat,
                      response.pharmacyLocation.lng
                    )
                  }
                  onChat={() =>
                    response.chatId && router.push(`/chat/${response.chatId}`)
                  }
                />
              ))}

              {/* Unavailable pharmacies */}
              {unavailableResponses.map((response) => (
                <PharmacyResponseCard
                  key={response.responseId}
                  response={response}
                  onDirections={() =>
                    openGoogleMaps(
                      response.pharmacyLocation.lat,
                      response.pharmacyLocation.lng
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Close Request Button */}
        {request.status === 'active' && (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleCloseRequest}
            isLoading={closing}
          >
            <X className="w-4 h-4 mr-2" />
            Close Request
          </Button>
        )}
      </main>
    </div>
  );
}

function PharmacyResponseCard({
  response,
  onDirections,
  onChat,
}: {
  response: PharmacyResponse;
  onDirections: () => void;
  onChat?: () => void;
}) {
  const isAvailable = response.availability === 'available';

  return (
    <div
      className={`bg-white rounded-xl p-4 border ${
        isAvailable ? 'border-green-200' : 'border-gray-100'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {isAvailable ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-gray-400" />
          )}
          <div>
            <h4 className="font-medium">{response.pharmacyName}</h4>
            <p className="text-sm text-gray-500">{response.distance.toFixed(1)} km away</p>
          </div>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            isAvailable
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {isAvailable ? 'Available' : 'Not Available'}
        </span>
      </div>

      {isAvailable && (
        <div className="flex gap-2">
          <a
            href={`tel:${response.pharmacyPhone}`}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            <Phone className="w-4 h-4" />
            Call
          </a>
          {onChat && response.chatId && (
            <button
              onClick={onChat}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Chat
            </button>
          )}
          <button
            onClick={onDirections}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            <Navigation className="w-4 h-4" />
            Directions
          </button>
        </div>
      )}
    </div>
  );
}
