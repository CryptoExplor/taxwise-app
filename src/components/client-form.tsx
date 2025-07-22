
"use client";

import { useAuth } from "./auth-provider";
import { useAppContext } from "@/context/app-context";
import { db, appId } from "@/lib/firebase";
import { doc, addDoc, updateDoc, collection } from "firebase/firestore";
import { FileTextIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { computeTax } from "@/lib/tax-calculator";
import { v4 as uuidv4 } from "uuid";

export function ClientForm() {
    const { user } = useAuth();
    const { currentClient, setCurrentClient, setActiveTab, loading, message, setLoading, setMessage } = useAppContext();

    const isNewClient = !currentClient || !currentClient.id;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !currentClient) {
            setMessage("Not authenticated or no client data. Cannot save.");
            return;
        }
        setLoading(true);
        setMessage('');
        try {
            // Recompute taxes before saving to ensure latest values
            const oldTax = computeTax(currentClient.income, currentClient.deductions, 'old', currentClient.capitalGainsTransactions);
            const newTax = computeTax(currentClient.income, currentClient.deductions, 'new', currentClient.capitalGainsTransactions);
            
            const { id, ...clientData } = currentClient;

            const clientDataToSave = {
                ...clientData,
                taxOldRegime: oldTax,
                taxNewRegime: newTax,
                createdAt: currentClient.createdAt || new Date().toISOString(), // ensure createdAt exists
            };


            if (id) {
                // Update existing client
                const clientDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/clients`, id);
                await updateDoc(clientDocRef, clientDataToSave);
                setMessage("Client updated successfully!");
            } else {
                // Add new client
                const clientsCollectionRef = collection(db, `artifacts/${appId}/users/${user.uid}/clients`);
                await addDoc(clientsCollectionRef, clientDataToSave);
                setMessage("Client added successfully!");
            }
            setCurrentClient(null); // Clear current client after saving
            setActiveTab('dashboard');
        } catch (error: any) {
            console.error("Error saving client:", error);
            setMessage(`Error saving client: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

            const oldTax = computeTax(updatedClient.income, updatedClient.deductions, 'old', updatedClient.capitalGainsTransactions);
            const newTax = computeTax(updatedClient.income, updatedClient.deductions, 'new', updatedClient.capitalGainsTransactions);

            return { ...updatedClient, taxOldRegime: oldTax, taxNewRegime: newTax };
        });
    };
    
    const handleCGTransactionChange = (index: number, field: string, value: any) => {
        setCurrentClient(prev => {
            if (!prev) return null;
            const updatedTransactions = [...prev.capitalGainsTransactions];
            updatedTransactions[index] = { ...updatedTransactions[index], [field]: field.includes('Date') ? value : parseFloat(value) || 0, };
            const updatedClient = { ...prev, capitalGainsTransactions: updatedTransactions };
            
            const oldTax = computeTax(updatedClient.income, updatedClient.deductions, 'old', updatedClient.capitalGainsTransactions);
            const newTax = computeTax(updatedClient.income, updatedClient.deductions, 'new', updatedClient.capitalGainsTransactions);

            return { ...updatedClient, taxOldRegime: oldTax, taxNewRegime: newTax };
        });
    };

    const addCGTransaction = () => {
        setCurrentClient(prev => {
            if (!prev) return null;
            const newTx = {
                id: uuidv4(),
                assetType: 'equity_listed',
                purchaseDate: '',
                saleDate: '',
                purchasePrice: 0,
                salePrice: 0,
                expenses: 0,
                fmv2018: 0,
            };
            const updatedClient = { ...prev, capitalGainsTransactions: [...(prev.capitalGainsTransactions || []), newTx] };

            const oldTax = computeTax(updatedClient.income, updatedClient.deductions, 'old', updatedClient.capitalGainsTransactions);
            const newTax = computeTax(updatedClient.income, updatedClient.deductions, 'new', updatedClient.capitalGainsTransactions);
            
            return { ...updatedClient, taxOldRegime: oldTax, taxNewRegime: newTax };
        });
    };
    
    const removeCGTransaction = (idToRemove: string) => {
        setCurrentClient(prev => {
            if (!prev) return null;
            const updatedTransactions = (prev.capitalGainsTransactions || []).filter(tx => tx.id !== idToRemove);
            const updatedClient = { ...prev, capitalGainsTransactions: updatedTransactions };

            const oldTax = computeTax(updatedClient.income, updatedClient.deductions, 'old', updatedClient.capitalGainsTransactions);
            const newTax = computeTax(updatedClient.income, updatedClient.deductions, 'new', updatedClient.capitalGainsTransactions);
            
            return { ...updatedClient, taxOldRegime: oldTax, taxNewRegime: newTax };
        });
    };


    if (!currentClient) {
        return <div>Error: No client data available for the form.</div>
    }

    return (
        <div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FileTextIcon className="mr-2 text-blue-600 dark:text-blue-400" /> {isNewClient ? 'New Manual Entry' : 'Edit Client Data'}
            </h2>
            <form onSubmit={handleSave}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Client Name</label>
                        <input type="text" id="clientName" name="clientName" value={currentClient.clientName} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" required />
                    </div>
                    <div>
                        <label htmlFor="pan" className="block text-sm font-medium text-gray-700 dark:text-gray-300">PAN</label>
                        <input type="text" id="pan" name="pan" value={currentClient.pan} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" required />
                    </div>
                    <div>
                        <label htmlFor="dob" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date of Birth</label>
                        <input type="date" id="dob" name="dob" value={currentClient.dob} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                        <textarea id="address" name="address" value={currentClient.address} onChange={handleChange} rows={2} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"></textarea>
                    </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Income Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label htmlFor="income.salary" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Salary Income</label>
                        <input type="number" id="income.salary" name="income.salary" value={currentClient.income.salary} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                    </div>
                    <div>
                        <label htmlFor="income.interestIncome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Interest Income</label>
                        <input type="number" id="income.interestIncome" name="income.interestIncome" value={currentClient.income.interestIncome} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                    </div>
                     <div>
                        <label htmlFor="income.otherIncome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Other Income</label>
                        <input type="number" id="income.otherIncome" name="income.otherIncome" value={currentClient.income.otherIncome} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                    </div>
                    <div>
                        <label htmlFor="income.businessIncome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Business/Professional Income</label>
                        <input type="number" id="income.businessIncome" name="income.businessIncome" value={currentClient.income.businessIncome} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                    </div>
                    <div>
                        <label htmlFor="income.speculationIncome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Speculation Income (Intra-Day)</label>
                        <input type="number" id="income.speculationIncome" name="income.speculationIncome" value={currentClient.income.speculationIncome} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                    </div>
                    <div>
                        <label htmlFor="income.fnoIncome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">F&O Income/Loss</label>
                        <input type="number" id="income.fnoIncome" name="income.fnoIncome" value={currentClient.income.fnoIncome} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                    </div>
                </div>
                
                 <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Capital Gains Transactions</h3>
                {(currentClient.capitalGainsTransactions || []).map((tx, index) => (
                    <div key={tx.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-gray-200 dark:border-gray-700 rounded-md p-4 mb-4 relative">
                        <button type="button" onClick={() => removeCGTransaction(tx.id)} className="absolute top-2 right-2 text-red-500 hover:text-red-700" title="Remove Transaction">
                            <Trash2Icon className="w-5 h-5" />
                        </button>
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
                <button type="button" onClick={addCGTransaction} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 flex items-center shadow-md mb-6">
                    <PlusIcon className="mr-2 h-5 w-5" /> Add Capital Gain Transaction
                </button>
                

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Deductions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label htmlFor="deductions.section80C" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section 80C (Max ₹1.5L)</label>
                        <input type="number" id="deductions.section80C" name="deductions.section80C" value={currentClient.deductions.section80C} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                    </div>
                     <div>
                        <label htmlFor="deductions.section80D" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section 80D (Health Insurance)</label>
                        <input type="number" id="deductions.section80D" name="deductions.section80D" value={currentClient.deductions.section80D} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                    </div>
                     <div>
                        <label htmlFor="deductions.section80TTA" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section 80TTA (Savings Int. Max ₹10k)</label>
                        <input type="number" id="deductions.section80TTA" name="deductions.section80TTA" value={currentClient.deductions.section80TTA} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                    </div>
                     <div>
                        <label htmlFor="deductions.section80TTB" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section 80TTB (Sr. Citizen Int. Max ₹50k)</label>
                        <input type="number" id="deductions.section80TTB" name="deductions.section80TTB" value={currentClient.deductions.section80TTB} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                    </div>
                    <div>
                        <label htmlFor="deductions.section80CCD1B" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section 80CCD(1B) (NPS Own Cont. Max ₹50k)</label>
                        <input type="number" id="deductions.section80CCD1B" name="deductions.section80CCD1B" value={currentClient.deductions.section80CCD1B} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                    </div>
                     <div>
                        <label htmlFor="deductions.section80CCD2" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section 80CCD(2) (NPS Employer Cont.)</label>
                        <input type="number" id="deductions.section80CCD2" name="deductions.section80CCD2" value={currentClient.deductions.section80CCD2} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                    </div>
                     <div>
                        <label htmlFor="deductions.section80G" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section 80G (Donations)</label>
                        <input type="number" id="deductions.section80G" name="deductions.section80G" value={currentClient.deductions.section80G} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                    </div>
                     <div>
                        <label htmlFor="deductions.section24B" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section 24B (Home Loan Interest)</label>
                        <input type="number" id="deductions.section24B" name="deductions.section24B" value={currentClient.deductions.section24B} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                    </div>
                </div>

                <div className="flex justify-end space-x-4">
                    <button type="button" onClick={() => setActiveTab('dashboard')} className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 shadow-sm">
                        Cancel
                    </button>
                    <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 shadow-md flex items-center justify-center" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Client'}
                    </button>
                </div>
                {message && <p className={`text-sm ${message.includes('Error') ? 'text-red-500' : 'text-green-500'} mt-4 text-center`}>{message}</p>}
            </form>
        </div>
    );
}
