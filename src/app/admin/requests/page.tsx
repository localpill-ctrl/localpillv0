'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/admin';
import { getAllRequests } from '@/lib/firebase/firestore';
import { MedicineRequest, RequestStatus } from '@/types';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  Pill,
  FileImage,
} from 'lucide-react';

export default function AdminRequestsPage() {
  const router = useRouter();
  const { firebaseUser, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<MedicineRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RequestStatus | 'all'>('all');

  // Check if user is admin
  useEffect(() => {
    if (!authLoading) {
      if (!firebaseUser || !isAdmin(firebaseUser.email)) {
        router.push('/');
      }
    }
  }, [firebaseUser, authLoading, router]);

  // Fetch requests
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const status = filter === 'all' ? undefined : filter;
        const data = await getAllRequests(status);
        setRequests(data);
      } catch (err) {
        console.error('Error fetching requests:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [filter]);

  if (authLoading || !firebaseUser || !isAdmin(firebaseUser.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const statusConfig: Record<RequestStatus, { label: string; color: string; icon: React.ElementType }> = {
    active: { label: 'Active', color: 'text-blue-600 bg-blue-50', icon: Clock },
    closed: { label: 'Closed', color: 'text-green-600 bg-green-50', icon: CheckCircle },
    expired: { label: 'Expired', color: 'text-gray-600 bg-gray-100', icon: XCircle },
  };

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
          <h1 className="text-xl font-semibold">All Requests</h1>
        </div>
      </header>

      <main className="px-6 py-6">
        {/* Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {(['all', 'active', 'expired', 'closed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === status
                  ? 'bg-primary text-black'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No requests found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => {
              const status = statusConfig[request.status];
              const StatusIcon = status.icon;

              return (
                <div
                  key={request.requestId}
                  className="bg-white p-4 rounded-xl border border-gray-100"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      {request.requestType === 'prescription' ? (
                        <FileImage className="w-5 h-5 text-gray-600" />
                      ) : (
                        <Pill className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {request.responseCount} responses
                        </span>
                      </div>
                      <p className="font-medium truncate">
                        {request.requestType === 'prescription'
                          ? 'Prescription Upload'
                          : request.medicineText?.slice(0, 50) || 'Medicine Request'}
                      </p>
                      <p className="text-sm text-gray-500">{request.customerName}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {request.createdAt?.toDate?.()?.toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
