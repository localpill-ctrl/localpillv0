'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToCustomerRequests } from '@/lib/firebase/firestore';
import { signOut } from '@/lib/firebase/auth';
import { MedicineRequest, RequestStatus } from '@/types';
import Button from '@/components/ui/Button';
import {
  Plus,
  Search,
  LogOut,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Pill,
  FileImage,
  Settings,
  Phone,
} from 'lucide-react';

const statusConfig: Record<RequestStatus, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: 'Searching', color: 'text-blue-600 bg-blue-50', icon: Clock },
  closed: { label: 'Completed', color: 'text-green-600 bg-green-50', icon: CheckCircle },
  expired: { label: 'Expired', color: 'text-gray-600 bg-gray-50', icon: XCircle },
};

export default function CustomerDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [requests, setRequests] = useState<MedicineRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToCustomerRequests(user.uid, (requestsData) => {
      setRequests(requestsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  const activeRequests = requests.filter((r) => r.status === 'active');
  const pastRequests = requests.filter((r) => r.status !== 'active');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">
              Hi, {user?.displayName?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-gray-500 text-sm">Find medicine near you</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/settings')}
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
        {/* New Request CTA */}
        <Button
          size="lg"
          className="w-full mb-8"
          onClick={() => router.push('/request/new')}
        >
          <Search className="w-5 h-5 mr-2" />
          Find Medicine
        </Button>

        {/* Active Requests */}
        {activeRequests.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Active Requests</h2>
            <div className="space-y-3">
              {activeRequests.map((request) => (
                <RequestCard key={request.requestId} request={request} />
              ))}
            </div>
          </section>
        )}

        {/* Past Requests */}
        {pastRequests.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Past Requests</h2>
            <div className="space-y-3">
              {pastRequests.map((request) => (
                <RequestCard key={request.requestId} request={request} />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {!loading && requests.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 bg-primary-light rounded-full flex items-center justify-center">
              <Pill className="w-10 h-10 text-primary-dark" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No requests yet</h3>
            <p className="text-gray-500 mb-6">
              Search for medicine to find nearby pharmacies that have it in stock
            </p>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        )}

        {/* Customer Support */}
        <div className="mt-8 p-4 bg-gray-50 rounded-xl text-center">
          <p className="text-gray-500 text-sm mb-1">Need help?</p>
          <a
            href="tel:+919330374330"
            className="inline-flex items-center gap-2 text-primary-dark font-semibold hover:underline"
          >
            <Phone className="w-4 h-4" />
            +91 93303 74330
          </a>
        </div>
      </main>
    </div>
  );
}

function RequestCard({ request }: { request: MedicineRequest }) {
  const router = useRouter();
  const status = statusConfig[request.status];
  const StatusIcon = status.icon;

  const handleClick = () => {
    router.push(`/request/${request.requestId}`);
  };

  // Format time remaining for active requests
  const getTimeInfo = () => {
    if (request.status !== 'active') {
      return request.createdAt?.toDate?.()?.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      });
    }

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
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </span>
            {request.responseCount > 0 && (
              <span className="text-xs text-gray-500">
                {request.responseCount} {request.responseCount === 1 ? 'response' : 'responses'}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">{getTimeInfo()}</p>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
      </div>
    </button>
  );
}
