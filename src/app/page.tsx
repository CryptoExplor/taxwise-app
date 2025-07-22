
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, deleteDoc, updateDoc, addDoc } from "firebase/firestore";
import { db, appId } from "@/lib/firebase";
import { useAuth } from "@/components/auth-provider";
import { useAppContext } from "@/context/app-context";
import { computeTax } from '@/lib/tax-calculator';
import { parseITRJson } from '@/lib/itr-parser';
import { generatePdfReport, exportClientsToCsv } from '@/lib/pdf-exporter';
import { getTaxAnalysis } from '@/ai/flows/tax-analysis-flow';
import type { ClientData } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

import { 
    UploadIcon, FileTextIcon, BarChartIcon, UsersIcon, SearchIcon, PlusIcon, Trash2Icon, EditIcon, 
    DownloadIcon, LightbulbIcon, RefreshCwIcon 
} from '@/components/icons';
import { BarChart } from '@/components/ui/bar-chart';

// --- Confirmation Modal Component ---
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

// --- App Component ---
export default function Home() {
    const { user } = useAuth();
    const { 
        clients, setClients, currentClient, setCurrentClient, activeTab, setActiveTab,
        loading, setLoading, message, setMessage 
    } = useAppContext();

    const [searchTerm, setSearchTerm] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [clientToDeleteId, setClientToDeleteId] = useState<string | null>(null);
    const [aiInsights, setAiInsights] = useState<{ summary: string, tips: string[] } | null>(null);
    const [aiLoading, setAiLoading] = useState(false);

    // What-If Analysis State
    const [whatIfIncome, setWhatIfIncome] = useState(0);
    const [whatIfDeduction, setWhatIfDeduction] = useState(0);
    const [whatIfOldTax, setWhatIfOldTax] = useState(0);
    const [whatIfNewTax, setWhatIfNewTax] = useState(0);

    // Load clients from Firestore
    useEffect(() => {
        if (user?.uid && db) {
            const clientsCollectionRef = collection(db, `artifacts/${appId}/users/${user.uid}/clients`);
            const unsubscribe = onSnapshot(clientsCollectionRef, (snapshot) => {
                const fetchedClients = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as ClientData[];
                setClients(fetchedClients);
            }, (error) => {
                console.error("Error fetching clients:", error);
                setMessage(`Error loading clients: ${error.message}`);
            });
            return () => unsubscribe();
        }
    }, [user?.uid, setClients, setMessage]);

    // Save or update a client
    const saveClient = async (clientData: ClientData) => {
        if (!user?.uid || !db) {
            setMessage("Not authenticated. Cannot save client.");
            return;
        }
        setLoading(true);
        setMessage('');
        try {
            const oldTax = computeTax(clientData.income, clientData.deductions, 'old', clientData.capitalGainsTransactions, clientData.dob);
            const newTax = computeTax(clientData.income, clientData.deductions, 'new', clientData.capitalGainsTransactions, clientData.dob);
            const { id, ...dataToSave } = { ...clientData, taxOldRegime: oldTax, taxNewRegime: newTax };

            if (id && !id.startsWith('temp-')) {
                const clientDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/clients`, id);
                await updateDoc(clientDocRef, dataToSave);
                setMessage("Client updated successfully!");
            } else {
                const clientsCollectionRef = collection(db, `artifacts/${appId}/users/${user.uid}/clients`);
                await addDoc(clientsCollectionRef, dataToSave);
                setMessage("Client added successfully!");
            }
            setCurrentClient(null);
            setActiveTab('dashboard');
        } catch (error: any) {
            console.error("Error saving client:", error);
            setMessage(`Error saving client: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Delete a client
    const confirmDeleteClient = (clientId: string) => {
        setClientToDeleteId(clientId);
        setShowConfirmModal(true);
    };

    const deleteClient = async () => {
        setShowConfirmModal(false);
        if (!user?.uid || !db || !clientToDeleteId) return;
        setLoading(true);
        setMessage('');
        try {
            const clientDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/clients`, clientToDeleteId);
            await deleteDoc(clientDocRef);
            setMessage("Client deleted successfully!");
            if (currentClient && currentClient.id === clientToDeleteId) {
                setCurrentClient(null);
                setActiveTab('dashboard');
            }
        } catch (error: any) {
            setMessage(`Error deleting client: ${error.message}`);
        } finally {
            setLoading(false);
            setClientToDeleteId(null);
        }
    };

    // Handle file upload
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setLoading(true);
        setMessage('');
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const fileContent = e.target?.result as string;
                const parsedData = parseITRJson(fileContent);
                const client: ClientData = {
                    id: `temp-${uuidv4()}`,
                    createdAt: new Date().toISOString(),
                    ...parsedData,
                };
                client.taxOldRegime = computeTax(client.income, client.deductions, 'old', client.capitalGainsTransactions, client.dob);
                client.taxNewRegime = computeTax(client.income, client.deductions, 'new', client.capitalGainsTransactions, client.dob);
                setCurrentClient(client);
                setActiveTab('computation');
                setMessage("File parsed successfully! Review and save.");
            } catch (error: any) {
                setMessage(`Error processing file: ${error.message}`);
            } finally {
                setLoading(false);
            }
        };
        reader.readAsText(file);
    };
    
    // Start a new manual entry
    const startNewManual = () => {
        setCurrentClient({
            id: `temp-${uuidv4()}`,
            createdAt: new Date().toISOString(),
            clientName: "", pan: "", dob: "", address: "", itrFormType: "Manual",
            income: { salary: 0, interestIncome: 0, otherIncome: 0, capitalGains: 0, businessIncome: 0, speculationIncome: 0, fnoIncome: 0 },
            deductions: { section80C: 0, section80CCD1B: 0, section80CCD2: 0, section80D: 0, section80TTA: 0, section80TTB: 0, section80G: 0, section24B: 0 },
            capitalGainsTransactions: [],
            taxOldRegime: 0, taxNewRegime: 0,
        });
        setActiveTab('manual');
    };

    const selectClient = (client: ClientData) => {
        setCurrentClient(client);
        setAiInsights(null); // Clear previous AI insights
        setWhatIfIncome(0); setWhatIfDeduction(0); setWhatIfOldTax(0); setWhatIfNewTax(0); // Reset what-if
        setActiveTab('computation');
    };

    // Handle manual form changes
    const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!currentClient) return;
        const { name, value } = e.target;
        const updatedClient = { ...currentClient };
        const [category, field] = name.split('.');

        if (category === 'income' || category === 'deductions') {
            (updatedClient[category] as any)[field] = parseFloat(value) || 0;
        } else {
            (updatedClient as any)[name] = value;
        }

        updatedClient.taxOldRegime = computeTax(updatedClient.income, updatedClient.deductions, 'old', updatedClient.capitalGainsTransactions, updatedClient.dob);
        updatedClient.taxNewRegime = computeTax(updatedClient.income, updatedClient.deductions, 'new', updatedClient.capitalGainsTransactions, updatedClient.dob);
        setCurrentClient(updatedClient);
    };

    const handleCGTransactionChange = (index: number, field: string, value: any) => {
        if (!currentClient) return;
        const updatedTransactions = [...currentClient.capitalGainsTransactions];
        updatedTransactions[index] = { ...updatedTransactions[index], [field]: field.includes('Date') ? value : parseFloat(value) || 0 };
        const updatedClient = { ...currentClient, capitalGainsTransactions: updatedTransactions };
        updatedClient.taxOldRegime = computeTax(updatedClient.income, updatedClient.deductions, 'old', updatedClient.capitalGainsTransactions, updatedClient.dob);
        updatedClient.taxNewRegime = computeTax(updatedClient.income, updatedClient.deductions, 'new', updatedClient.capitalGainsTransactions, updatedClient.dob);
        setCurrentClient(updatedClient);
    };

    const addCGTransaction = () => {
        if (!currentClient) return;
        const newTx = {
            id: uuidv4(), assetType: 'equity_listed' as const, purchaseDate: '', saleDate: '',
            purchasePrice: 0, salePrice: 0, expenses: 0, fmv2018: 0,
        };
        const updatedClient = { ...currentClient, capitalGainsTransactions: [...(currentClient.capitalGainsTransactions || []), newTx] };
        updatedClient.taxOldRegime = computeTax(updatedClient.income, updatedClient.deductions, 'old', updatedClient.capitalGainsTransactions, updatedClient.dob);
        updatedClient.taxNewRegime = computeTax(updatedClient.income, updatedClient.deductions, 'new', updatedClient.capitalGainsTransactions, updatedClient.dob);
        setCurrentClient(updatedClient);
    };

    const removeCGTransaction = (idToRemove: string) => {
        if (!currentClient) return;
        const updatedTransactions = currentClient.capitalGainsTransactions.filter(tx => tx.id !== idToRemove);
        const updatedClient = { ...currentClient, capitalGainsTransactions: updatedTransactions };
        updatedClient.taxOldRegime = computeTax(updatedClient.income, updatedClient.deductions, 'old', updatedClient.capitalGainsTransactions, updatedClient.dob);
        updatedClient.taxNewRegime = computeTax(updatedClient.income, updatedClient.deductions, 'new', updatedClient.capitalGainsTransactions, updatedClient.dob);
        setCurrentClient(updatedClient);
    };

    // Get AI Insights
    const getAiTaxInsightsHandler = async (clientData: ClientData) => {
        setAiLoading(true);
        setAiInsights(null);
        setMessage('');
        try {
            const insights = await getTaxAnalysis(clientData);
            setAiInsights(insights);
            setMessage("AI insights generated successfully!");
        } catch (error: any) {
            console.error("Error fetching AI insights:", error);
            setMessage(`Error generating AI insights: ${error.message}`);
        } finally {
            setAiLoading(false);
        }
    };

    // Calculate What-If Tax
    const calculateWhatIfTax = () => {
        if (!currentClient) return;
        const hypotheticalIncome = { ...currentClient.income, salary: (currentClient.income.salary || 0) + (whatIfIncome || 0) };
        const hypotheticalDeductions = { ...currentClient.deductions, section80C: (currentClient.deductions.section80C || 0) + (whatIfDeduction || 0) };
        const oldTax = computeTax(hypotheticalIncome, hypotheticalDeductions, 'old', currentClient.capitalGainsTransactions, currentClient.dob);
        const newTax = computeTax(hypotheticalIncome, hypotheticalDeductions, 'new', currentClient.capitalGainsTransactions, currentClient.dob);
        setWhatIfOldTax(oldTax);
        setWhatIfNewTax(newTax);
    };
    
    // --- Render Logic ---
    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                const filteredClients = clients.filter(client =>
                    client.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    client.pan.toLowerCase().includes(searchTerm.toLowerCase())
                );
                return (
                    <div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                            <UsersIcon className="mr-2 text-blue-600 dark:text-blue-400" /> Your Clients
                        </h2>
                        <div className="flex justify-between items-center mb-4">
                            <div className="relative w-full max-w-md">
                                <input type="text" placeholder="Search by Name or PAN..." className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                            </div>
                            <div className="flex space-x-2">
                                <button onClick={startNewManual} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center shadow-md">
                                    <PlusIcon className="mr-2" /> New Manual Entry
                                </button>
                                <button onClick={() => exportClientsToCsv(clients)} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors duration-200 flex items-center shadow-md" title="Export all client data to CSV">
                                    <DownloadIcon className="mr-2" /> Export CSV
                                </button>
                            </div>
                        </div>
                         {loading && <p className="text-blue-500 dark:text-blue-400">Loading clients...</p>}
                         {message && <p className={`text-sm ${message.includes('Error') ? 'text-red-500' : 'text-green-500'} mt-2`}>{message}</p>}
                        {filteredClients.length === 0 ? (
                            <p className="text-gray-600 dark:text-gray-400 mt-4">No clients found.</p>
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
                                                        <EditIcon className="inline-block w-5 h-5" />
                                                    </button>
                                                    <button onClick={() => confirmDeleteClient(client.id!)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors duration-150" title="Delete">
                                                        <Trash2Icon className="inline-block w-5 h-5" />
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
                );
            case 'upload':
                return (
                    <div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                            <UploadIcon className="mr-2 text-blue-600 dark:text-blue-400" /> Upload ITR JSON
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Upload your ITR JSON file downloaded from the official income tax portal.
                        </p>
                        <div className="flex items-center justify-center w-full">
                            <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a3 3 0 013 3v10a2 2 0 01-2 2H7a2 2 0 01-2-2v-2a2 2 0 012-2z"></path></svg>
                                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">JSON file (e.g., ITR-1, ITR-2, ITR-3, ITR-4, Prefill)</p>
                                </div>
                                <input id="dropzone-file" type="file" className="hidden" accept=".json" onChange={handleFileUpload} />
                            </label>
                        </div>
                        {loading && <p className="text-blue-500 dark:text-blue-400 mt-4 text-center">Processing file...</p>}
                        {message && <p className={`text-sm ${message.includes('Error') ? 'text-red-500' : 'text-green-500'} mt-2 text-center`}>{message}</p>}
                    </div>
                );
            case 'manual':
                 if (!currentClient) return <p>Loading form...</p>;
                const isNewClient = currentClient.id?.startsWith('temp-');
                return (
                     <div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                            <FileTextIcon className="mr-2 text-blue-600 dark:text-blue-400" /> {isNewClient ? 'New Manual Entry' : 'Edit Client Data'}
                        </h2>
                        <form onSubmit={(e) => { e.preventDefault(); saveClient(currentClient); }}>
                            {/* Personal Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Client Name</label>
                                    <input type="text" id="clientName" name="clientName" value={currentClient.clientName} onChange={handleManualInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" required />
                                </div>
                                <div>
                                    <label htmlFor="pan" className="block text-sm font-medium text-gray-700 dark:text-gray-300">PAN</label>
                                    <input type="text" id="pan" name="pan" value={currentClient.pan} onChange={handleManualInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" required />
                                </div>
                                <div>
                                    <label htmlFor="dob" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date of Birth</label>
                                    <input type="date" id="dob" name="dob" value={currentClient.dob} onChange={handleManualInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                                    <textarea id="address" name="address" value={currentClient.address} onChange={handleManualInputChange} rows={2} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"></textarea>
                                </div>
                            </div>

                            {/* Income */}
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Income Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                {Object.keys(currentClient.income).map(key => (
                                    <div key={key}>
                                        <label htmlFor={`income.${key}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                                        <input type="number" id={`income.${key}`} name={`income.${key}`} value={(currentClient.income as any)[key]} onChange={handleManualInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                                    </div>
                                ))}
                            </div>
                            
                            {/* Capital Gains */}
                             <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Capital Gains Transactions</h3>
                            {(currentClient.capitalGainsTransactions || []).map((tx, index) => (
                                <div key={tx.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-gray-200 dark:border-gray-700 rounded-md p-4 mb-4 relative">
                                    <button type="button" onClick={() => removeCGTransaction(tx.id)} className="absolute top-2 right-2 text-red-500 hover:text-red-700" title="Remove Transaction"><Trash2Icon className="w-5 h-5" /></button>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Asset Type</label>
                                        <select value={tx.assetType} onChange={(e) => handleCGTransactionChange(index, 'assetType', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                                            <option value="equity_listed">Listed Equity/MF (STT Paid)</option>
                                            <option value="property">Land/Building</option>
                                            <option value="unlisted_shares">Unlisted Shares</option>
                                            <option value="other">Other Assets</option>
                                        </select>
                                    </div>
                                     <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Purchase Date</label>
                                        <input type="date" value={tx.purchaseDate} onChange={(e) => handleCGTransactionChange(index, 'purchaseDate', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sale Date</label>
                                        <input type="date" value={tx.saleDate} onChange={(e) => handleCGTransactionChange(index, 'saleDate', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Purchase Price</label>
                                        <input type="number" value={tx.purchasePrice} onChange={(e) => handleCGTransactionChange(index, 'purchasePrice', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sale Price</label>
                                        <input type="number" value={tx.salePrice} onChange={(e) => handleCGTransactionChange(index, 'salePrice', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Expenses</label>
                                        <input type="number" value={tx.expenses} onChange={(e) => handleCGTransactionChange(index, 'expenses', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                                    </div>
                                     {tx.purchaseDate && new Date(tx.purchaseDate) < new Date('2018-01-31') && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">FMV as on 31/01/2018</label>
                                            <input type="number" value={tx.fmv2018} onChange={(e) => handleCGTransactionChange(index, 'fmv2018', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            <button type="button" onClick={addCGTransaction} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center shadow-md mb-6"><PlusIcon className="mr-2" />Add Transaction</button>
                           
                            {/* Deductions */}
                             <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Deductions</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                               {Object.keys(currentClient.deductions).map(key => (
                                    <div key={key}>
                                        <label htmlFor={`deductions.${key}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{key.replace(/([A-Z])/g, ' $1').replace('section', 'Section ')}</label>
                                        <input type="number" id={`deductions.${key}`} name={`deductions.${key}`} value={(currentClient.deductions as any)[key]} onChange={handleManualInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                                    </div>
                                ))}
                            </div>

                            {/* Action Buttons */}
                             <div className="flex justify-end space-x-4">
                                <button type="button" onClick={() => setActiveTab('dashboard')} className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" disabled={loading}>{loading ? 'Saving...' : 'Save Client'}</button>
                            </div>
                            {message && <p className={`text-sm ${message.includes('Error') ? 'text-red-500' : 'text-green-500'} mt-4 text-center`}>{message}</p>}
                        </form>
                    </div>
                );
            case 'computation':
                if (!currentClient) return <p>Loading computation...</p>;
                const taxData = [
                    { name: 'Old Regime', value: currentClient.taxOldRegime || 0 },
                    { name: 'New Regime', value: currentClient.taxNewRegime || 0 },
                ];
                const regimeComparisonMessage = (currentClient.taxOldRegime || 0) < (currentClient.taxNewRegime || 0)
                    ? `The Old Tax Regime seems more beneficial, saving ₹${((currentClient.taxNewRegime || 0) - (currentClient.taxOldRegime || 0)).toLocaleString('en-IN')}.`
                    : `The New Tax Regime seems more beneficial, saving ₹${((currentClient.taxOldRegime || 0) - (currentClient.taxNewRegime || 0)).toLocaleString('en-IN')}.`;
                const totalCapitalGainsTax = computeTax(currentClient.income, currentClient.deductions, 'old', currentClient.capitalGainsTransactions, currentClient.dob) - computeTax(currentClient.income, currentClient.deductions, 'old', [], currentClient.dob)
                return (
                     <div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                            <BarChartIcon className="mr-2 text-blue-600 dark:text-blue-400" /> Tax Computation for {currentClient.clientName}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">PAN: {currentClient.pan} | ITR Form Type: {currentClient.itrFormType}</p>
                        
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-inner">
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Income Summary</h3>
                                <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                                   {Object.entries(currentClient.income).map(([key, value]) => (
                                       <li key={key} className="flex justify-between"><span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span><span className="font-medium">₹{Number(value).toLocaleString('en-IN')}</span></li>
                                   ))}
                                    <li className="flex justify-between font-bold text-lg border-t pt-2 mt-2"><span>Total Income</span><span>₹{Object.values(currentClient.income).reduce((a, b) => a + b, 0).toLocaleString('en-IN')}</span></li>
                                </ul>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-inner">
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Deductions Summary</h3>
                                <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                                   {Object.entries(currentClient.deductions).map(([key, value]) => (
                                       <li key={key} className="flex justify-between"><span className="capitalize">{key.replace(/([A-Z])/g, ' $1').replace('section', 'Section ')}</span><span className="font-medium">₹{Number(value).toLocaleString('en-IN')}</span></li>
                                   ))}
                                     <li className="flex justify-between font-bold text-lg border-t pt-2 mt-2"><span>Total Deductions</span><span>₹{Object.values(currentClient.deductions).reduce((a, b) => a + b, 0).toLocaleString('en-IN')}</span></li>
                                </ul>
                            </div>
                        </div>

                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Tax Regime Comparison</h3>
                        <div className="flex flex-col md:flex-row items-center justify-around bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-inner mb-6">
                            <div className="flex flex-col items-center p-4">
                                <span className="text-lg font-medium text-gray-700 dark:text-gray-300">Tax (Old Regime)</span>
                                <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">₹{(currentClient.taxOldRegime || 0).toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex flex-col items-center p-4">
                                <span className="text-lg font-medium text-gray-700 dark:text-gray-300">Tax (New Regime)</span>
                                <span className="text-3xl font-bold text-green-600 dark:text-green-400">₹{(currentClient.taxNewRegime || 0).toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                        <p className="text-center text-lg font-semibold text-gray-800 dark:text-gray-200 mb-6">{regimeComparisonMessage}</p>
                        <div className="mb-6"><BarChart data={taxData} /></div>

                        {/* What-If Analysis */}
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center"><RefreshCwIcon className="mr-2 text-teal-600" />What-If Analysis</h3>
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-inner mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label htmlFor="whatIfIncome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Change in Salary Income (₹)</label>
                                    <input type="number" id="whatIfIncome" value={whatIfIncome} onChange={(e) => setWhatIfIncome(parseFloat(e.target.value) || 0)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                                </div>
                                <div>
                                    <label htmlFor="whatIfDeduction" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Change in 80C Deduction (₹)</label>
                                    <input type="number" id="whatIfDeduction" value={whatIfDeduction} onChange={(e) => setWhatIfDeduction(parseFloat(e.target.value) || 0)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                                </div>
                            </div>
                            <button onClick={calculateWhatIfTax} className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700">Calculate What-If</button>
                            {(whatIfOldTax > 0 || whatIfNewTax > 0) && <div className="mt-4 p-3 bg-white dark:bg-gray-700 rounded-md"><h4>Hypothetical Tax:</h4><p>Old Regime: ₹{whatIfOldTax.toLocaleString('en-IN')}</p><p>New Regime: ₹{whatIfNewTax.toLocaleString('en-IN')}</p></div>}
                        </div>
                        
                        {/* AI Insights */}
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center"><LightbulbIcon className="mr-2 text-yellow-500" />AI-Powered Tax Insights</h3>
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-inner mb-6">
                            <button onClick={() => getAiTaxInsightsHandler(currentClient)} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700" disabled={aiLoading}>{aiLoading ? 'Generating...' : 'Get AI Insights'}</button>
                            {aiLoading && <p>Loading insights...</p>}
                            {aiInsights && <div className="mt-4 p-3 bg-white dark:bg-gray-700 rounded-md whitespace-pre-wrap"><h4>Summary:</h4><p>{aiInsights.summary}</p><h4>Tips:</h4><ul>{aiInsights.tips.map((tip, i) => <li key={i}>- {tip}</li>)}</ul></div>}
                        </div>

                        <div className="flex justify-end space-x-4">
                            <button onClick={() => generatePdfReport(currentClient)} className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"><DownloadIcon className="mr-2"/>Export PDF</button>
                            <button onClick={() => setActiveTab('manual')} className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"><EditIcon className="mr-2" />Edit Data</button>
                            <button onClick={() => saveClient(currentClient)} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
                        </div>
                        {message && <p className={`text-sm ${message.includes('Error') ? 'text-red-500' : 'text-green-500'} mt-4 text-center`}>{message}</p>}
                    </div>
                );
            default:
                return <p>Loading...</p>;
        }
    };

    return (
        <>
            <ConfirmationModal isOpen={showConfirmModal} message="Are you sure you want to delete this client? This action cannot be undone." onConfirm={deleteClient} onCancel={() => setShowConfirmModal(false)} />
            {renderContent()}
        </>
    );
}

