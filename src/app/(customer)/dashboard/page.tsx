'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToCustomerOrders } from '@/lib/firebase/firestore';
import { signOut } from '@/lib/firebase/auth';
import { Order, OrderStatus } from '@/types';
import Button from '@/components/ui/Button';
import {
  Plus,
  Package,
  MessageCircle,
  LogOut,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
} from 'lucide-react';

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: any }> = {
  pending: { label: 'Finding Pharmacy', color: 'text-yellow-600 bg-yellow-50', icon: Clock },
  accepted: { label: 'Accepted', color: 'text-blue-600 bg-blue-50', icon: CheckCircle },
  in_progress: { label: 'Preparing', color: 'text-purple-600 bg-purple-50', icon: Package },
  out_for_delivery: { label: 'Out for Delivery', color: 'text-orange-600 bg-orange-50', icon: Truck },
  delivered: { label: 'Delivered', color: 'text-green-600 bg-green-50', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'text-red-600 bg-red-50', icon: XCircle },
  expired: { label: 'Expired', color: 'text-gray-600 bg-gray-50', icon: XCircle },
};

export default function CustomerDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToCustomerOrders(user.uid, (ordersData) => {
      setOrders(ordersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  const activeOrders = orders.filter(
    (o) => !['delivered', 'cancelled', 'expired'].includes(o.status)
  );
  const pastOrders = orders.filter((o) =>
    ['delivered', 'cancelled', 'expired'].includes(o.status)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">
              Hi, {user?.displayName?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-gray-500 text-sm">What do you need today?</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <LogOut className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </header>

      <main className="px-6 py-6">
        {/* New Request CTA */}
        <Button
          size="lg"
          className="w-full mb-8"
          onClick={() => router.push('/new-request')}
        >
          <Plus className="w-5 h-5 mr-2" />
          New Medicine Request
        </Button>

        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Active Orders</h2>
            <div className="space-y-3">
              {activeOrders.map((order) => (
                <OrderCard key={order.orderId} order={order} />
              ))}
            </div>
          </section>
        )}

        {/* Past Orders */}
        {pastOrders.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Past Orders</h2>
            <div className="space-y-3">
              {pastOrders.map((order) => (
                <OrderCard key={order.orderId} order={order} />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {!loading && orders.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 bg-primary-light rounded-full flex items-center justify-center">
              <Package className="w-10 h-10 text-primary-dark" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
            <p className="text-gray-500 mb-6">
              Create your first medicine request to get started
            </p>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </main>
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const router = useRouter();
  const status = statusConfig[order.status];
  const StatusIcon = status.icon;

  const handleClick = () => {
    if (order.chatId) {
      router.push(`/chat/${order.chatId}`);
    } else {
      router.push(`/orders/${order.orderId}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full bg-white p-4 rounded-xl border border-gray-100 text-left hover:border-gray-200 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </div>
          <p className="font-medium mt-2">
            {order.requestType === 'prescription'
              ? 'Prescription Upload'
              : order.medicineRequest?.slice(0, 50) || 'Medicine Request'}
          </p>
          {order.acceptedBy && (
            <p className="text-sm text-gray-500 mt-1">
              {order.acceptedBy.pharmacyName}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-2">
            {order.createdAt?.toDate?.()?.toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            }) || 'Just now'}
          </p>
        </div>
        {order.chatId && (
          <MessageCircle className="w-5 h-5 text-primary-dark" />
        )}
      </div>
    </button>
  );
}
