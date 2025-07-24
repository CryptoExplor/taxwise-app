"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { ClientData, CapitalGainsTransaction, TaxAnalysisInput, TaxAnalysisOutput } from '@/lib/types';
import { computeTax, calculateCapitalGainsTax } from '@/lib/tax-calculator';
import { parseITRJson } from '@/lib/itr-parser';
import { generatePdfReport } from '@/lib/pdf-exporter';
import { exportClientsToCsv } from '@/lib/csv-exporter';
import { getTaxAnalysis } from '@/ai/flows/tax-analysis-flow';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/components/auth-provider';
import { useAppContext } from '@/context/app-context';


import { Upload, FileText, BarChart as BarChartIconLucide, Users, Search, Plus, Trash2, Edit, Download, Lightbulb, RefreshCw, Loader2 } from 'lucide-react';
import { BarChart } from '@/components/ui/bar-chart';

const UploadIcon = Upload;
const FileTextIcon = FileText;
const BarChartIcon = BarChartIconLucide;
const UsersIcon = Users;
const SearchIcon = Search;
const PlusIcon = Plus;
const Trash2Icon = Trash2;
const EditIcon = Edit;
const DownloadIcon = Download;
const LightbulbIcon = Lightbulb;
const RefreshCwIcon = RefreshCw;


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

