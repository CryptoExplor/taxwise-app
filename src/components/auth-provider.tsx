
"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

// List of routes that are publicly accessible
const publicRoutes = ['/login'];
const protectedRoutes = ['/', '/profile', '/admin'];


export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    if (loading) return;

    const isPublicRoute = publicRoutes.includes(pathname);
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
    
    // If not authenticated and on a protected route, redirect to login
    if (!user && isProtectedRoute) {
      router.push('/login');
    } 
    // If authenticated and on a public route (like login), redirect to home
    else if (user && isPublicRoute) {
      router.push('/');
    }

  }, [user, loading, pathname, router]);


  // Show loading screen while auth state is being determined,
  // or if user is being redirected away from a protected route.
  if (loading || (!user && protectedRoutes.some(route => pathname.startsWith(route)))) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
            <Loader className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
            <p className="text-lg font-semibold text-foreground">Loading Session...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
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
