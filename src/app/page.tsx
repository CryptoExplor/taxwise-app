
"use client";

import { Dashboard } from "@/components/dashboard";
import { Logo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User } from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
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
              <div className="flex items-center gap-2">
                <Link href="/profile">
                    <Button variant="ghost" size="icon">
                        <User />
                        <span className="sr-only">Profile</span>
                    </Button>
                </Link>
                <Button variant="outline" onClick={handleLogout}>Logout</Button>
              </div>
          )}
        </div>
      </header>
      <main className="flex-grow">
        <Dashboard />
      </main>
    </div>
  );
}