// Component for Dashboard (Client List)
const Dashboard = () => {
    const { user } = useAuth();
    const { clients, setClients, loading, setLoading, message, setMessage, setActiveTab, setCurrentClient } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [clientToDeleteId, setClientToDeleteId] = useState<string | null>(null);

    // Load clients from Firestore
    useEffect(() => {
        if (user?.uid && db) {
            setLoading(true);
            const clientsCollectionRef = collection(db, `users/${user.uid}/clients`);
            const unsubscribe = onSnapshot(clientsCollectionRef, (snapshot) => {
                const fetchedClients = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as ClientData));
                setClients(fetchedClients);
                setLoading(false);
            }, (error) => {
                console.error("Error fetching clients:", error);
                setMessage(`Error loading clients: ${error.message}`);
                setLoading(false);
            });
            return () => unsubscribe();
        }
    }, [user, setClients, setLoading, setMessage]);

    // Start a new manual computation
    const startNewManual = () => {
        const newClient: Partial<ClientData> = {
            id: `temp-${uuidv4()}`,
            createdAt: new Date().toISOString(),
            uploadedBy: user?.email || 'anonymous',
            clientName: "",
            pan: "",
            assessmentYear: "2025-26",
            filingStatus: "Manual Entry",
            taxRegime: "New Regime",
            notes: "",
            personalInfo: { name: "", pan: "", dob: "", address: "", },
            incomeDetails: { salary: 0, interestIncome: 0, otherIncome: 0, businessIncome: 0, speculationIncome: 0, fnoIncome: 0, houseProperty: 0, capitalGains: { shortTerm: 0, longTerm: 0 }, otherSources: 0, grossTotalIncome: 0 },
            deductions: { section80C: 0, section80D: 0, section80G: 0, totalDeductions: 0 },
            capitalGainsTransactions: [],
            taxOldRegime: 0,
            taxNewRegime: 0,
        };
        const { taxOldRegime, taxNewRegime } = computeTax(newClient as ClientData);
        setCurrentClient({ ...newClient, taxOldRegime, taxNewRegime } as ClientData);
        setActiveTab('manual');
    };

     // Trigger confirmation modal for deletion
    const confirmDeleteClient = (clientId: string) => {
        setClientToDeleteId(clientId);
        setShowConfirmModal(true);
    };

    // Delete a client from Firestore after confirmation
    const deleteClient = async () => {
        setShowConfirmModal(false);
        if (!user?.uid || !clientToDeleteId) {
            setMessage("Not authenticated or no client selected for deletion.");
            return;
        }
        setLoading(true);
        setMessage('');
        try {
            const clientDocRef = doc(db, `users/${user.uid}/clients`, clientToDeleteId);
            await deleteDoc(clientDocRef);
            setMessage("Client deleted successfully!");
            if (clientToDeleteId) {
                setCurrentClient(null);
            }
        } catch (error) {
            console.error("Error deleting client:", error);
            setMessage(`Error deleting client: ${(error as Error).message}`);
        } finally {
            setLoading(false);
            setClientToDeleteId(null);
        }
    };

    const selectClient = (client: ClientData) => {
        setCurrentClient(client);
        setActiveTab('computation');
    };

    const filteredClients = clients.filter(client =>
        client.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.pan && client.pan.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <UsersIcon className="mr-2 text-primary" /> Your Clients
            </h2>
             <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
                    <input
                        type="text"
                        placeholder="Search by Name or PAN..."
                        className="w-full pl-10 pr-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={startNewManual}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors duration-200 flex items-center shadow-md"
                    >
                        <PlusIcon className="mr-2" /> New Manual Entry
                    </button>
                    <button
                        onClick={() => exportClientsToCsv(clients)}
                        className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors duration-200 flex items-center shadow-md"
                        title="Export all client data to CSV"
                        disabled={clients.length === 0}
                    >
                        <DownloadIcon className="mr-2" /> Export CSV
                    </button>
                </div>
            </div>

            {loading && <p className="text-primary mt-4">Loading clients...</p>}
            {message && <p className={`text-sm ${message.includes('Error') ? 'text-destructive' : 'text-green-500'} mt-2`}>{message}</p>}

            <div className="overflow-x-auto mt-4">
                <table className="min-w-full bg-background rounded-lg">
                    <thead className="bg-muted">
                        <tr className="text-left text-muted-foreground">
                            <th className="py-3 px-4 uppercase font-semibold text-sm">Name</th>
                            <th className="py-3 px-4 uppercase font-semibold text-sm">PAN</th>
                            <th className="py-3 px-4 uppercase font-semibold text-sm">Form Type</th>
                            <th className="py-3 px-4 uppercase font-semibold text-sm">Created On</th>
                            <th className="py-3 px-4 uppercase font-semibold text-sm text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredClients.length > 0 ? filteredClients.map((client) => (
                            <tr key={client.id} className="hover:bg-muted/50 transition-colors duration-150">
                                <td className="py-3 px-4 font-medium">{client.clientName}</td>
                                <td className="py-3 px-4">{client.pan}</td>
                                <td className="py-3 px-4">{client.itrFormType}</td>
                                <td className="py-3 px-4">{new Date(client.createdAt).toLocaleDateString()}</td>
                                <td className="py-3 px-4 text-right">
                                    <button
                                        onClick={() => selectClient(client)}
                                        className="text-primary hover:text-primary/80 mr-3 transition-colors duration-150"
                                        title="View/Edit"
                                    >
                                        <EditIcon className="inline-block w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => confirmDeleteClient(client.id!)}
                                        className="text-destructive hover:text-destructive/80 transition-colors duration-150"
                                        title="Delete"
                                    >
                                        <Trash2Icon className="inline-block w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        )) : (
                             <tr>
                                <td colSpan={5} className="text-center py-10 text-muted-foreground">
                                    No clients found. Start by uploading an ITR JSON or creating a new manual entry.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            { user && <div className="mt-4 text-xs text-muted-foreground">
                User ID: <span className="font-mono bg-muted p-1 rounded">{user.uid}</span>
            </div>}
            <ConfirmationModal
                isOpen={showConfirmModal}
                message="Are you sure you want to delete this client? This action cannot be undone."
                onConfirm={deleteClient}
                onCancel={() => setShowConfirmModal(false)}
            />
        </div>
    );
};

