
"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ShieldCheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-blue-600"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
);


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
      if (currentUser && !currentUser.isAnonymous) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().plan === 'admin') {
          setIsAdmin(true);
        } else {
          router.push("/");
        }
      } else if (currentUser && currentUser.isAnonymous){
         router.push("/");
      }
      setLoading(false);
    };
    if(currentUser) {
        checkAdminStatus();
    }
  }, [currentUser, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">Verifying Access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; 
  }
  
  const navLinks = [
    { href: "/admin/user-plans", label: "User Plans" },
    { href: "/admin/employee-management", label: "Employee Management" },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
       <div className="flex justify-between items-center mb-6 flex-wrap gap-4 p-4 rounded-lg bg-white dark:bg-gray-800 border dark:border-gray-700">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheckIcon />
            Admin Panel
          </h1>
          <div className="flex items-center gap-2 border rounded-lg p-1 bg-gray-100 dark:bg-gray-700">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors ${
                  pathname === link.href
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      {children}
    </div>
  );
}
