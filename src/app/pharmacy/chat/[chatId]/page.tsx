'use client';

import { useParams } from 'next/navigation';
import ChatWindow from '@/components/chat/ChatWindow';

export default function PharmacyChatPage() {
  const params = useParams();
  const chatId = params.chatId as string;

  return (
    <ChatWindow
      chatId={chatId}
      userRole="pharmacy"
      backPath="/pharmacy/dashboard"
    />
  );
}
