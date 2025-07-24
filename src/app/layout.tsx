"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider, useAppContext } from "@/context/app-context";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import { BarChart, Users, Upload, LogOut, User, Sun, Moon, Settings, FileText, Calculator, Landmark } from "lucide-react";
import { AppInitializer } from "@/components/app-initializer";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";


const inter = Inter({ subsets: ["latin"], variable: "--font-body" });

const Header = () => {
    const { user } = useAuth();
    const router = useRouter();
    const [theme, setTheme] = useState('light');

    useEffect(() => {
        const storedTheme = localStorage.getItem('theme') || 'light';
        setTheme(storedTheme);
        document.documentElement.classList.toggle('dark', storedTheme === 'dark');
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };

    const handleLogout = async () => {
        await auth.signOut();
        router.push('/login');
    };

    return (
        <header className="flex-shrink-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
            <div className="flex items-center justify-between p-4">
                <div className="flex items-center">
                    <Landmark className="h-8 w-8 text-primary" />
                    <h1 className="text-xl font-semibold ml-2">TaxWise</h1>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                    </button>
                    {user && !user.isAnonymous && (
                         <div className="relative group">
                            <button className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                                <User className="h-5 w-5" />
                            </button>
                             <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 hidden group-hover:block">
                                <Link href="/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <User className="mr-2 h-4 w-4"/> Profile
                                </Link>
                                <Link href="/pricing" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <Settings className="mr-2 h-4 w-4"/> Plans
                                </Link>
                                <button onClick={handleLogout} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <LogOut className="mr-2 h-4 w-4" /> Logout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};


const Sidebar = () => {
    const { activeTab, setActiveTab, currentClient } = useAppContext();

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Users },
        { id: 'upload', label: 'Upload ITR', icon: Upload },
    ];
    
    // Add computation tab only if a client is selected
    if (currentClient) {
        navItems.push({ id: 'computation', label: 'Computation', icon: BarChart });
    }
    
    const otherLinks = [
         { href: '/calculator', label: 'Quick Calculator', icon: Calculator },
         { href: '/contact', label: 'Contact Us', icon: FileText },
    ]

    return (
        <aside className="w-full lg:w-64 bg-background lg:min-h-screen p-4 shadow-lg lg:shadow-none border-b lg:border-r border-border">
            <nav className="h-full flex flex-col">
                <ul className="space-y-2">
                    {navItems.map(item => (
                        <li key={item.id}>
                            <button
                                onClick={() => setActiveTab(item.id as any)}
                                className={`w-full flex items-center p-3 rounded-md text-left transition-colors duration-200 ${activeTab === item.id ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground/70 hover:bg-muted'}`}
                            >
                                <item.icon className="mr-3 w-5 h-5" />
                                {item.label}
                            </button>
                        </li>
                    ))}
                </ul>
                 <div className="mt-auto pt-4 border-t border-border">
                    <ul className="space-y-2">
                         {otherLinks.map(item => (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className="w-full flex items-center p-3 rounded-md text-left transition-colors duration-200 text-foreground/70 hover:bg-muted"
                                >
                                    <item.icon className="mr-3 w-5 h-5" />
                                    {item.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </nav>
        </aside>
    );
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-body antialiased bg-background text-foreground`}>
        <AppProvider>
          <AuthProvider>
            <AppInitializer />
             <div className="flex flex-col h-screen">
                <Header />
                <div className="flex flex-1 overflow-hidden">
                    <Sidebar />
                    <main className="flex-1 p-6 overflow-y-auto">{children}</main>
                </div>
            </div>
          </AuthProvider>
        </AppProvider>
      </body>
    </html>
  );
}

