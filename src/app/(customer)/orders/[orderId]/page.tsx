'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { subscribeToOrder } from '@/lib/firebase/firestore';
import { Order, OrderStatus } from '@/types';
import Button from '@/components/ui/Button';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  Package,
  Truck,
  XCircle,
  MessageCircle,
  Loader2,
} from 'lucide-react';

const statusSteps: { status: OrderStatus; label: string; icon: any }[] = [
  { status: 'pending', label: 'Finding Pharmacy', icon: Clock },
  { status: 'accepted', label: 'Accepted', icon: CheckCircle },
  { status: 'in_progress', label: 'Preparing', icon: Package },
  { status: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
  { status: 'delivered', label: 'Delivered', icon: CheckCircle },
];

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    const unsubscribe = subscribeToOrder(orderId, (orderData) => {
      setOrder(orderData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <XCircle className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
        <p className="text-gray-500 mb-6">This order doesn&apos;t exist or was deleted.</p>
        <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
      </div>
    );
  }

  const currentStepIndex = statusSteps.findIndex((s) => s.status === order.status);
  const isCancelled = order.status === 'cancelled' || order.status === 'expired';

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Order Details</h1>
        </div>
      </header>

      <main className="px-6 py-6">
        {/* Status Animation for Pending */}
        {order.status === 'pending' && (
          <div className="text-center py-8 mb-6">
            <div className="w-20 h-20 mx-auto mb-4 bg-primary-light rounded-full flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-primary-dark animate-spin" />
            </div>
            <h2 className="text-xl font-bold mb-2">Finding Pharmacies</h2>
            <p className="text-gray-500">
              Nearby pharmacies are being notified about your request...
            </p>
          </div>
        )}

        {/* Cancelled/Expired State */}
        {isCancelled && (
          <div className="text-center py-8 mb-6">
            <div className="w-20 h-20 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">
              Order {order.status === 'cancelled' ? 'Cancelled' : 'Expired'}
            </h2>
            <p className="text-gray-500">
              {order.status === 'expired'
                ? 'No pharmacy accepted this order in time.'
                : 'This order was cancelled.'}
            </p>
            <Button className="mt-6" onClick={() => router.push('/new-request')}>
              Create New Request
            </Button>
          </div>
        )}

        {/* Progress Tracker */}
        {!isCancelled && order.status !== 'pending' && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Order Status</h2>
            <div className="space-y-4">
              {statusSteps.map((step, index) => {
                const isCompleted = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const StepIcon = step.icon;

                return (
                  <div key={step.status} className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCompleted || isCurrent
                          ? 'bg-primary text-black'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <StepIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p
                        className={`font-medium ${
                          isCompleted || isCurrent ? 'text-black' : 'text-gray-400'
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                    {isCurrent && (
                      <span className="text-xs text-primary-dark font-medium bg-primary-light px-2 py-1 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pharmacy Info */}
        {order.acceptedBy && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h3 className="font-semibold mb-2">Pharmacy</h3>
            <p className="text-gray-700">{order.acceptedBy.pharmacyName}</p>
            <p className="text-sm text-gray-500">{order.acceptedBy.pharmacyPhone}</p>
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <h3 className="font-semibold mb-2">Order Details</h3>
          {order.requestType === 'prescription' ? (
            <div>
              <p className="text-gray-700 mb-2">Prescription Upload</p>
              <div className="flex gap-2 overflow-x-auto">
                {order.prescriptionImageUrls?.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Prescription ${index + 1}`}
                    className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-700">{order.medicineRequest}</p>
          )}
          {order.notes && (
            <p className="text-sm text-gray-500 mt-2">Notes: {order.notes}</p>
          )}
        </div>

        {/* Delivery Address */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <h3 className="font-semibold mb-2">Delivery Address</h3>
          <p className="text-gray-700">
            {[
              order.deliveryAddress.street,
              order.deliveryAddress.area,
              order.deliveryAddress.city,
            ]
              .filter(Boolean)
              .join(', ')}
          </p>
          {order.deliveryAddress.pincode && (
            <p className="text-sm text-gray-500">{order.deliveryAddress.pincode}</p>
          )}
        </div>

        {/* Chat Button */}
        {order.chatId && !isCancelled && (
          <Button
            className="w-full"
            size="lg"
            onClick={() => router.push(`/chat/${order.chatId}`)}
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Chat with Pharmacy
          </Button>
        )}
      </main>
    </div>
  );
}
