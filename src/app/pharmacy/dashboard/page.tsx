'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  updateUser,
  subscribeToPendingOrders,
  subscribeToPharmacyOrders,
} from '@/lib/firebase/firestore';
import {
  calculateDistance,
  DEFAULT_RADIUS_KM,
} from '@/lib/utils/geohash';
import { Order, OrderWithDistance } from '@/types';
import { orderBy } from 'firebase/firestore';
import OrderAlertModal from '@/components/pharmacy/OrderAlertModal';
import Button from '@/components/ui/Button';
import {
  Power,
  LogOut,
  Package,
  Clock,
  CheckCircle,
  MessageCircle,
} from 'lucide-react';
import { signOut } from '@/lib/firebase/auth';

export default function PharmacyDashboard() {
  const router = useRouter();
  const { user } = useAuth();

  const [isOnline, setIsOnline] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<OrderWithDistance[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [currentAlert, setCurrentAlert] = useState<OrderWithDistance | null>(null);
  const [skippedOrders, setSkippedOrders] = useState<Set<string>>(new Set());
  const [isAccepting, setIsAccepting] = useState(false);
  const [loading, setLoading] = useState(true);

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
    setIsOnline(newStatus);

    try {
      await updateUser(user.uid, {
        pharmacyProfile: {
          ...user.pharmacyProfile!,
          isOnline: newStatus,
        },
      });
    } catch (err) {
      console.error('Error updating online status:', err);
      setIsOnline(!newStatus); // Revert on error
    }
  };

  // Subscribe to pending orders when online
  useEffect(() => {
    if (!user?.pharmacyProfile?.location || !isOnline) {
      setPendingOrders([]);
      return;
    }

    const pharmacyLat = user.pharmacyProfile.location.lat;
    const pharmacyLng = user.pharmacyProfile.location.lng;

    // For simplicity in v0, we'll just query pending orders and filter client-side
    const unsubscribe = subscribeToPendingOrders(
      [orderBy('createdAt', 'desc')],
      (orders) => {
        // Filter by distance and add distance info
        const ordersWithDistance: OrderWithDistance[] = orders
          .map((order) => {
            const distance = calculateDistance(
              pharmacyLat,
              pharmacyLng,
              order.deliveryAddress.location.lat,
              order.deliveryAddress.location.lng
            );
            return { ...order, distance };
          })
          .filter((order) => order.distance <= DEFAULT_RADIUS_KM)
          .sort((a, b) => a.distance - b.distance);

        setPendingOrders(ordersWithDistance);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.pharmacyProfile?.location, isOnline]);

  // Subscribe to pharmacy's accepted orders
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToPharmacyOrders(user.uid, (orders) => {
      setMyOrders(orders);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Show alert for new pending orders
  useEffect(() => {
    if (!isOnline || pendingOrders.length === 0) {
      setCurrentAlert(null);
      return;
    }

    // Find first order that hasn't been skipped
    const nextOrder = pendingOrders.find(
      (order) => !skippedOrders.has(order.orderId)
    );

    if (nextOrder && !currentAlert) {
      setCurrentAlert(nextOrder);
    }
  }, [pendingOrders, skippedOrders, isOnline, currentAlert]);

  const handleAcceptOrder = async () => {
    if (!currentAlert || !user) return;

    setIsAccepting(true);

    try {
      const { doc, updateDoc, collection, addDoc, serverTimestamp, getDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/config');

      const orderRef = doc(db, 'orders', currentAlert.orderId);

      // Check if order is still pending
      const orderSnap = await getDoc(orderRef);
      const orderData = orderSnap.data();

      if (orderData?.status !== 'pending') {
        alert('This order was already accepted by another pharmacy');
        setCurrentAlert(null);
        setIsAccepting(false);
        return;
      }

      // Create chat
      const chatRef = await addDoc(collection(db, 'chats'), {
        orderId: currentAlert.orderId,
        participants: {
          customerId: currentAlert.customerId,
          customerName: currentAlert.customerName,
          pharmacyId: user.uid,
          pharmacyName: user.pharmacyProfile?.pharmacyName || 'Pharmacy',
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
      });

      // Update order
      await updateDoc(orderRef, {
        status: 'accepted',
        chatId: chatRef.id,
        acceptedBy: {
          pharmacyId: user.uid,
          pharmacyName: user.pharmacyProfile?.pharmacyName || 'Pharmacy',
          pharmacyPhone: user.phone,
          acceptedAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      });

      // Navigate to chat
      router.push(`/pharmacy/chat/${chatRef.id}`);
    } catch (err: any) {
      console.error('Error accepting order:', err);
      alert(err.message || 'Failed to accept order. Please try again.');
    } finally {
      setIsAccepting(false);
      setCurrentAlert(null);
    }
  };

  const handleSkipOrder = useCallback(() => {
    if (currentAlert) {
      setSkippedOrders((prev) => new Set([...prev, currentAlert.orderId]));
      setCurrentAlert(null);
    }
  }, [currentAlert]);

  const handleLogout = async () => {
    if (user && isOnline) {
      await updateUser(user.uid, {
        pharmacyProfile: {
          ...user.pharmacyProfile!,
          isOnline: false,
        },
      });
    }
    await signOut();
    router.push('/');
  };

  const activeOrders = myOrders.filter(
    (o) => !['delivered', 'cancelled', 'expired'].includes(o.status)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Order Alert Modal */}
      {currentAlert && (
        <OrderAlertModal
          order={currentAlert}
          onAccept={handleAcceptOrder}
          onSkip={handleSkipOrder}
          isAccepting={isAccepting}
        />
      )}

      {/* Header */}
      <header className="bg-white px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">
              {user?.pharmacyProfile?.pharmacyName || 'Pharmacy'}
            </h1>
            <p className="text-gray-500 text-sm">
              {isOnline ? 'Accepting orders' : 'Currently offline'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleOnline}
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
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <LogOut className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
      </header>

      <main className="px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingOrders.length}</p>
                <p className="text-sm text-gray-500">Nearby Orders</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeOrders.length}</p>
                <p className="text-sm text-gray-500">Active Orders</p>
              </div>
            </div>
          </div>
        </div>

        {/* Offline Message */}
        {!isOnline && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <p className="text-yellow-800 font-medium">You are currently offline</p>
            <p className="text-yellow-600 text-sm mt-1">
              Turn on &quot;Online&quot; to start receiving orders from nearby customers.
            </p>
          </div>
        )}

        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Your Active Orders</h2>
            <div className="space-y-3">
              {activeOrders.map((order) => (
                <PharmacyOrderCard key={order.orderId} order={order} />
              ))}
            </div>
          </section>
        )}

        {/* Pending Orders List */}
        {isOnline && pendingOrders.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">
              Nearby Orders ({pendingOrders.length})
            </h2>
            <div className="space-y-3">
              {pendingOrders
                .filter((o) => !skippedOrders.has(o.orderId))
                .map((order) => (
                  <button
                    key={order.orderId}
                    onClick={() => setCurrentAlert(order)}
                    className="w-full bg-white p-4 rounded-xl border border-gray-100 text-left hover:border-primary transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium text-yellow-600 bg-yellow-50 mb-2">
                          <Clock className="w-3 h-3" />
                          Waiting
                        </span>
                        <p className="font-medium">
                          {order.requestType === 'prescription'
                            ? 'Prescription Upload'
                            : order.medicineRequest?.slice(0, 40) || 'Medicine Request'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {order.deliveryAddress.area || order.deliveryAddress.city}
                        </p>
                      </div>
                      <span className="text-sm text-primary-dark font-medium">
                        {order.distance?.toFixed(1)} km
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {isOnline && pendingOrders.length === 0 && activeOrders.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 bg-primary-light rounded-full flex items-center justify-center">
              <Package className="w-10 h-10 text-primary-dark" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
            <p className="text-gray-500">
              New orders from nearby customers will appear here.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function PharmacyOrderCard({ order }: { order: Order }) {
  const router = useRouter();

  const statusConfig: Record<string, { label: string; color: string }> = {
    accepted: { label: 'Accepted', color: 'text-blue-600 bg-blue-50' },
    in_progress: { label: 'Preparing', color: 'text-purple-600 bg-purple-50' },
    out_for_delivery: { label: 'Out for Delivery', color: 'text-orange-600 bg-orange-50' },
    delivered: { label: 'Delivered', color: 'text-green-600 bg-green-50' },
  };

  const status = statusConfig[order.status] || { label: order.status, color: 'text-gray-600 bg-gray-50' };

  return (
    <button
      onClick={() => {
        if (order.chatId) {
          router.push(`/pharmacy/chat/${order.chatId}`);
        }
      }}
      className="w-full bg-white p-4 rounded-xl border border-gray-100 text-left hover:border-gray-200 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
          <p className="font-medium mt-2">
            {order.requestType === 'prescription'
              ? 'Prescription'
              : order.medicineRequest?.slice(0, 40) || 'Medicine Request'}
          </p>
          <p className="text-sm text-gray-500 mt-1">{order.customerName}</p>
        </div>
        {order.chatId && (
          <MessageCircle className="w-5 h-5 text-primary-dark" />
        )}
      </div>
    </button>
  );
}
