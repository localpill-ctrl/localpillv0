import { Timestamp } from 'firebase/firestore';

// Address type
export interface Address {
  label: string;
  street: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  location: {
    lat: number;
    lng: number;
    geohash: string;
  };
}

// User roles
export type UserRole = 'customer' | 'pharmacy';

// Customer profile
export interface CustomerProfile {
  addresses: Address[];
  defaultAddressIndex: number;
}

// Pharmacy profile
export interface PharmacyProfile {
  pharmacyName: string;
  licenseNumber: string;
  address: Address;
  location: {
    lat: number;
    lng: number;
    geohash: string;
  };
  isVerified: boolean;
  isOnline: boolean;
  rating: number;
  totalOrders: number;
}

// User type
export interface User {
  uid: string;
  phone?: string;  // Optional - collected during registration but not verified
  email?: string;
  displayName: string;
  role: UserRole;
  fcmTokens: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
  customerProfile?: CustomerProfile;
  pharmacyProfile?: PharmacyProfile;
}

// Order status
export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'expired';

// Order request type
export type RequestType = 'prescription' | 'text';

// Order type
export interface Order {
  orderId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  requestType: RequestType;
  prescriptionImageUrls?: string[];
  medicineRequest?: string;
  notes?: string;
  deliveryAddress: Address;
  status: OrderStatus;
  acceptedBy?: {
    pharmacyId: string;
    pharmacyName: string;
    pharmacyPhone: string;
    acceptedAt: Timestamp;
  };
  chatId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp;
  broadcastRadius: number;
  notifiedPharmacies: string[];
}

// Chat type
export interface Chat {
  chatId: string;
  orderId: string;
  participants: {
    customerId: string;
    customerName: string;
    pharmacyId: string;
    pharmacyName: string;
  };
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: Timestamp;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
}

// Message type
export type MessageType = 'text' | 'image' | 'system';

export interface Message {
  messageId: string;
  senderId: string;
  senderRole: UserRole;
  text: string;
  type: MessageType;
  imageUrl?: string;
  createdAt: Timestamp;
  readAt?: Timestamp;
}

// Order with distance (for pharmacy view)
export interface OrderWithDistance extends Order {
  distance: number;
}
