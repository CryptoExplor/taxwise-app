
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken, User } from 'firebase/auth';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { app, db, auth as firebaseAuth, appId } from '@/lib/firebase';
import type { Client } from '@/types';
import { computeTax, calculateCapitalGainsTax } from '@/lib/tax';
import { parseITRJson } from '@/lib/itr-parser';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { getTaxRegimeSuggestion } from './actions';


import { Upload, FileText, BarChart, Users, Search, Plus, Trash2, Edit, Download, Lightbulb, Loader2, RefreshCw } from 'lucide-react';

const UploadIcon = Upload;
const FileTextIcon = FileText;
const BarChartIcon = BarChart;
const UsersIcon = Users;
const SearchIcon = Search;
const PlusIcon = Plus;
const Trash2Icon = Trash2;
const EditIcon = Edit;
const DownloadIcon = Download;
const LightbulbIcon = Lightbulb;
const RefreshCwIcon = RefreshCw;


const BarChartComponent = ({ data }: { data: { name: string, value: number }[] }) => (
    <div className="w-full h-64 flex items-end justify-around p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
        {data.map((item, index) => (
            <div key={index} className="flex flex-col items-center mx-2">
                <div
                    className="w-10 rounded-t-md bg-primary transition-all duration-300 ease-in-out"
                    style={{ height: `${(item.value / Math.max(...data.map(d => d.value), 1)) * 100}%` }}
                ></div>
                <span className="text-sm mt-1 text-gray-700 dark:text-gray-300">{item.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">₹{item.value.toLocaleString('en-IN')}</span>
            </div>
        ))}
    </div>
);


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

// --- Main App Component ---
export default function Home() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [currentClient, setCurrentClient] = useState<Partial<Client> | null>(null);
    const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'upload', 'manual', 'computation'
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [clientToDeleteId, setClientToDeleteId] = useState<string | null>(null);
    const [aiInsights, setAiInsights] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);

    // State for What-If Analysis
    const [whatIfIncome, setWhatIfIncome] = useState(0);
    const [whatIfDeduction, setWhatIfDeduction] = useState(0);
    const [whatIfOldTax, setWhatIfOldTax] = useState(0);
    const [whatIfNewTax, setWhatIfNewTax] = useState(0);

    // Initialize Firebase and handle authentication
    useEffect(() => {
        if (!app || !db || !firebaseAuth || Object.keys(app).length === 0) {
            setMessage("Firebase is not initialized. Data persistence will not work.");
            setIsAuthReady(true); // Allow app to run without persistence
            return;
        }

        const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
            if (user) {
                setCurrentUser(user);
            } else {
                // Sign in anonymously if no user is logged in
                try {
                    const token = (window as any).__initial_auth_token;
                    if (token) {
                        await signInWithCustomToken(firebaseAuth, token);
                    } else {
                        await signInAnonymously(firebaseAuth);
                    }
                } catch (error) {
                    console.error("Error signing in:", error);
                    setMessage(`Authentication error: ${(error as Error).message}`);
                }
            }
            setIsAuthReady(true);
        });

        return () => unsubscribe();
    }, []);

    // Load clients when auth is ready and userId is available
    useEffect(() => {
        if (isAuthReady && currentUser?.uid && db && Object.keys(db).length > 0) {
            const clientsCollectionRef = collection(db, `artifacts/${appId}/users/${currentUser.uid}/clients`);
            const unsubscribe = onSnapshot(clientsCollectionRef, (snapshot) => {
                const fetchedClients = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Client));
                setClients(fetchedClients);
                setMessage('');
            }, (error) => {
                console.error("Error fetching clients:", error);
                setMessage(`Error loading clients: ${error.message}`);
            });
            return () => unsubscribe();
        }
    }, [isAuthReady, currentUser]);
    
    // Utility for generating random UUID (for anonymous users)
    const generateUUID = () => crypto.randomUUID();

    // Save or update a client in Firestore
    const saveClient = async (clientData: Partial<Client>) => {
        if (!currentUser?.uid || !db || Object.keys(db).length === 0) {
            setMessage("Not authenticated or Firebase not available. Cannot save client.");
            return;
        }
        setLoading(true);
        setMessage('');
        try {
            // Recompute taxes before saving to ensure latest values
            const oldTax = computeTax(clientData.income!, clientData.deductions!, 'old', clientData.capitalGainsTransactions, clientData.dob);
            const newTax = computeTax(clientData.income!, clientData.deductions!, 'new', clientData.capitalGainsTransactions, clientData.dob);
            const clientDataToSave = {
                ...clientData,
                taxOldRegime: oldTax,
                taxNewRegime: newTax,
            };

            if (clientData.id) {
                // Update existing client
                const clientDocRef = doc(db, `artifacts/${appId}/users/${currentUser.uid}/clients`, clientData.id);
                await updateDoc(clientDocRef, clientDataToSave);
                setMessage("Client updated successfully!");
            } else {
                // Add new client
                const clientsCollectionRef = collection(db, `artifacts/${appId}/users/${currentUser.uid}/clients`);
                await addDoc(clientsCollectionRef, clientDataToSave);
                setMessage("Client added successfully!");
            }
            setCurrentClient(null); // Clear current client after saving
            setActiveTab('dashboard');
        } catch (error) {
            console.error("Error saving client:", error);
            setMessage(`Error saving client: ${(error as Error).message}`);
        } finally {
            setLoading(false);
        }
    };

    // Trigger confirmation modal for deletion
    const confirmDeleteClient = (clientId: string) => {
        setClientToDeleteId(clientId);
        setShowConfirmModal(true);
    };

    // Delete a client from Firestore after confirmation
    const deleteClient = async () => {
        setShowConfirmModal(false); // Close modal
        if (!currentUser?.uid || !clientToDeleteId || !db || Object.keys(db).length === 0) {
            setMessage("Not authenticated, Firebase not available, or no client selected for deletion.");
            return;
        }
        setLoading(true);
        setMessage('');
        try {
            const clientDocRef = doc(db, `artifacts/${appId}/users/${currentUser.uid}/clients`, clientToDeleteId);
            await deleteDoc(clientDocRef);
            setMessage("Client deleted successfully!");
            if (currentClient && currentClient.id === clientToDeleteId) {
                setCurrentClient(null);
                setActiveTab('dashboard');
            }
        } catch (error) {
            console.error("Error deleting client:", error);
            setMessage(`Error deleting client: ${(error as Error).message}`);
        } finally {
            setLoading(false);
            setClientToDeleteId(null);
        }
    };

    // Handle JSON file upload
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

                const initialCapitalGainsTransactions: any[] = []; // Keep empty for parsed, user can add manually if needed

                setCurrentClient({
                    id: undefined, // New client
                    createdAt: new Date().toISOString(),
                    ...parsedData,
                    capitalGainsTransactions: initialCapitalGainsTransactions, // Ensure this field exists
                    // Initialize tax computation results
                    taxOldRegime: computeTax(parsedData.income, parsedData.deductions, 'old', initialCapitalGainsTransactions, parsedData.dob),
                    taxNewRegime: computeTax(parsedData.income, parsedData.deductions, 'new', initialCapitalGainsTransactions, parsedData.dob),
                });
                setActiveTab('computation'); // Go to computation dashboard after upload
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

    // Start a new manual computation
    const startNewManual = () => {
        setCurrentClient({
            id: undefined,
            createdAt: new Date().toISOString(),
            clientName: "",
            pan: "",
            dob: "",
            address: "",
            itrFormType: "Manual",
            income: {
                salary: 0,
                interestIncome: 0,
                otherIncome: 0,
                capitalGains: 0,
                businessIncome: 0,
                speculationIncome: 0,
                fnoIncome: 0,
            },
            deductions: {
                section80C: 0,
                section80CCD1B: 0,
                section80CCD2: 0,
                section80D: 0,
                section80TTA: 0,
                section80TTB: 0,
                section80G: 0,
                section24B: 0,
            },
            capitalGainsTransactions: [], // Initialize empty array for manual entry
            taxOldRegime: 0,
            taxNewRegime: 0,
        });
        setActiveTab('manual');
    };

    // Select an existing client for editing/viewing
    const selectClient = (client: Client) => {
        setCurrentClient(client);
        setActiveTab('computation'); // Show computation for selected client
        // Reset What-If inputs when a new client is selected
        setWhatIfIncome(0);
        setWhatIfDeduction(0);
        setWhatIfOldTax(0);
        setWhatIfNewTax(0);
    };

    // Handle changes in manual input fields and re-compute tax
    const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setCurrentClient(prev => {
            if (!prev) return null;
            let updatedClient = { ...prev };
            const [category, field] = name.split('.');

            if (category === 'income' || category === 'deductions') {
                updatedClient = {
                    ...prev,
                    [category]: {
                        ...prev[category],
                        [field]: parseFloat(value) || 0,
                    },
                };
            } else {
                updatedClient = { ...prev, [name]: value };
            }

            // Re-compute taxes immediately with updated capitalGainsTransactions and DOB
            const oldTax = computeTax(updatedClient.income!, updatedClient.deductions!, 'old', updatedClient.capitalGainsTransactions, updatedClient.dob);
            const newTax = computeTax(updatedClient.income!, updatedClient.deductions!, 'new', updatedClient.capitalGainsTransactions, updatedClient.dob);

            return {
                ...updatedClient,
                taxOldRegime: oldTax,
                taxNewRegime: newTax,
            };
        });
    };

    // Handle changes for capital gains transactions
    const handleCGTransactionChange = (index: number, field: string, value: string) => {
        setCurrentClient(prev => {
            if (!prev) return null;
            const updatedTransactions = [...(prev.capitalGainsTransactions || [])];
            updatedTransactions[index] = {
                ...updatedTransactions[index],
                [field]: field.includes('Date') ? value : parseFloat(value) || 0,
            };

            const updatedClient = { ...prev, capitalGainsTransactions: updatedTransactions };

            // Re-compute taxes immediately
            const oldTax = computeTax(updatedClient.income!, updatedClient.deductions!, 'old', updatedClient.capitalGainsTransactions, updatedClient.dob);
            const newTax = computeTax(updatedClient.income!, updatedClient.deductions!, 'new', updatedClient.capitalGainsTransactions, updatedClient.dob);

            return {
                ...updatedClient,
                taxOldRegime: oldTax,
                taxNewRegime: newTax,
            };
        });
    };

    // Add new capital gains transaction
    const addCGTransaction = () => {
        setCurrentClient(prev => {
            if (!prev) return null;
            const updatedClient = {
                ...prev,
                capitalGainsTransactions: [
                    ...(prev.capitalGainsTransactions || []),
                    {
                        id: generateUUID(), // Unique ID for key prop
                        assetType: 'equity_listed',
                        purchaseDate: '',
                        saleDate: '',
                        purchasePrice: 0,
                        salePrice: 0,
                        expenses: 0,
                        fmv2018: 0,
                    }
                ]
            };
            // Re-compute taxes immediately
            const oldTax = computeTax(updatedClient.income!, updatedClient.deductions!, 'old', updatedClient.capitalGainsTransactions, updatedClient.dob);
            const newTax = computeTax(updatedClient.income!, updatedClient.deductions!, 'new', updatedClient.capitalGainsTransactions, updatedClient.dob);

            return {
                ...updatedClient,
                taxOldRegime: oldTax,
                taxNewRegime: newTax,
            };
        });
    };

    // Remove capital gains transaction
    const removeCGTransaction = (idToRemove: string) => {
        setCurrentClient(prev => {
            if (!prev) return null;
            const updatedTransactions = (prev.capitalGainsTransactions || []).filter(tx => tx.id !== idToRemove);
            const updatedClient = { ...prev, capitalGainsTransactions: updatedTransactions };

            // Re-compute taxes immediately
            const oldTax = computeTax(updatedClient.income!, updatedClient.deductions!, 'old', updatedClient.capitalGainsTransactions, updatedClient.dob);
            const newTax = computeTax(updatedClient.income!, updatedClient.deductions!, 'new', updatedClient.capitalGainsTransactions, updatedClient.dob);

            return {
                ...updatedClient,
                taxOldRegime: oldTax,
                taxNewRegime: newTax,
            };
        });
    };

    // Function to generate PDF report
    const generatePdfReport = (client: Partial<Client>) => {
        if (typeof window === 'undefined') return;
        const { jsPDF } = require('jspdf');
        require('jspdf-autotable');
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("TaxWise Tax Computation Report", 14, 22);
        doc.setFontSize(12);
        doc.text(`Client Name: ${client.clientName}`, 14, 30);
        doc.text(`PAN: ${client.pan}`, 14, 37);
        doc.text(`ITR Form Type: ${client.itrFormType}`, 14, 44);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 51);

        // Income Summary
        doc.setFontSize(14);
        doc.text("Income Summary", 14, 65);
        const incomeData = Object.entries(client.income!).map(([key, value]) => [
            key.replace(/([A-Z])/g, ' $1').trim().replace('capitalGains', 'Total Capital Gains (from transactions)'),
            `₹${value.toLocaleString('en-IN')}`
        ]);
        (doc as any).autoTable({
            startY: 70,
            head: [['Income Head', 'Amount']],
            body: incomeData,
            theme: 'striped',
            styles: { font: 'Inter', fontSize: 10 },
            headStyles: { fillColor: [23, 100, 191], textColor: 255 }, // Blue-600
            alternateRowStyles: { fillColor: [243, 244, 246] }, // Gray-100
            bodyStyles: { textColor: [55, 65, 81] }, // Gray-700
            margin: { left: 14, right: 14 },
        });

        // Deductions Summary
        doc.setFontSize(14);
        doc.text("Deductions Summary", 14, (doc as any).autoTable.previous.finalY + 10);
        const deductionsData = Object.entries(client.deductions!).map(([key, value]) => [
            key.replace(/([A-Z])/g, ' $1').replace('section', 'Section '),
            `₹${value.toLocaleString('en-IN')}`
        ]);
        (doc as any).autoTable({
            startY: (doc as any).autoTable.previous.finalY + 15,
            head: [['Deduction Section', 'Amount']],
            body: deductionsData,
            theme: 'striped',
            styles: { font: 'Inter', fontSize: 10 },
            headStyles: { fillColor: [23, 100, 191], textColor: 255 },
            alternateRowStyles: { fillColor: [243, 244, 246] },
            bodyStyles: { textColor: [55, 65, 81] },
            margin: { left: 14, right: 14 },
        });

        // Tax Regime Comparison
        doc.setFontSize(14);
        doc.text("Tax Regime Comparison", 14, (doc as any).autoTable.previous.finalY + 10);
        const taxComparisonData = [
            ['Old Regime Tax', `₹${client.taxOldRegime!.toLocaleString('en-IN')}`],
            ['New Regime Tax', `₹${client.taxNewRegime!.toLocaleString('en-IN')}`]
        ];
        (doc as any).autoTable({
            startY: (doc as any).autoTable.previous.finalY + 15,
            head: [['Regime', 'Tax Payable']],
            body: taxComparisonData,
            theme: 'striped',
            styles: { font: 'Inter', fontSize: 10 },
            headStyles: { fillColor: [23, 100, 191], textColor: 255 },
            alternateRowStyles: { fillColor: [243, 244, 246] },
            bodyStyles: { textColor: [55, 65, 81] },
            margin: { left: 14, right: 14 },
        });

        doc.setFontSize(12);
        const regimeComparisonMessage = client.taxOldRegime! < client.taxNewRegime!
            ? `The Old Tax Regime seems more beneficial for this client, saving ₹${(client.taxNewRegime! - client.taxOldRegime!).toLocaleString('en-IN')}.`
            : `The New Tax Regime seems more beneficial for this client, saving ₹${(client.taxOldRegime! - client.taxNewRegime!).toLocaleString('en-IN')}.`;
        doc.text(regimeComparisonMessage, 14, (doc as any).autoTable.previous.finalY + 10);

        doc.save(`${client.clientName}_Tax_Computation.pdf`);
    };

    // Function to export clients to CSV
    const exportClientsToCsv = () => {
        if (clients.length === 0) {
            setMessage("No clients to export.");
            return;
        }

        const headers = [
            "ID", "Client Name", "PAN", "DOB", "Address", "ITR Form Type",
            "Salary Income", "Interest Income", "Other Income", "Business Income",
            "Speculation Income", "F&O Income/Loss",
            "Section 80C", "Section 80CCD(1B)", "Section 80CCD(2)", "Section 80D",
            "Section 80TTA", "Section 80TTB", "Section 80G", "Section 24B",
            "Tax (Old Regime)", "Tax (New Regime)", "Created At"
        ];

        const csvRows = clients.map(client => {
            const income = client.income || {};
            const deductions = client.deductions || {};
            return [
                client.id,
                `"${client.clientName}"`,
                client.pan,
                client.dob,
                `"${(client.address || "").replace(/"/g, '""')}"`,
                client.itrFormType,
                income.salary,
                income.interestIncome,
                income.otherIncome,
                income.businessIncome,
                income.speculationIncome,
                income.fnoIncome,
                deductions.section80C,
                deductions.section80CCD1B,
                deductions.section80CCD2,
                deductions.section80D,
                deductions.section80TTA,
                deductions.section80TTB,
                deductions.section80G,
                deductions.section24B,
                client.taxOldRegime,
                client.taxNewRegime,
                client.createdAt,
            ].join(',');
        });

        const csvString = [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'taxwise_clients.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setMessage("Clients exported to CSV successfully!");
    };


    // Placeholder for AI Tax Insights
    const getAiTaxInsights = async (clientData: Partial<Client>) => {
        setAiLoading(true);
        setAiInsights(null);
        setMessage('');
        try {
            const result = await getTaxRegimeSuggestion(clientData as Client);
            if(result.success && result.data?.insights) {
                setAiInsights(result.data.insights);
                setMessage("AI insights generated successfully!");
            } else {
                setMessage(result.error || "Failed to get AI insights. Unexpected response structure.");
            }
        } catch (error) {
            console.error("Error fetching AI insights:", error);
            setMessage(`Error generating AI insights: ${(error as Error).message}`);
        } finally {
            setAiLoading(false);
        }
    };

    // What-If Analysis Calculation
    const calculateWhatIfTax = () => {
        if (!currentClient) return;

        const hypotheticalIncome = {
            ...currentClient.income!,
            salary: (currentClient.income!.salary || 0) + (whatIfIncome || 0),
        };
        const hypotheticalDeductions = {
            ...currentClient.deductions!,
            section80C: (currentClient.deductions!.section80C || 0) + (whatIfDeduction || 0),
        };

        const oldTax = computeTax(hypotheticalIncome, hypotheticalDeductions, 'old', currentClient.capitalGainsTransactions, currentClient.dob);
        const newTax = computeTax(hypotheticalIncome, hypotheticalDeductions, 'new', currentClient.capitalGainsTransactions, currentClient.dob);

        setWhatIfOldTax(oldTax);
        setWhatIfNewTax(newTax);
    };

    // Component for Dashboard (Client List)
    const Dashboard = () => {
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
                        <input
                            type="text"
                            placeholder="Search by Name or PAN..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={startNewManual}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center shadow-md"
                        >
                            <PlusIcon className="mr-2" /> New Manual Entry
                        </button>
                        <button
                            onClick={exportClientsToCsv}
                            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors duration-200 flex items-center shadow-md"
                            title="Export all client data to CSV"
                        >
                            <DownloadIcon className="mr-2" /> Export CSV
                        </button>
                    </div>
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
                                            <button
                                                onClick={() => selectClient(client)}
                                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-3 transition-colors duration-150"
                                                title="View/Edit"
                                            >
                                                <EditIcon className="inline-block w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => confirmDeleteClient(client.id)}
                                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors duration-150"
                                                title="Delete"
                                            >
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
                    User ID: <span className="font-mono bg-gray-100 dark:bg-gray-800 p-1 rounded">{currentUser?.uid || 'N/A (Loading...)'}</span>
                </div>
            </div>
        );
    };

    // Component for ITR JSON Upload
    const ITRUpload = () => (
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
                        <UploadIcon className="w-10 h-10 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">JSON file (e.g., ITR-1, ITR-2, ITR-3, ITR-4, Prefill)</p>
                    </div>
                    <input id="dropzone-file" type="file" className="hidden" accept=".json" onChange={handleFileUpload} />
                </label>
            </div>
            {loading && <p className="text-blue-500 dark:text-blue-400 mt-4">Processing file...</p>}
            {message && <p className={`text-sm ${message.includes('Error') ? 'text-red-500' : 'text-green-500'} mt-2`}>{message}</p>}
        </div>
    );

    // Component for Manual Tax Computation
    const ClientForm = ({ client, onSave, onChange, onCGChange, onAddCG, onRemoveCG, loading, message }: {client: Partial<Client> | null, onSave: (client: Partial<Client>)=>void, onChange: any, onCGChange: any, onAddCG: any, onRemoveCG: any, loading: boolean, message: string}) => {
        const isNewClient = !client || !client.id;

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (client) {
              onSave(client);
            }
        };

        return (
            <div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <FileTextIcon className="mr-2 text-blue-600 dark:text-blue-400" /> {isNewClient ? 'New Manual Entry' : 'Edit Client Data'}
                </h2>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Client Name</label>
                            <input
                                type="text"
                                id="clientName"
                                name="clientName"
                                value={client?.clientName || ''}
                                onChange={onChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="pan" className="block text-sm font-medium text-gray-700 dark:text-gray-300">PAN</label>
                            <input
                                type="text"
                                id="pan"
                                name="pan"
                                value={client?.pan || ''}
                                onChange={onChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="dob" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date of Birth</label>
                            <input
                                type="date"
                                id="dob"
                                name="dob"
                                value={client?.dob || ''}
                                onChange={onChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                            <textarea
                                id="address"
                                name="address"
                                value={client?.address || ''}
                                onChange={onChange}
                                rows={2}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            ></textarea>
                        </div>
                    </div>

                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Income Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label htmlFor="income.salary" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Salary Income</label>
                            <input type="number" id="income.salary" name="income.salary" value={client?.income?.salary || 0} onChange={onChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        </div>
                        <div>
                            <label htmlFor="income.interestIncome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Interest Income</label>
                            <input type="number" id="income.interestIncome" name="income.interestIncome" value={client?.income?.interestIncome || 0} onChange={onChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        </div>
                        <div>
                            <label htmlFor="income.otherIncome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Other Income</label>
                            <input type="number" id="income.otherIncome" name="income.otherIncome" value={client?.income?.otherIncome || 0} onChange={onChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        </div>
                        <div>
                            <label htmlFor="income.businessIncome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Business/Professional Income</label>
                            <input type="number" id="income.businessIncome" name="income.businessIncome" value={client?.income?.businessIncome || 0} onChange={onChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        </div>
                        <div>
                            <label htmlFor="income.speculationIncome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Speculation Income (Intra-Day)</label>
                            <input type="number" id="income.speculationIncome" name="income.speculationIncome" value={client?.income?.speculationIncome || 0} onChange={onChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        </div>
                        <div>
                            <label htmlFor="income.fnoIncome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">F&O Income/Loss</label>
                            <input type="number" id="income.fnoIncome" name="income.fnoIncome" value={client?.income?.fnoIncome || 0} onChange={onChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        </div>
                    </div>

                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Capital Gains Transactions</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                        Add individual capital gain transactions for accurate computation.
                    </p>
                    {(client?.capitalGainsTransactions || []).map((tx, index) => (
                        <div key={tx.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-gray-200 dark:border-gray-700 rounded-md p-4 mb-4 relative">
                            <button
                                type="button"
                                onClick={() => onRemoveCG(tx.id)}
                                className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                                title="Remove Transaction"
                            >
                                <Trash2Icon className="w-5 h-5" />
                            </button>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Asset Type</label>
                                <select
                                    value={tx.assetType}
                                    onChange={(e) => onCGChange(index, 'assetType', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                >
                                    <option value="equity_listed">Listed Equity/MF (STT Paid)</option>
                                    <option value="property">Land/Building</option>
                                    <option value="unlisted_shares">Unlisted Shares</option>
                                    <option value="other">Other Assets</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Purchase Date</label>
                                <input type="date" value={tx.purchaseDate} onChange={(e) => onCGChange(index, 'purchaseDate', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sale Date</label>
                                <input type="date" value={tx.saleDate} onChange={(e) => onCGChange(index, 'saleDate', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Purchase Price</label>
                                <input type="number" value={tx.purchasePrice} onChange={(e) => onCGChange(index, 'purchasePrice', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sale Price</label>
                                <input type="number" value={tx.salePrice} onChange={(e) => onCGChange(index, 'salePrice', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Expenses (Brokerage, etc.)</label>
                                <input type="number" value={tx.expenses} onChange={(e) => onCGChange(index, 'expenses', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                            </div>
                            {tx.purchaseDate && new Date(tx.purchaseDate) < new Date('2018-01-31') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">FMV as on 31/01/2018</label>
                                    <input type="number" value={tx.fmv2018} onChange={(e) => onCGChange(index, 'fmv2018', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                                </div>
                            )}
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={onAddCG}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 flex items-center shadow-md mb-6"
                    >
                        <PlusIcon className="mr-2" /> Add Capital Gain Transaction
                    </button>


                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Deductions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label htmlFor="deductions.section80C" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section 80C (Max ₹1.5L)</label>
                            <input type="number" id="deductions.section80C" name="deductions.section80C" value={client?.deductions?.section80C || 0} onChange={onChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        </div>
                        <div>
                            <label htmlFor="deductions.section80D" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section 80D (Health Insurance)</label>
                            <input type="number" id="deductions.section80D" name="deductions.section80D" value={client?.deductions?.section80D || 0} onChange={onChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        </div>
                        <div>
                            <label htmlFor="deductions.section80TTA" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section 80TTA (Savings Int. Max ₹10k)</label>
                            <input type="number" id="deductions.section80TTA" name="deductions.section80TTA" value={client?.deductions?.section80TTA || 0} onChange={onChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        </div>
                        <div>
                            <label htmlFor="deductions.section80TTB" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section 80TTB (Sr. Citizen Int. Max ₹50k)</label>
                            <input type="number" id="deductions.section80TTB" name="deductions.section80TTB" value={client?.deductions?.section80TTB || 0} onChange={onChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        </div>
                        <div>
                            <label htmlFor="deductions.section80CCD1B" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section 80CCD(1B) (NPS Own Cont. Max ₹50k)</label>
                            <input type="number" id="deductions.section80CCD1B" name="deductions.section80CCD1B" value={client?.deductions?.section80CCD1B || 0} onChange={onChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        </div>
                        <div>
                            <label htmlFor="deductions.section80CCD2" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section 80CCD(2) (NPS Employer Cont.)</label>
                            <input type="number" id="deductions.section80CCD2" name="deductions.section80CCD2" value={client?.deductions?.section80CCD2 || 0} onChange={onChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        </div>
                        <div>
                            <label htmlFor="deductions.section80G" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section 80G (Donations)</label>
                            <input type="number" id="deductions.section80G" name="deductions.section80G" value={client?.deductions?.section80G || 0} onChange={onChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        </div>
                        <div>
                            <label htmlFor="deductions.section24B" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section 24B (Home Loan Interest)</label>
                            <input type="number" id="deductions.section24B" name="deductions.section24B" value={client?.deductions?.section24B || 0} onChange={onChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-4">
                        <button
                            type="button"
                            onClick={() => setActiveTab('dashboard')}
                            className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 shadow-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 shadow-md flex items-center justify-center"
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="animate-spin h-5 w-5 text-white" />
                            ) : (
                                'Save Client'
                            )}
                        </button>
                    </div>
                    {message && <p className={`text-sm ${message.includes('Error') ? 'text-red-500' : 'text-green-500'} mt-4 text-center`}>{message}</p>}
                </form>
            </div>
        );
    };

    // Component for Computation Dashboard
    const ComputationDashboard = ({ client, onSave, loading, message, aiInsights, aiLoading, onGetAiInsights }: {client: Partial<Client> | null, onSave: (client: Partial<Client>)=>void, loading: boolean, message: string, aiInsights: string | null, aiLoading: boolean, onGetAiInsights: (client: Partial<Client>)=>void}) => {
        if (!client) {
            return (
                <div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md text-center text-gray-600 dark:text-gray-400">
                    No client selected. Please select a client from the dashboard or upload/create a new one.
                </div>
            );
        }

        const taxData = [
            { name: 'Old Regime', value: client.taxOldRegime! },
            { name: 'New Regime', value: client.taxNewRegime! },
        ];

        const regimeComparisonMessage = client.taxOldRegime! < client.taxNewRegime!
            ? `The Old Tax Regime seems more beneficial for this client, saving ₹${(client.taxNewRegime! - client.taxOldRegime!).toLocaleString('en-IN')}.`
            : `The New Tax Regime seems more beneficial for this client, saving ₹${(client.taxOldRegime! - client.taxNewRegime!).toLocaleString('en-IN')}.`;

        // Recalculate capital gains tax for display purposes
        const totalCapitalGainsTax = calculateCapitalGainsTax(client.capitalGainsTransactions || []);

        return (
            <div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <BarChartIcon className="mr-2 text-blue-600 dark:text-blue-400" /> Tax Computation for {client.clientName}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    PAN: {client.pan} | ITR Form Type: {client.itrFormType}
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Income Summary */}
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-inner">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Income Summary</h3>
                        <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                            <li className="flex justify-between">
                                <span>Salary Income:</span>
                                <span className="font-medium">₹{(client.income!.salary || 0).toLocaleString('en-IN')}</span>
                            </li>
                            <li className="flex justify-between">
                                <span>Interest Income:</span>
                                <span className="font-medium">₹{(client.income!.interestIncome || 0).toLocaleString('en-IN')}</span>
                            </li>
                            <li className="flex justify-between">
                                <span>Other Income:</span>
                                <span className="font-medium">₹{(client.income!.otherIncome || 0).toLocaleString('en-IN')}</span>
                            </li>
                            <li className="flex justify-between">
                                <span>Business/Professional Income:</span>
                                <span className="font-medium">₹{(client.income!.businessIncome || 0).toLocaleString('en-IN')}</span>
                            </li>
                            <li className="flex justify-between">
                                <span>Speculation Income (Intra-Day):</span>
                                <span className="font-medium">₹{(client.income!.speculationIncome || 0).toLocaleString('en-IN')}</span>
                            </li>
                            <li className="flex justify-between">
                                <span>F&O Income/Loss:</span>
                                <span className="font-medium">₹{(client.income!.fnoIncome || 0).toLocaleString('en-IN')}</span>
                            </li>
                            <li className="flex justify-between font-bold text-lg border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                                <span>Total Income (Excl. Special Rate CG):</span>
                                <span>₹{(
                                    (client.income!.salary || 0) +
                                    (client.income!.interestIncome || 0) +
                                    (client.income!.otherIncome || 0) +
                                    (client.income!.businessIncome || 0) +
                                    (client.income!.speculationIncome || 0) +
                                    (client.income!.fnoIncome || 0)
                                ).toLocaleString('en-IN')}</span>
                            </li>
                            <li className="flex justify-between font-bold text-lg border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                                <span>Tax on Capital Gains:</span>
                                <span className="font-medium">₹{totalCapitalGainsTax.toLocaleString('en-IN')}</span>
                            </li>
                        </ul>
                    </div>

                    {/* Deductions Summary */}
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-inner">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Deductions Summary</h3>
                        <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                            {Object.entries(client.deductions!).map(([key, value]) => (
                                <li key={key} className="flex justify-between">
                                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').replace('section', 'Section ')}:</span>
                                    <span className="font-medium">₹{value.toLocaleString('en-IN')}</span>
                                </li>
                            ))}
                            <li className="flex justify-between font-bold text-lg border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                                <span>Total Deductions:</span>
                                <span>₹{(Object.values(client.deductions!).reduce((sum, val) => sum + val, 0)).toLocaleString('en-IN')}</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Tax Regime Comparison</h3>
                <div className="flex flex-col md:flex-row items-center justify-around bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-inner mb-6">
                    <div className="flex flex-col items-center p-4">
                        <span className="text-lg font-medium text-gray-700 dark:text-gray-300">Tax (Old Regime)</span>
                        <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">₹{client.taxOldRegime!.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex flex-col items-center p-4 mt-4 md:mt-0">
                        <span className="text-lg font-medium text-gray-700 dark:text-gray-300">Tax (New Regime)</span>
                        <span className="text-3xl font-bold text-green-600 dark:text-green-400">₹{client.taxNewRegime!.toLocaleString('en-IN')}</span>
                    </div>
                </div>

                <p className="text-center text-lg font-semibold text-gray-800 dark:text-gray-200 mb-6">
                    {regimeComparisonMessage}
                </p>

                <div className="mb-6">
                    <BarChartComponent data={taxData} />
                </div>

                {/* What-If Analysis Section */}
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <RefreshCwIcon className="mr-2 text-teal-600 dark:text-teal-400" /> What-If Analysis
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-inner mb-6">
                    <p className="text-gray-700 dark:text-gray-300 mb-4 text-sm">
                        Adjust income or deductions hypothetically to see the impact on tax.
                        (Only affects Salary Income and 80C Deduction for simplicity)
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label htmlFor="whatIfIncome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Change in Salary Income (₹)
                            </label>
                            <input
                                type="number"
                                id="whatIfIncome"
                                value={whatIfIncome}
                                onChange={(e) => setWhatIfIncome(parseFloat(e.target.value) || 0)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <label htmlFor="whatIfDeduction" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Change in 80C Deduction (₹)
                            </label>
                            <input
                                type="number"
                                id="whatIfDeduction"
                                value={whatIfDeduction}
                                onChange={(e) => setWhatIfDeduction(parseFloat(e.target.value) || 0)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            />
                        </div>
                    </div>
                    <button
                        onClick={calculateWhatIfTax}
                        className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors duration-200 flex items-center justify-center shadow-md"
                    >
                        Calculate What-If Tax
                    </button>

                    {(whatIfOldTax > 0 || whatIfNewTax > 0) && (
                        <div className="mt-4 p-3 bg-white dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200">
                            <h4 className="font-semibold mb-2">Hypothetical Tax:</h4>
                            <p>Old Regime: <span className="font-medium">₹{whatIfOldTax.toLocaleString('en-IN')}</span></p>
                            <p>New Regime: <span className="font-medium">₹{whatIfNewTax.toLocaleString('en-IN')}</span></p>
                        </div>
                    )}
                </div>

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <LightbulbIcon className="mr-2 text-yellow-600 dark:text-yellow-400" /> AI-Powered Tax Insights
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-inner mb-6">
                    <button
                        onClick={() => onGetAiInsights(client)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors duration-200 flex items-center justify-center shadow-md mb-4"
                        disabled={aiLoading}
                    >
                        {aiLoading ? (
                            <Loader2 className="animate-spin h-5 w-5 text-white" />
                        ) : (
                            <>
                                <LightbulbIcon className="mr-2" /> Get AI Insights
                            </>
                        )}
                    </button>
                    {aiInsights && (
                        <div className="mt-4 p-3 bg-white dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                            {aiInsights}
                        </div>
                    )}
                    {aiLoading && <p className="text-blue-500 dark:text-blue-400 mt-2">Generating insights...</p>}
                </div>


                <div className="flex justify-end space-x-4">
                    <button
                        onClick={() => generatePdfReport(client)}
                        className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 shadow-md flex items-center"
                    >
                        <DownloadIcon className="mr-2" /> Export to PDF
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('manual'); // Go to manual entry to edit
                        }}
                        className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 shadow-sm flex items-center"
                    >
                        <EditIcon className="mr-2" /> Edit Data
                    </button>
                    <button
                        onClick={() => onSave(client)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 shadow-md flex items-center justify-center"
                        disabled={loading}
                    >
                        {loading ? (
                            <Loader2 className="animate-spin h-5 w-5 text-white" />
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
                {message && <p className={`text-sm ${message.includes('Error') ? 'text-red-500' : 'text-green-500'} mt-4 text-center`}>{message}</p>}
            </div>
        );
    };

    // Main App Render
    if (!isAuthReady) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-200">
                <div className="flex flex-col items-center">
                    <Loader2 className="animate-spin h-10 w-10 text-blue-600 dark:text-blue-400 mb-4" />
                    <p className="text-lg">Initializing TaxWise...</p>
                    {message && <p className="text-red-500 text-sm mt-2">{message}</p>}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-200">
            <div className="flex flex-col lg:flex-row">
                {/* Sidebar Navigation */}
                <aside className="w-full lg:w-64 bg-white dark:bg-gray-900 lg:min-h-screen p-4 shadow-lg lg:shadow-md border-b lg:border-r border-gray-200 dark:border-gray-800">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-6 text-center">TaxGPT</div>
                    <nav>
                        <ul className="space-y-2">
                            <li>
                                <button
                                    onClick={() => setActiveTab('dashboard')}
                                    className={`w-full flex items-center p-3 rounded-md text-left transition-colors duration-200 ${activeTab === 'dashboard' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-semibold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                >
                                    <UsersIcon className="mr-3" />
                                    Dashboard
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => setActiveTab('upload')}
                                    className={`w-full flex items-center p-3 rounded-md text-left transition-colors duration-200 ${activeTab === 'upload' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-semibold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                >
                                    <UploadIcon className="mr-3" />
                                    Upload ITR
                                </button>
                            </li>
                            {currentClient && (activeTab === 'manual' || activeTab === 'computation') && (
                                <li>
                                    <button
                                        onClick={() => setActiveTab('computation')}
                                        className={`w-full flex items-center p-3 rounded-md text-left transition-colors duration-200 ${activeTab === 'computation' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-semibold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                    >
                                        <BarChartIcon className="mr-3" />
                                        Computation
                                    </button>
                                </li>
                            )}
                        </ul>
                    </nav>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 p-6">
                    {activeTab === 'dashboard' && <Dashboard />}
                    {activeTab === 'upload' && <ITRUpload />}
                    {activeTab === 'manual' && (
                        <ClientForm
                            client={currentClient}
                            onSave={saveClient}
                            onChange={handleManualInputChange}
                            onCGChange={handleCGTransactionChange}
                            onAddCG={addCGTransaction}
                            onRemoveCG={removeCGTransaction}
                            loading={loading}
                            message={message}
                        />
                    )}
                    {activeTab === 'computation' && (
                        <ComputationDashboard
                            client={currentClient}
                            onSave={saveClient}
                            loading={loading}
                            message={message}
                            aiInsights={aiInsights}
                            aiLoading={aiLoading}
                            onGetAiInsights={getAiTaxInsights}
                        />
                    )}
                </main>
            </div>
            <ConfirmationModal
                isOpen={showConfirmModal}
                message="Are you sure you want to delete this client? This action cannot be undone."
                onConfirm={deleteClient}
                onCancel={() => setShowConfirmModal(false)}
            />
        </div>
    );
};
