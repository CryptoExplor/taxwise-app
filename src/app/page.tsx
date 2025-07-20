
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
import { LandingPage } from "@/components/landing-page";

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

  const Header = () => (
     <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="mr-4 flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <Logo className="h-8 w-8 mr-2 text-primary" />
              <h1 className="text-2xl font-bold font-headline">TaxWise</h1>
            </Link>
          </div>
          <nav className="flex items-center gap-2">
             {user ? (
                <>
                  <Button variant="ghost" asChild>
                    <Link href="/profile">
                        <User className="mr-2 h-4 w-4" /> Profile
                    </Link>
                  </Button>
                  <Button variant="outline" onClick={handleLogout}>Logout</Button>
                </>
             ) : (
                <>
                   <Button variant="ghost" asChild>
                      <Link href="/login">Login</Link>
                   </Button>
                   <Button asChild>
                      <Link href="/login">Get Started</Link>
                   </Button>
                </>
             )}
          </nav>
        </div>
      </header>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow">
        {user ? <Dashboard /> : <LandingPage />}
      </main>
    </div>
  );
}
