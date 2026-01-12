import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';
import { User, Order, Chat, Message, OrderStatus } from '@/types';

// ============ USER OPERATIONS ============

export const createUser = async (userData: Partial<User>): Promise<void> => {
  if (!userData.uid) throw new Error('User ID is required');

  const userRef = doc(db, 'users', userData.uid);
  await setDoc(userRef, {
    ...userData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isActive: true,
    fcmTokens: [],
  });
};

export const getUser = async (uid: string): Promise<User | null> => {
  const userRef = doc(db, 'users', uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    return { uid: snapshot.id, ...snapshot.data() } as User;
  }
  return null;
};

export const updateUser = async (
  uid: string,
  data: Partial<User>
): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const subscribeToUser = (
  uid: string,
  callback: (user: User | null) => void
) => {
  const userRef = doc(db, 'users', uid);
  return onSnapshot(userRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ uid: snapshot.id, ...snapshot.data() } as User);
    } else {
      callback(null);
    }
  });
};

// ============ ORDER OPERATIONS ============

export const createOrder = async (
  orderData: Omit<Order, 'orderId' | 'createdAt' | 'updatedAt' | 'expiresAt'>
): Promise<string> => {
  const ordersRef = collection(db, 'orders');
  const docRef = await addDoc(ordersRef, {
    ...orderData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 60 * 1000)), // 30 mins
  });
  return docRef.id;
};

export const getOrder = async (orderId: string): Promise<Order | null> => {
  const orderRef = doc(db, 'orders', orderId);
  const snapshot = await getDoc(orderRef);

  if (snapshot.exists()) {
    return { orderId: snapshot.id, ...snapshot.data() } as Order;
  }
  return null;
};

export const subscribeToOrder = (
  orderId: string,
  callback: (order: Order | null) => void
) => {
  const orderRef = doc(db, 'orders', orderId);
  return onSnapshot(orderRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ orderId: snapshot.id, ...snapshot.data() } as Order);
    } else {
      callback(null);
    }
  });
};

export const subscribeToCustomerOrders = (
  customerId: string,
  callback: (orders: Order[]) => void
) => {
  const ordersRef = collection(db, 'orders');
  const q = query(
    ordersRef,
    where('customerId', '==', customerId),
    orderBy('createdAt', 'desc'),
    limit(20)
  );

  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(
      (doc) => ({ orderId: doc.id, ...doc.data() } as Order)
    );
    callback(orders);
  });
};

export const subscribeToPharmacyOrders = (
  pharmacyId: string,
  callback: (orders: Order[]) => void
) => {
  const ordersRef = collection(db, 'orders');
  const q = query(
    ordersRef,
    where('acceptedBy.pharmacyId', '==', pharmacyId),
    orderBy('createdAt', 'desc'),
    limit(20)
  );

  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(
      (doc) => ({ orderId: doc.id, ...doc.data() } as Order)
    );
    callback(orders);
  });
};

export const subscribeToPendingOrders = (
  constraints: QueryConstraint[],
  callback: (orders: Order[]) => void
) => {
  const ordersRef = collection(db, 'orders');
  const q = query(
    ordersRef,
    where('status', '==', 'pending'),
    ...constraints
  );

  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(
      (doc) => ({ orderId: doc.id, ...doc.data() } as Order)
    );
    callback(orders);
  });
};

// ============ CHAT OPERATIONS ============

export const getChat = async (chatId: string): Promise<Chat | null> => {
  const chatRef = doc(db, 'chats', chatId);
  const snapshot = await getDoc(chatRef);

  if (snapshot.exists()) {
    return { chatId: snapshot.id, ...snapshot.data() } as Chat;
  }
  return null;
};

export const subscribeToChat = (
  chatId: string,
  callback: (chat: Chat | null) => void
) => {
  const chatRef = doc(db, 'chats', chatId);
  return onSnapshot(chatRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ chatId: snapshot.id, ...snapshot.data() } as Chat);
    } else {
      callback(null);
    }
  });
};

export const subscribeToMessages = (
  chatId: string,
  callback: (messages: Message[]) => void
) => {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(
      (doc) => ({ messageId: doc.id, ...doc.data() } as Message)
    );
    callback(messages);
  });
};

export const sendMessage = async (
  chatId: string,
  messageData: Omit<Message, 'messageId' | 'createdAt'>
): Promise<string> => {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const docRef = await addDoc(messagesRef, {
    ...messageData,
    createdAt: serverTimestamp(),
  });

  // Update chat's lastMessage
  const chatRef = doc(db, 'chats', chatId);
  await updateDoc(chatRef, {
    lastMessage: {
      text: messageData.text,
      senderId: messageData.senderId,
      timestamp: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
};