// Component for ITR JSON Upload
const ITRUpload = () => {
    const { user } = useAuth();
    const { loading, setLoading, message, setMessage, setActiveTab, setCurrentClient } = useAppContext();

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setMessage('');
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const fileContent = e.target?.result as string;
                const parsedData = parseITRJson(fileContent, user?.email || 'anonymous');
                
                const { taxOldRegime, taxNewRegime } = computeTax(parsedData as ClientData);
                
                const client: ClientData = {
                    ...parsedData,
                    id: `temp-${uuidv4()}`,
                    taxOldRegime,
                    taxNewRegime
                };
                
                setCurrentClient(client);
                setActiveTab('computation');
                setMessage("File parsed successfully! Review and save.");
            } catch (error) {
                console.error("File processing error:", error);
                setMessage(`Error processing file: ${(error as Error).message}`);
            } finally {
                setLoading(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="p-6 bg-card rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-card-foreground mb-4 flex items-center">
                <UploadIcon className="mr-2 text-primary" /> Upload ITR JSON
            </h2>
            <p className="text-muted-foreground mb-4">
                Upload your ITR JSON file downloaded from the official income tax portal.
            </p>
            <div className="flex items-center justify-center w-full">
                <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-48 border-2 border-border border-dashed rounded-lg cursor-pointer bg-background hover:bg-muted">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadIcon className="w-10 h-10 mb-3 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold text-primary">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-muted-foreground">JSON file (e.g., ITR-1, ITR-2, ITR-3, ITR-4, Prefill)</p>
                    </div>
                    <input id="dropzone-file" type="file" className="hidden" accept=".json" onChange={handleFileUpload} disabled={loading}/>
                </label>
            </div>
            {loading && <p className="text-primary mt-4 text-center">Processing file...</p>}
            {message && <p className={`text-sm ${message.includes('Error') ? 'text-destructive' : 'text-green-500'} mt-2 text-center`}>{message}</p>}
        </div>
    );
};

