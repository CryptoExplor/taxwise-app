
"use client";

import { Dashboard } from "@/components/dashboard";
import { Logo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function Home() {
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // The onAuthStateChanged listener in AuthProvider will handle the user state.
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="mr-4 flex items-center">
            <Logo className="h-8 w-8 mr-2 text-primary" />
            <h1 className="text-2xl font-bold font-headline">TaxWise</h1>
          </div>
          {user && (
              <Button variant="outline" onClick={handleLogout}>Logout</Button>
          )}
        </div>
      </header>
      <main className="flex-grow">
        <Dashboard />
      </main>
    </div>
  );
}
