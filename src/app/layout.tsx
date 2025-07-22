
"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider, useAppContext } from "@/context/app-context";
import { AuthProvider } from "@/components/auth-provider";
import { BarChart, Users, Upload } from "lucide-react";


const inter = Inter({ subsets: ["latin"], variable: "--font-body" });

const Sidebar = () => {
    const { activeTab, setActiveTab, currentClient } = useAppContext();

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Users },
        { id: 'upload', label: 'Upload ITR', icon: Upload },
    ];

    if (currentClient) {
        navItems.push({ id: 'computation', label: 'Computation', icon: BarChart });
    }

    return (
        <aside className="w-full lg:w-64 bg-white dark:bg-gray-900 lg:min-h-screen p-4 shadow-lg lg:shadow-md border-b lg:border-r border-gray-200 dark:border-gray-800">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-6 text-center">TaxWise</div>
            <nav>
                <ul className="space-y-2">
                    {navItems.map(item => (
                        <li key={item.id}>
                            <button
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center p-3 rounded-md text-left transition-colors duration-200 ${activeTab === item.id ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-semibold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            >
                                <item.icon className="mr-3 w-5 h-5" />
                                {item.label}
                            </button>
                        </li>
                    ))}
                </ul>
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
      <body className={`${inter.variable} font-body antialiased bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-200`}>
        <AppProvider>
          <AuthProvider>
            <div className="flex flex-col lg:flex-row">
                <Sidebar />
                <main className="flex-1 p-6">{children}</main>
            </div>
          </AuthProvider>
        </AppProvider>
      </body>
    </html>
  );
}
