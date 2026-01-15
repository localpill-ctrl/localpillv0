'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  subscribeToChat,
  subscribeToMessages,
  sendMessage,
  subscribeToRequest,
} from '@/lib/firebase/firestore';
import { Chat, Message, MedicineRequest, UserRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import {
  ArrowLeft,
  Phone,
  Send,
  Pill,
  FileImage,
} from 'lucide-react';

interface ChatWindowProps {
  chatId: string;
  userRole: UserRole;
  backPath: string;
}

export default function ChatWindow({ chatId, userRole, backPath }: ChatWindowProps) {
  const router = useRouter();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [request, setRequest] = useState<MedicineRequest | null>(null);
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

  // Subscribe to request details
  useEffect(() => {
    if (!chat?.requestId) return;

    const unsubscribe = subscribeToRequest(chat.requestId, (requestData) => {
      setRequest(requestData);
    });

    return () => unsubscribe();
  }, [chat?.requestId]);

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
      ? chat?.participants.pharmacyId // We need to get pharmacy phone
      : request?.customerPhone;

    // For customer, get pharmacy phone from somewhere else
    // For now, just show an alert or handle differently
    if (phoneNumber) {
      window.location.href = `tel:${phoneNumber}`;
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
            <span className="text-xs text-green-600">Medicine Available</span>
          </div>
          <button
            onClick={handleCall}
            className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
          >
            <Phone className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Request Summary */}
      {request && (
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            {request.requestType === 'prescription' ? (
              <FileImage className="w-4 h-4 text-gray-500" />
            ) : (
              <Pill className="w-4 h-4 text-gray-500" />
            )}
            <p className="text-sm text-gray-600 truncate">
              {request.requestType === 'prescription'
                ? 'Prescription request'
                : request.medicineText?.slice(0, 50)}
              {request.medicineText && request.medicineText.length > 50 && '...'}
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">
                Start a conversation with {otherPartyName}
              </p>
            </div>
          )}
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
