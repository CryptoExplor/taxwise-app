
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { Users, Search, Plus, Edit, Trash2 } from "lucide-react";
import type { ClientData } from "@/lib/types";
import { useAppContext } from "@/context/app-context";
import { useAuth } from "./auth-provider";
import { db, appId } from "@/lib/firebase";

const ConfirmationModal = ({ isOpen, message, onConfirm, onCancel }: { isOpen: boolean, message: string, onConfirm: () => void, onCancel: () => void }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Confirm Action</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-6">{message}</p>
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

export function Dashboard() {
    const { user } = useAuth();
    const { clients, setClients, setActiveTab, setCurrentClient, loading, message, setLoading, setMessage } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [clientToDeleteId, setClientToDeleteId] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;

        setLoading(true);
        const clientsCollectionRef = collection(db, `artifacts/${appId}/users/${user.uid}/clients`);
        const unsubscribe = onSnapshot(clientsCollectionRef, (snapshot) => {
            const fetchedClients = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ClientData[];
            setClients(fetchedClients);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching clients:", error);
            setMessage(`Error loading clients: ${error.message}`);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user, setLoading, setClients, setMessage]);

    const startNewManual = () => {
        setCurrentClient({
            id: null,
            createdAt: new Date().toISOString(),
            clientName: "",
            pan: "",
            dob: "",
            address: "",
            itrFormType: "Manual",
            income: { salary: 0, interestIncome: 0, otherIncome: 0, capitalGains: 0, businessIncome: 0, speculationIncome: 0, fnoIncome: 0 },
            deductions: { section80C: 0, section80CCD1B: 0, section80CCD2: 0, section80D: 0, section80TTA: 0, section80TTB: 0, section80G: 0, section24B: 0 },
            capitalGainsTransactions: [],
            taxOldRegime: 0,
            taxNewRegime: 0,
        });
        setActiveTab('manual');
    };

    const selectClient = (client: ClientData) => {
        setCurrentClient(client);
        setActiveTab('computation');
    };

    const confirmDeleteClient = (clientId: string) => {
        setClientToDeleteId(clientId);
        setShowConfirmModal(true);
    };

    const deleteClient = async () => {
        setShowConfirmModal(false);
        if (!user || !clientToDeleteId) {
            setMessage("Not authenticated or no client selected for deletion.");
            return;
        }
        setLoading(true);
        setMessage('');
        try {
            const clientDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/clients`, clientToDeleteId);
            await deleteDoc(clientDocRef);
            setMessage("Client deleted successfully!");
        } catch (error: any) {
            setMessage(`Error deleting client: ${error.message}`);
        } finally {
            setLoading(false);
            setClientToDeleteId(null);
        }
    };
    
     const filteredClients = clients.filter(client =>
        (client.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.pan || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Users className="mr-2 text-blue-600 dark:text-blue-400" /> Your Clients
                </h2>
                <div className="flex justify-between items-center mb-4">
                    <div className="relative w-full max-w-md">
                        <input
                            type="text"
                            placeholder="Search by Name or PAN..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-5 w-5" />
                    </div>
                    <button
                        onClick={startNewManual}
                        className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center shadow-md"
                    >
                        <Plus className="mr-2 h-5 w-5" /> New Manual Entry
                    </button>
                </div>
                {loading && <p className="text-blue-500 dark:text-blue-400">Loading clients...</p>}
                {message && <p className={`text-sm ${message.includes('Error') ? 'text-red-500' : 'text-green-500'} mt-2`}>{message}</p>}
                {filteredClients.length === 0 ? (
                    <p className="text-gray-600 dark:text-gray-400 mt-4">No clients found. Start by uploading an ITR JSON or creating a new manual entry.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
                            <thead className="bg-gray-100 dark:bg-gray-700">
                                <tr className="text-left text-gray-700 dark:text-gray-300">
                                    <th className="py-3 px-4 uppercase font-semibold text-sm rounded-tl-lg">Name</th>
                                    <th className="py-3 px-4 uppercase font-semibold text-sm">PAN</th>
                                    <th className="py-3 px-4 uppercase font-semibold text-sm">Form Type</th>
                                    <th className="py-3 px-4 uppercase font-semibold text-sm">Created On</th>
                                    <th className="py-3 px-4 uppercase font-semibold text-sm rounded-tr-lg text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredClients.map((client) => (
                                    <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                                        <td className="py-3 px-4 text-gray-800 dark:text-gray-200 font-medium">{client.clientName}</td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{client.pan}</td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{client.itrFormType}</td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{new Date(client.createdAt).toLocaleDateString()}</td>
                                        <td className="py-3 px-4 text-right">
                                            <button onClick={() => selectClient(client)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-3 transition-colors duration-150" title="View/Edit">
                                                <Edit className="inline-block w-5 h-5" />
                                            </button>
                                            <button onClick={() => confirmDeleteClient(client.id!)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors duration-150" title="Delete">
                                                <Trash2 className="inline-block w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                 <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    Your User ID: <span className="font-mono bg-gray-100 dark:bg-gray-800 p-1 rounded">{user?.uid || 'N/A (Loading...)'}</span>
                </div>
            </div>
            <ConfirmationModal
                isOpen={showConfirmModal}
                message="Are you sure you want to delete this client? This action cannot be undone."
                onConfirm={deleteClient}
                onCancel={() => setShowConfirmModal(false)}
            />
        </>
    );
}
