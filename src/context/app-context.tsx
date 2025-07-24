"use client";

import React, { createContext, useState, useContext, ReactNode, Dispatch, SetStateAction } from 'react';
import type { ClientData } from '@/lib/types';

type AppTab = 'dashboard' | 'upload' | 'manual' | 'computation';

interface AppContextType {
    activeTab: AppTab;
    setActiveTab: Dispatch<SetStateAction<AppTab>>;
    currentClient: ClientData | null;
    setCurrentClient: Dispatch<SetStateAction<ClientData | null>>;
    clients: ClientData[];
    setClients: Dispatch<SetStateAction<ClientData[]>>;
    loading: boolean;
    setLoading: Dispatch<SetStateAction<boolean>>;
    message: string;
    setMessage: Dispatch<SetStateAction<string>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
    const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
    const [currentClient, setCurrentClient] = useState<ClientData | null>(null);
    const [clients, setClients] = useState<ClientData[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');


    return (
        <AppContext.Provider value={{ 
            activeTab, setActiveTab, 
            currentClient, setCurrentClient,
            clients, setClients,
            loading, setLoading,
            message, setMessage
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
