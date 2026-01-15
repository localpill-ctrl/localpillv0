import { Timestamp } from 'firebase/firestore';

// User roles
export type UserRole = 'customer' | 'pharmacy' | 'admin';

// Location type
export interface Location {
  lat: number;
  lng: number;
  address: string;
  geohash: string;
}

// Customer profile (simplified - just location)
export interface CustomerProfile {
  location: Location;
}

// Pharmacy profile
export interface PharmacyProfile {
  pharmacyName: string;
  licenseNumber: string;
  location: Location;
  isVerified: boolean;
  isOnline: boolean;
}

// User type
export interface User {
  uid: string;
  phone: string;
  email?: string;
  displayName: string;
  role: UserRole;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
  customerProfile?: CustomerProfile;
  pharmacyProfile?: PharmacyProfile;
}

// Request status
export type RequestStatus = 'active' | 'expired' | 'closed';

// Request type (prescription or text)
export type RequestType = 'prescription' | 'text';

// Medicine Request (replaces Order)
export interface MedicineRequest {
  requestId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  requestType: RequestType;
  prescriptionImageUrls?: string[];
  medicineText?: string;
  location: Location;
  status: RequestStatus;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  closedAt?: Timestamp;
  closedReason?: 'expired' | 'manual';
  // Analytics fields
  firstResponseAt?: Timestamp;
  responseCount: number;
}

// Availability status
export type AvailabilityStatus = 'available' | 'not_available';

// Pharmacy Response to a request
export interface PharmacyResponse {
  responseId: string;
  pharmacyId: string;
  pharmacyName: string;
  pharmacyPhone: string;
  pharmacyLocation: Location;
  distance: number; // in km
  availability: AvailabilityStatus;
  respondedAt: Timestamp;
  chatId?: string; // Created when pharmacy marks available
}

// Request with responses (for customer view)
export interface RequestWithResponses extends MedicineRequest {
  responses: PharmacyResponse[];
}

// Request with distance (for pharmacy view)
export interface RequestWithDistance extends MedicineRequest {
  distance: number;
  hasResponded?: boolean;
  myResponse?: PharmacyResponse;
}

// Chat type (simplified)
export interface Chat {
  chatId: string;
  requestId: string;
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

// Global stats (for admin)
export interface GlobalStats {
  totalRequests: number;
  totalCustomers: number;
  totalPharmacies: number;
  activeRequests: number;
}
