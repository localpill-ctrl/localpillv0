'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { subscribeToAuthState } from '@/lib/firebase/auth';
import { getUser, subscribeToUser } from '@/lib/firebase/firestore';
import { User } from '@/types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isCustomer: boolean;
  isPharmacy: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Subscribe to Firebase auth state
  useEffect(() => {
    const unsubscribe = subscribeToAuthState((fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to user document when authenticated
  useEffect(() => {
    if (!firebaseUser) return;

    const unsubscribe = subscribeToUser(firebaseUser.uid, (userData) => {
      setUser(userData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firebaseUser]);

  const value: AuthContextType = {
    firebaseUser,
    user,
    loading,
    isAuthenticated: !!firebaseUser,
    isCustomer: user?.role === 'customer',
    isPharmacy: user?.role === 'pharmacy',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
