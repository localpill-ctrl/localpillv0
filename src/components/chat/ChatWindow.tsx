'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  subscribeToChat,
  subscribeToMessages,
  sendMessage,
  subscribeToOrder,
} from '@/lib/firebase/firestore';
import { Chat, Message, Order, OrderStatus, UserRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import {
  ArrowLeft,
  Phone,
  Send,
  Package,
  CheckCircle,
  Truck,
  Clock,
} from 'lucide-react';

interface ChatWindowProps {
  chatId: string;
  userRole: UserRole;
  backPath: string;
}

const statusConfig: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  accepted: { label: 'Accepted', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'Preparing', color: 'bg-purple-100 text-purple-700' },
  out_for_delivery: { label: 'On the way', color: 'bg-orange-100 text-orange-700' },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
  expired: { label: 'Expired', color: 'bg-gray-100 text-gray-700' },
};

export default function ChatWindow({ chatId, userRole, backPath }: ChatWindowProps) {
  const router = useRouter();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  // Subscribe to chat
  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = subscribeToChat(chatId, (chatData) => {
      setChat(chatData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId]);

  // Subscribe to messages
  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = subscribeToMessages(chatId, (msgs) => {
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [chatId]);

  // Subscribe to order status
  useEffect(() => {
    if (!chat?.orderId) return;

    const unsubscribe = subscribeToOrder(chat.orderId, (orderData) => {
      setOrder(orderData);
    });

    return () => unsubscribe();
  }, [chat?.orderId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !chat) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      await sendMessage(chatId, {
        senderId: user.uid,
        senderRole: userRole,
        text: messageText,
        type: 'text',
      });
    } catch (err) {
      console.error('Error sending message:', err);
      setNewMessage(messageText); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handleCall = () => {
    const phoneNumber = userRole === 'customer'
      ? order?.acceptedBy?.pharmacyPhone
      : order?.customerPhone;

    if (phoneNumber) {
      window.location.href = `tel:${phoneNumber}`;
    }
  };

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    if (!order) return;

    try {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/config');

      await updateDoc(doc(db, 'orders', order.orderId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      // Add system message
      await sendMessage(chatId, {
        senderId: 'system',
        senderRole: userRole,
        text: `Order status updated to: ${statusConfig[newStatus].label}`,
        type: 'system',
      });
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <p className="text-gray-500 mb-4">Chat not found</p>
        <Button onClick={() => router.push(backPath)}>Go Back</Button>
      </div>
    );
  }

  const otherPartyName = userRole === 'customer'
    ? chat.participants.pharmacyName
    : chat.participants.customerName;

  const status = order ? statusConfig[order.status] : null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(backPath)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{otherPartyName}</h1>
            {status && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>
                {status.label}
              </span>
            )}
          </div>
          <button
            onClick={handleCall}
            className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
          >
            <Phone className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Order Summary (collapsible) */}
      {order && (
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <p className="text-sm text-gray-600">
            {order.requestType === 'prescription'
              ? 'Prescription order'
              : order.medicineRequest?.slice(0, 50)}
            {order.medicineRequest && order.medicineRequest.length > 50 && '...'}
          </p>
        </div>
      )}

      {/* Status Update Buttons (Pharmacy only) */}
      {userRole === 'pharmacy' && order && !['delivered', 'cancelled', 'expired'].includes(order.status) && (
        <div className="bg-white px-4 py-2 border-b border-gray-100 flex-shrink-0">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {order.status === 'accepted' && (
              <button
                onClick={() => handleUpdateStatus('in_progress')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium whitespace-nowrap"
              >
                <Package className="w-4 h-4" />
                Start Preparing
              </button>
            )}
            {order.status === 'in_progress' && (
              <button
                onClick={() => handleUpdateStatus('out_for_delivery')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-medium whitespace-nowrap"
              >
                <Truck className="w-4 h-4" />
                Out for Delivery
              </button>
            )}
            {order.status === 'out_for_delivery' && (
              <button
                onClick={() => handleUpdateStatus('delivered')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium whitespace-nowrap"
              >
                <CheckCircle className="w-4 h-4" />
                Mark Delivered
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-3">
          {messages.map((message) => (
            <MessageBubble
              key={message.messageId}
              message={message}
              isOwn={message.senderId === user?.uid}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="p-2.5 bg-primary text-black rounded-full hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  // System messages
  if (message.type === 'system') {
    return (
      <div className="text-center">
        <span className="inline-block px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
          {message.text}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
          isOwn
            ? 'bg-primary text-black rounded-br-md'
            : 'bg-gray-100 text-black rounded-bl-md'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
        <p className={`text-xs mt-1 ${isOwn ? 'text-black/50' : 'text-gray-400'}`}>
          {message.createdAt?.toDate?.()?.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          }) || 'Now'}
        </p>
      </div>
    </div>
  );
}
