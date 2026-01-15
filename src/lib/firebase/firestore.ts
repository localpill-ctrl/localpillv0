import {
  doc,
  getDoc,
  getDocs,
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
  increment,
} from 'firebase/firestore';
import { db } from './config';
import {
  User,
  MedicineRequest,
  PharmacyResponse,
  Chat,
  Message,
  GlobalStats,
  AvailabilityStatus,
} from '@/types';
import { distanceBetween, geohashQueryBounds } from 'geofire-common';

const BROADCAST_RADIUS_KM = 2; // 2km radius

// ============ USER OPERATIONS ============

export const createUser = async (userData: Partial<User>): Promise<void> => {
  if (!userData.uid) throw new Error('User ID is required');

  const userRef = doc(db, 'users', userData.uid);
  await setDoc(userRef, {
    ...userData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isActive: true,
  });

  // Update global stats
  if (userData.role === 'customer') {
    await updateGlobalStats({ totalCustomers: 1 });
  } else if (userData.role === 'pharmacy') {
    await updateGlobalStats({ totalPharmacies: 1 });
  }
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

export const setPharmacyOnlineStatus = async (
  uid: string,
  isOnline: boolean
): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    'pharmacyProfile.isOnline': isOnline,
    updatedAt: serverTimestamp(),
  });
};

// ============ REQUEST OPERATIONS ============

export const createRequest = async (
  requestData: Omit<MedicineRequest, 'requestId' | 'createdAt' | 'expiresAt' | 'responseCount'>
): Promise<string> => {
  const requestsRef = collection(db, 'requests');
  const docRef = await addDoc(requestsRef, {
    ...requestData,
    responseCount: 0,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000)), // 1 hour
  });

  // Update global stats
  await updateGlobalStats({ totalRequests: 1, activeRequests: 1 });

  return docRef.id;
};

export const getRequest = async (requestId: string): Promise<MedicineRequest | null> => {
  const requestRef = doc(db, 'requests', requestId);
  const snapshot = await getDoc(requestRef);

  if (snapshot.exists()) {
    return { requestId: snapshot.id, ...snapshot.data() } as MedicineRequest;
  }
  return null;
};

export const subscribeToRequest = (
  requestId: string,
  callback: (request: MedicineRequest | null) => void
) => {
  const requestRef = doc(db, 'requests', requestId);
  return onSnapshot(requestRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ requestId: snapshot.id, ...snapshot.data() } as MedicineRequest);
    } else {
      callback(null);
    }
  });
};

export const subscribeToCustomerRequests = (
  customerId: string,
  callback: (requests: MedicineRequest[]) => void
) => {
  const requestsRef = collection(db, 'requests');
  const q = query(
    requestsRef,
    where('customerId', '==', customerId),
    orderBy('createdAt', 'desc'),
    limit(20)
  );

  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(
      (doc) => ({ requestId: doc.id, ...doc.data() } as MedicineRequest)
    );
    callback(requests);
  });
};

export const closeRequest = async (
  requestId: string,
  reason: 'expired' | 'manual'
): Promise<void> => {
  const requestRef = doc(db, 'requests', requestId);
  await updateDoc(requestRef, {
    status: reason === 'expired' ? 'expired' : 'closed',
    closedAt: serverTimestamp(),
    closedReason: reason,
  });

  // Update global stats
  await updateGlobalStats({ activeRequests: -1 });
};

// Subscribe to active requests near a pharmacy location
export const subscribeToNearbyRequests = (
  pharmacyLat: number,
  pharmacyLng: number,
  callback: (requests: MedicineRequest[]) => void
) => {
  // Get geohash bounds for the query
  const bounds = geohashQueryBounds([pharmacyLat, pharmacyLng], BROADCAST_RADIUS_KM * 1000);

  const requestsRef = collection(db, 'requests');

  // We need to make multiple queries for each bound
  const unsubscribes: (() => void)[] = [];
  const allRequests: Map<string, MedicineRequest> = new Map();

  bounds.forEach((bound) => {
    const q = query(
      requestsRef,
      where('status', '==', 'active'),
      where('location.geohash', '>=', bound[0]),
      where('location.geohash', '<=', bound[1]),
      orderBy('location.geohash'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      // Update our local map
      snapshot.docChanges().forEach((change) => {
        const request = { requestId: change.doc.id, ...change.doc.data() } as MedicineRequest;

        if (change.type === 'removed') {
          allRequests.delete(request.requestId);
        } else {
          // Filter by actual distance
          const distance = distanceBetween(
            [pharmacyLat, pharmacyLng],
            [request.location.lat, request.location.lng]
          );
          if (distance <= BROADCAST_RADIUS_KM) {
            allRequests.set(request.requestId, request);
          }
        }
      });

      // Convert map to array and sort by distance
      const requestsArray = Array.from(allRequests.values()).sort((a, b) => {
        const distA = distanceBetween(
          [pharmacyLat, pharmacyLng],
          [a.location.lat, a.location.lng]
        );
        const distB = distanceBetween(
          [pharmacyLat, pharmacyLng],
          [b.location.lat, b.location.lng]
        );
        return distA - distB;
      });

      callback(requestsArray);
    });

    unsubscribes.push(unsub);
  });

  // Return a function that unsubscribes from all queries
  return () => {
    unsubscribes.forEach((unsub) => unsub());
  };
};

// ============ RESPONSE OPERATIONS ============

