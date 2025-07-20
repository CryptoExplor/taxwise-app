"use client";

import { useAuth } from "@/components/auth-provider";
import { Loader, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().plan === 'admin') {
          setIsAdmin(true);
        } else {
          router.push("/");
        }
      }
      setLoading(false);
    };
    if(currentUser) {
        checkAdminStatus();
    }
  }, [currentUser, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
            <Loader className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
            <p className="text-lg font-semibold text-foreground">Verifying Access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Or a more explicit "Access Denied" component
  }
  
  const navLinks = [
    { href: "/admin/user-plans", label: "User Plans" },
    { href: "/admin/employee-management", label: "Employee Management" },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
       <div className="flex justify-between items-center mb-6 flex-wrap gap-4 p-4 rounded-lg bg-card border">
          <h1 className="text-2xl font-headline font-bold flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-primary" />
            Admin Panel
          </h1>
          <div className="flex items-center gap-2 border rounded-lg p-1 bg-muted">
            {navLinks.map((link) => (
              <Button
                key={link.href}
                asChild
                variant={pathname === link.href ? "secondary" : "ghost"}
                className={cn(
                  "font-semibold",
                  pathname === link.href && "bg-background shadow-sm"
                )}
              >
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
          </div>
        </div>
      {children}
    </div>
  );
}