// Component for Manual Tax Computation
const ClientForm = () => {
    const { user } = useAuth();
    const { loading, setLoading, message, setMessage, activeTab, setActiveTab, currentClient, setCurrentClient } = useAppContext();
    const isNewClient = !currentClient?.id || currentClient.id.startsWith('temp-');

     // Save or update a client in Firestore
    const saveClient = async (clientData: Partial<ClientData>) => {
        if (!user?.uid) {
            setMessage("Not authenticated. Cannot save client.");
            return;
        }
        setLoading(true);
        setMessage('');
        try {
            const { taxOldRegime, taxNewRegime } = computeTax(clientData as ClientData);
            
            const dataToSave: Partial<ClientData> = { ...clientData, taxOldRegime, taxNewRegime };
            
            const docId = dataToSave.id;
            delete dataToSave.id;

            if (docId && !docId.startsWith('temp-')) {
                const clientDocRef = doc(db, `users/${user.uid}/clients`, docId);
                await updateDoc(clientDocRef, dataToSave);
                setMessage("Client updated successfully!");
            } else {
                const clientsCollectionRef = collection(db, `users/${user.uid}/clients`);
                const newDocRef = await addDoc(clientsCollectionRef, dataToSave);
                 dataToSave.id = newDocRef.id;
            }
            setCurrentClient(dataToSave as ClientData);
            setActiveTab('computation');
        } catch (error) {
            console.error("Error saving client:", error);
            setMessage(`Error saving client: ${(error as Error).message}`);
        } finally {
            setLoading(false);
        }
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (currentClient) {
            saveClient(currentClient);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setCurrentClient(prev => {
            if (!prev) return null;
            let updatedClient: Partial<ClientData> = { ...prev };
            const [category, field] = name.split('.');

            if (category === 'personalInfo' || category === 'incomeDetails' || category === 'deductions') {
                const numericFields = ['salary', 'interestIncome', 'otherIncome', 'businessIncome', 'speculationIncome', 'fnoIncome', 'section80C', 'section80D', 'section80G'];
                const isNumeric = numericFields.includes(field);

                updatedClient = {
                    ...prev,
                    [category]: {
                        ...(prev as any)[category],
                        [field]: isNumeric ? parseFloat(value) || 0 : value,
                    },
                };
            } else {
                updatedClient = { ...prev, [name]: value };
            }
            
            if (name === 'personalInfo.name') updatedClient.clientName = value;
            if (name === 'personalInfo.pan') updatedClient.pan = value;

            const { taxOldRegime, taxNewRegime } = computeTax(updatedClient as ClientData);

            return {
                ...updatedClient,
                taxOldRegime,
                taxNewRegime
            } as ClientData;
        });
    };

    const handleCGTransactionChange = (index: number, field: string, value: string) => {
        setCurrentClient(prev => {
            if (!prev || !prev.capitalGainsTransactions) return null;
            const updatedTransactions = [...prev.capitalGainsTransactions];
            updatedTransactions[index] = {
                ...updatedTransactions[index],
                [field]: field.includes('Date') ? value : parseFloat(value) || 0,
            };

            const updatedClient = { ...prev, capitalGainsTransactions: updatedTransactions };
            const { taxOldRegime, taxNewRegime } = computeTax(updatedClient as ClientData);
            return { ...updatedClient, taxOldRegime, taxNewRegime } as ClientData;
        });
    };

    const addCGTransaction = () => {
        setCurrentClient(prev => {
            if (!prev) return null;
            const updatedClient = {
                ...prev,
                capitalGainsTransactions: [
                    ...(prev.capitalGainsTransactions || []),
                    { id: uuidv4(), assetType: 'equity_listed', purchaseDate: '', saleDate: '', purchasePrice: 0, salePrice: 0, expenses: 0, fmv2018: 0, }
                ]
            };
            const { taxOldRegime, taxNewRegime } = computeTax(updatedClient as ClientData);
            return { ...updatedClient, taxOldRegime, taxNewRegime } as ClientData;
        });
    };

    const removeCGTransaction = (idToRemove: string) => {
        setCurrentClient(prev => {
            if (!prev || !prev.capitalGainsTransactions) return null;
            const updatedTransactions = prev.capitalGainsTransactions.filter(tx => tx.id !== idToRemove);
            const updatedClient = { ...prev, capitalGainsTransactions: updatedTransactions };

            const { taxOldRegime, taxNewRegime } = computeTax(updatedClient as ClientData);
            return { ...updatedClient, taxOldRegime, taxNewRegime } as ClientData;
        });
    };

    if (!currentClient) return null;

    return (
            <div className="p-6 bg-card rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold text-card-foreground mb-4 flex items-center">
                    <FileTextIcon className="mr-2 text-primary" /> {isNewClient ? 'New Manual Entry' : 'Edit Client Data'}
                </h2>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label htmlFor="clientName" className="block text-sm font-medium text-muted-foreground">Client Name</label>
                            <input type="text" id="clientName" name="personalInfo.name" value={currentClient.personalInfo?.name || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary bg-background" required />
                        </div>
                        <div>
                            <label htmlFor="pan" className="block text-sm font-medium text-muted-foreground">PAN</label>
                            <input type="text" id="pan" name="personalInfo.pan" value={currentClient.personalInfo?.pan || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary bg-background" required />
                        </div>
                        <div>
                            <label htmlFor="dob" className="block text-sm font-medium text-muted-foreground">Date of Birth</label>
                            <input type="date" id="dob" name="personalInfo.dob" value={currentClient.personalInfo?.dob || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary bg-background" />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="address" className="block text-sm font-medium text-muted-foreground">Address</label>
                            <textarea id="address" name="personalInfo.address" value={currentClient.personalInfo?.address || ''} onChange={handleInputChange} rows={2} className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary bg-background"></textarea>
                        </div>
                    </div>

                    <h3 className="text-xl font-semibold text-card-foreground mb-4">Income Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {currentClient.incomeDetails && Object.keys(currentClient.incomeDetails).filter(k => k !== 'capitalGains' && k !== 'otherSources' && k !== 'grossTotalIncome').map(key => (
                           <div key={key}>
                               <label htmlFor={`incomeDetails.${key}`} className="block text-sm font-medium text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                               <input type="number" id={`incomeDetails.${key}`} name={`incomeDetails.${key}`} value={(currentClient.incomeDetails as any)[key]} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary bg-background" />
                           </div>
                        ))}
                    </div>

                    <h3 className="text-xl font-semibold text-card-foreground mb-4">Capital Gains Transactions</h3>
                    {(currentClient.capitalGainsTransactions || []).map((tx, index) => (
                        <div key={tx.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-border rounded-md p-4 mb-4 relative">
                            <button type="button" onClick={() => removeCGTransaction(tx.id)} className="absolute top-2 right-2 text-destructive/70 hover:text-destructive" title="Remove Transaction"><Trash2Icon className="w-5 h-5" /></button>
                             <div>
                                <label className="block text-sm font-medium text-muted-foreground">Asset Type</label>
                                <select value={tx.assetType} onChange={(e) => handleCGTransactionChange(index, 'assetType', e.target.value)} className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary bg-background" ><option value="equity_listed">Listed Equity/MF (STT Paid)</option><option value="property">Land/Building</option><option value="unlisted_shares">Unlisted Shares</option><option value="other">Other Assets</option></select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground">Purchase Date</label>
                                <input type="date" value={tx.purchaseDate} onChange={(e) => handleCGTransactionChange(index, 'purchaseDate', e.target.value)} className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary bg-background" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground">Sale Date</label>
                                <input type="date" value={tx.saleDate} onChange={(e) => handleCGTransactionChange(index, 'saleDate', e.target.value)} className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary bg-background" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground">Purchase Price</label>
                                <input type="number" value={tx.purchasePrice} onChange={(e) => handleCGTransactionChange(index, 'purchasePrice', e.target.value)} className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary bg-background" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground">Sale Price</label>
                                <input type="number" value={tx.salePrice} onChange={(e) => handleCGTransactionChange(index, 'salePrice', e.target.value)} className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary bg-background" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-muted-foreground">Expenses</label>
                                <input type="number" value={tx.expenses} onChange={(e) => handleCGTransactionChange(index, 'expenses', e.target.value)} className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary bg-background" />
                            </div>
                            {tx.purchaseDate && new Date(tx.purchaseDate) < new Date('2018-01-31') && (
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground">FMV on 31/01/2018</label>
                                    <input type="number" value={tx.fmv2018} onChange={(e) => handleCGTransactionChange(index, 'fmv2018', e.target.value)} className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary bg-background" />
                                </div>
                            )}
                        </div>
                    ))}
                    <button type="button" onClick={addCGTransaction} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 flex items-center shadow-sm mb-6"><PlusIcon className="mr-2" /> Add Transaction</button>


                    <h3 className="text-xl font-semibold text-card-foreground mb-4">Deductions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                       {currentClient.deductions && Object.keys(currentClient.deductions).filter(k => k !== 'totalDeductions').map(key => (
                           <div key={key}>
                               <label htmlFor={`deductions.${key}`} className="block text-sm font-medium text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').replace('section', 'Section ')}</label>
                               <input type="number" id={`deductions.${key}`} name={`deductions.${key}`} value={(currentClient.deductions as any)[key]} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary bg-background" />
                           </div>
                       ))}
                    </div>

                    <div className="flex justify-end space-x-4">
                        <button type="button" onClick={() => { setCurrentClient(null); setActiveTab('dashboard'); }} className="px-6 py-2 border border-border rounded-md text-foreground hover:bg-muted shadow-sm">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 shadow-md flex items-center justify-center" disabled={loading}>{loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Save Client'}</button>
                    </div>
                    {message && <p className={`text-sm ${message.includes('Error') ? 'text-destructive' : 'text-green-500'} mt-4 text-center`}>{message}</p>}
                </form>
            </div>
        );
};

// Component for Computation Dashboard
const ComputationDashboard = () => {
    const { user } = useAuth();
    const { loading, setLoading, message, setMessage, activeTab, setActiveTab, currentClient, setCurrentClient } = useAppContext();
    
    const [aiInsights, setAiInsights] = useState<TaxAnalysisOutput | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [whatIfIncome, setWhatIfIncome] = useState(0);
    const [whatIfDeduction, setWhatIfDeduction] = useState(0);
    const [whatIfOldTax, setWhatIfOldTax] = useState(0);
    const [whatIfNewTax, setWhatIfNewTax] = useState(0);

    const onSave = async (clientData: Partial<ClientData>) => {
        if (!user?.uid) return;
        setLoading(true);
        setMessage('');
        try {
            const dataToSave = { ...clientData };
            delete dataToSave.id;
            const clientDocRef = doc(db, `users/${user.uid}/clients`, clientData.id!);
            await updateDoc(clientDocRef, dataToSave);
            setMessage("Changes saved successfully!");
        } catch (error) {
            setMessage(`Error saving: ${(error as Error).message}`);
        } finally {
            setLoading(false);
        }
    };

    const getAiTaxInsightsHandler = async (clientData: ClientData) => {
        setAiLoading(true);
        setAiInsights(null);
        setMessage('');
        try {
            const analysisInput: TaxAnalysisInput = {
                clientName: clientData.clientName,
                pan: clientData.pan,
                dob: clientData.personalInfo.dob,
                income: clientData.incomeDetails,
                deductions: clientData.deductions,
                capitalGainsTransactions: clientData.capitalGainsTransactions || [],
                taxOldRegime: clientData.taxOldRegime,
                taxNewRegime: clientData.taxNewRegime,
            };

            const insights = await getTaxAnalysis(analysisInput);
            setAiInsights(insights);
        } catch (error: any) {
            console.error("Error fetching AI insights:", error);
            setMessage(`Error generating AI insights: ${error.message}`);
        } finally {
            setAiLoading(false);
        }
    };

    const calculateWhatIfTax = () => {
        if (!currentClient || !currentClient.incomeDetails || !currentClient.deductions) return;

        const hypotheticalClient = JSON.parse(JSON.stringify(currentClient)); // Deep copy
        hypotheticalClient.incomeDetails.salary = (currentClient.incomeDetails.salary || 0) + (whatIfIncome || 0);
        hypotheticalClient.deductions.section80C = (currentClient.deductions.section80C || 0) + (whatIfDeduction || 0);

        const { taxOldRegime, taxNewRegime } = computeTax(hypotheticalClient as ClientData);
        setWhatIfOldTax(taxOldRegime);
        setWhatIfNewTax(taxNewRegime);
    };

    if (!currentClient) {
        return (
            <div className="p-6 bg-card rounded-lg shadow-md text-center text-muted-foreground">
                No client selected. Please select a client from the dashboard or upload/create a new one.
            </div>
        );
    }

    const { taxOldRegime = 0, taxNewRegime = 0, incomeDetails, deductions } = currentClient;
    const taxData = [{ name: 'Old Regime', value: taxOldRegime }, { name: 'New Regime', value: taxNewRegime }];
    const regimeComparisonMessage = taxOldRegime < taxNewRegime
        ? `The Old Tax Regime seems more beneficial, saving ₹${(taxNewRegime - taxOldRegime).toLocaleString('en-IN')}.`
        : `The New Tax Regime seems more beneficial, saving ₹${(taxOldRegime - taxNewRegime).toLocaleString('en-IN')}.`;
    
    const totalIncome = incomeDetails ? Object.values(incomeDetails).reduce((a, b) => typeof b === 'number' ? a + b : a, 0) : 0;
    const totalDeductions = deductions ? Object.values(deductions).reduce((a, b) => a + b, 0) : 0;
    const totalCapitalGainsTax = currentClient.capitalGainsTransactions ? calculateCapitalGainsTax(currentClient.capitalGainsTransactions) : { taxOnSpecialRates: 0, stcgAtSlabRates: 0 };


    return (
            <div className="p-6 bg-card rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold text-card-foreground mb-1 flex items-center">
                    <BarChartIcon className="mr-2 text-primary" /> Tax Computation
                </h2>
                <p className="text-muted-foreground mb-6">
                   {currentClient.clientName} | {currentClient.pan} | AY {currentClient.assessmentYear}
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="bg-muted/50 p-4 rounded-lg"><h3 className="text-xl font-semibold mb-3">Income Summary</h3><ul className="space-y-2">{incomeDetails && Object.entries(incomeDetails).filter(([k,v]) => k !== 'capitalGains' && v > 0).map(([key, value]) => (<li key={key} className="flex justify-between"><span>{key.replace(/([A-Z])/g, ' $1').trim()}</span><span className="font-medium">₹{Number(value).toLocaleString('en-IN')}</span></li>))}<li className="flex justify-between font-bold text-lg border-t pt-2 mt-2"><span>Tax on Capital Gains:</span><span>₹{totalCapitalGainsTax.taxOnSpecialRates.toLocaleString('en-IN')}</span></li></ul></div>
                    <div className="bg-muted/50 p-4 rounded-lg"><h3 className="text-xl font-semibold mb-3">Deductions Summary</h3><ul className="space-y-2">{deductions && Object.entries(deductions).filter(([k,v]) => v > 0).map(([key, value]) => (<li key={key} className="flex justify-between"><span>{key.replace(/([A-Z])/g, ' $1').replace('section', 'Section ')}:</span><span className="font-medium">₹{Number(value).toLocaleString('en-IN')}</span></li>))}<li className="flex justify-between font-bold text-lg border-t pt-2 mt-2"><span>Total Deductions:</span><span>₹{totalDeductions.toLocaleString('en-IN')}</span></li></ul></div>
                </div>

                <h3 className="text-xl font-semibold mb-4">Tax Regime Comparison</h3>
                <div className="flex flex-col md:flex-row items-center justify-around bg-muted/50 p-4 rounded-lg mb-6">
                    <div className="text-center p-4"><span className="text-lg font-medium">Tax (Old Regime)</span><span className="block text-3xl font-bold text-primary">₹{taxOldRegime.toLocaleString('en-IN')}</span></div>
                    <div className="text-center p-4 mt-4 md:mt-0"><span className="text-lg font-medium">Tax (New Regime)</span><span className="block text-3xl font-bold text-green-600">₹{taxNewRegime.toLocaleString('en-IN')}</span></div>
                </div>

                <p className="text-center text-lg font-semibold mb-6">{regimeComparisonMessage}</p>

                <div className="mb-6"><BarChart data={taxData} /></div>

                <h3 className="text-xl font-semibold mb-4 flex items-center"><RefreshCwIcon className="mr-2 text-teal-500" /> What-If Analysis</h3>
                <div className="bg-muted/50 p-4 rounded-lg mb-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"><div><label htmlFor="whatIfIncome" className="block text-sm font-medium">Change in Salary Income (₹)</label><input type="number" id="whatIfIncome" value={whatIfIncome} onChange={(e) => setWhatIfIncome(parseFloat(e.target.value) || 0)} className="mt-1 block w-full rounded-md border-border bg-background" /></div><div><label htmlFor="whatIfDeduction" className="block text-sm font-medium">Change in 80C Deduction (₹)</label><input type="number" id="whatIfDeduction" value={whatIfDeduction} onChange={(e) => setWhatIfDeduction(parseFloat(e.target.value) || 0)} className="mt-1 block w-full rounded-md border-border bg-background" /></div></div><button onClick={calculateWhatIfTax} className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700">Calculate What-If Tax</button>{(whatIfOldTax > 0 || whatIfNewTax > 0) && (<div className="mt-4 p-3 bg-background rounded-md border"><h4 className="font-semibold mb-2">Hypothetical Tax:</h4><p>Old Regime: <span className="font-medium">₹{whatIfOldTax.toLocaleString('en-IN')}</span></p><p>New Regime: <span className="font-medium">₹{whatIfNewTax.toLocaleString('en-IN')}</span></p></div>)}</div>

                <h3 className="text-xl font-semibold mb-4 flex items-center"><LightbulbIcon className="mr-2 text-amber-500" /> AI-Powered Tax Insights</h3>
                <div className="bg-muted/50 p-4 rounded-lg mb-6"><button onClick={() => getAiTaxInsightsHandler(currentClient as ClientData)} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center justify-center mb-4" disabled={aiLoading}>{aiLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <><LightbulbIcon className="mr-2" /> Get AI Insights</>}</button>{aiInsights && (<div className="p-3 bg-background rounded-md border whitespace-pre-wrap"><h4>Summary:</h4><p>{aiInsights.summary}</p><h4>Tips:</h4><ul>{aiInsights.tips.map((tip, i) => <li key={i}>- {tip}</li>)}</ul></div>)}{aiLoading && <p className="text-primary mt-2">Generating insights...</p>}</div>


                <div className="flex justify-end space-x-4">
                    <button onClick={() => generatePdfReport(currentClient as ClientData)} className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"><DownloadIcon className="mr-2" /> Export PDF</button>
                    <button onClick={() => setActiveTab('manual')} className="px-6 py-2 border border-border rounded-md hover:bg-muted flex items-center"><EditIcon className="mr-2" /> Edit Data</button>
                    <button onClick={() => onSave(currentClient)} className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center justify-center" disabled={loading || currentClient.id?.startsWith('temp-')}>{loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Save Changes'}</button>
                </div>
                {message && <p className={`text-sm ${message.includes('Error') ? 'text-destructive' : 'text-green-500'} mt-4 text-center`}>{message}</p>}
            </div>
        );
};


// --- Main App Component ---
export default function Home() {
    const { activeTab } = useAppContext();

    return (
        <div className="min-h-screen text-foreground">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'upload' && <ITRUpload />}
            {activeTab === 'manual' && <ClientForm />}
            {activeTab === 'computation' && <ComputationDashboard />}
        </div>
    );
};