export const submitResponse = async (
  requestId: string,
  pharmacyId: string,
  pharmacyName: string,
  pharmacyPhone: string,
  pharmacyLocation: { lat: number; lng: number; address: string; geohash: string },
  customerLocation: { lat: number; lng: number },
  availability: AvailabilityStatus
): Promise<{ responseId: string; chatId?: string }> => {
  const distance = distanceBetween(
    [pharmacyLocation.lat, pharmacyLocation.lng],
    [customerLocation.lat, customerLocation.lng]
  );

  const responsesRef = collection(db, 'requests', requestId, 'responses');

  // Check if already responded
  const existingQuery = query(responsesRef, where('pharmacyId', '==', pharmacyId));
  const existing = await getDocs(existingQuery);
  if (!existing.empty) {
    throw new Error('Already responded to this request');
  }

  let chatId: string | undefined;

  // Create chat if available
  if (availability === 'available') {
    const request = await getRequest(requestId);
    if (request) {
      chatId = await createChat(
        requestId,
        request.customerId,
        request.customerName,
        pharmacyId,
        pharmacyName
      );
    }
  }

  const docRef = await addDoc(responsesRef, {
    pharmacyId,
    pharmacyName,
    pharmacyPhone,
    pharmacyLocation,
    distance,
    availability,
    chatId,
    respondedAt: serverTimestamp(),
  });

  // Update request response count and first response time
  const requestRef = doc(db, 'requests', requestId);
  const request = await getRequest(requestId);

  const updateData: Record<string, unknown> = {
    responseCount: increment(1),
  };

  if (!request?.firstResponseAt) {
    updateData.firstResponseAt = serverTimestamp();
  }

  await updateDoc(requestRef, updateData);

  return { responseId: docRef.id, chatId };
};

export const subscribeToResponses = (
  requestId: string,
  callback: (responses: PharmacyResponse[]) => void
) => {
  const responsesRef = collection(db, 'requests', requestId, 'responses');
  const q = query(responsesRef, orderBy('respondedAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const responses = snapshot.docs.map(
      (doc) => ({ responseId: doc.id, ...doc.data() } as PharmacyResponse)
    );
    callback(responses);
  });
};

export const getPharmacyResponseForRequest = async (
  requestId: string,
  pharmacyId: string
): Promise<PharmacyResponse | null> => {
  const responsesRef = collection(db, 'requests', requestId, 'responses');
  const q = query(responsesRef, where('pharmacyId', '==', pharmacyId));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { responseId: doc.id, ...doc.data() } as PharmacyResponse;
  }
  return null;
};

// ============ CHAT OPERATIONS ============

export const createChat = async (
  requestId: string,
  customerId: string,
  customerName: string,
  pharmacyId: string,
  pharmacyName: string
): Promise<string> => {
  const chatsRef = collection(db, 'chats');
  const docRef = await addDoc(chatsRef, {
    requestId,
    participants: {
      customerId,
      customerName,
      pharmacyId,
      pharmacyName,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isActive: true,
  });
  return docRef.id;
};

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

// ============ ADMIN OPERATIONS ============

export const updateGlobalStats = async (
  updates: Partial<Record<keyof GlobalStats, number>>
): Promise<void> => {
  const statsRef = doc(db, 'stats', 'global');

  const updateData: Record<string, unknown> = {};
  Object.entries(updates).forEach(([key, value]) => {
    updateData[key] = increment(value);
  });

  try {
    await updateDoc(statsRef, updateData);
  } catch {
    // Document might not exist, create it
    await setDoc(statsRef, {
      totalRequests: updates.totalRequests || 0,
      totalCustomers: updates.totalCustomers || 0,
      totalPharmacies: updates.totalPharmacies || 0,
      activeRequests: updates.activeRequests || 0,
    });
  }
};

export const getGlobalStats = async (): Promise<GlobalStats> => {
  const statsRef = doc(db, 'stats', 'global');
  const snapshot = await getDoc(statsRef);

  if (snapshot.exists()) {
    return snapshot.data() as GlobalStats;
  }

  return {
    totalRequests: 0,
    totalCustomers: 0,
    totalPharmacies: 0,
    activeRequests: 0,
  };
};

export const subscribeToGlobalStats = (
  callback: (stats: GlobalStats) => void
) => {
  const statsRef = doc(db, 'stats', 'global');
  return onSnapshot(statsRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as GlobalStats);
    } else {
      callback({
        totalRequests: 0,
        totalCustomers: 0,
        totalPharmacies: 0,
        activeRequests: 0,
      });
    }
  });
};

// Get all users for admin
export const getAllUsers = async (role?: 'customer' | 'pharmacy'): Promise<User[]> => {
  const usersRef = collection(db, 'users');
  const q = role
    ? query(usersRef, where('role', '==', role), orderBy('createdAt', 'desc'))
    : query(usersRef, orderBy('createdAt', 'desc'));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() } as User));
};

// Get all requests for admin
export const getAllRequests = async (status?: 'active' | 'expired' | 'closed'): Promise<MedicineRequest[]> => {
  const requestsRef = collection(db, 'requests');
  const q = status
    ? query(requestsRef, where('status', '==', status), orderBy('createdAt', 'desc'))
    : query(requestsRef, orderBy('createdAt', 'desc'));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ requestId: doc.id, ...doc.data() } as MedicineRequest));
};
