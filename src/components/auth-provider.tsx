
"use client";

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, type User, signInAnonymously } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';

interface UserProfile {
    email: string;
    name: string;
    plan: 'free' | 'family' | 'pro' | 'agency' | 'admin';
    phone?: string;
    address?: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, userProfile: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Effect for handling authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        try {
          const userCredential = await signInAnonymously(auth);
          setUser(userCredential.user);
        } catch (error) {
          console.error("Anonymous sign-in failed:", error);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Effect for fetching user profile data when user is authenticated
  const fetchUserProfile = useCallback(async () => {
    if (user && !user.isAnonymous) { // Only fetch profile for non-anonymous users
      const userDocRef = doc(db, 'users', user.uid);
      try {
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as UserProfile);
        }
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        setUserProfile(null);
      }
    } else {
      setUserProfile(null);
    }
  }, [user]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-200">
          <div className="flex flex-col items-center">
              <svg className="animate-spin h-10 w-10 text-blue-600 dark:text-blue-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-lg">Initializing TaxWise...</p>
          </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
