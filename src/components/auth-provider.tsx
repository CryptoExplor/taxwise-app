
"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { Loader } from 'lucide-react';
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

const publicRoutes = ['/login', '/pricing', '/contact', '/calculator'];

// This function checks if a given pathname is a protected route.
const isProtectedRoute = (pathname: string | null) => {
    if (!pathname) return true; // Assume protected if pathname isn't available yet
    return !publicRoutes.includes(pathname);
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as UserProfile);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    if (loading) return; // Don't do anything until the auth state is resolved

    const protectedRoute = isProtectedRoute(pathname);
    
    if (!user && protectedRoute) {
      router.push('/login');
    } 
    else if (user && pathname === '/login') {
      router.push('/');
    }

  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
            <Loader className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
            <p className="text-lg font-semibold text-foreground">Loading Session...</p>
        </div>
      </div>
    );
  }

  // If not loading and trying to access a protected route without being logged in,
  // we return null to prevent a flash of content before redirection.
  if (!user && isProtectedRoute(pathname)) {
    return null;
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
