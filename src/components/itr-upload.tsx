
"use client";

import { Upload } from 'lucide-react';
import { useAppContext } from '@/context/app-context';
import { parseITRJson } from '@/lib/itr-parser';
import { computeTax } from '@/lib/tax-calculator';

export function ITRUpload() {
    const { setActiveTab, setCurrentClient, loading, message, setLoading, setMessage } = useAppContext();

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setMessage('');
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const fileContent = e.target?.result as string;
                if (!fileContent) throw new Error("Could not read file content.");

                const parsedData = parseITRJson(fileContent);

                const initialCapitalGainsTransactions = []; // This can be enhanced later

                const oldTax = computeTax(parsedData.income, parsedData.deductions, 'old', initialCapitalGainsTransactions);
                const newTax = computeTax(parsedData.income, parsedData.deductions, 'new', initialCapitalGainsTransactions);
                
                setCurrentClient({
                    id: null, // New client
                    createdAt: new Date().toISOString(),
                    ...parsedData,
                    taxOldRegime: oldTax,
                    taxNewRegime: newTax,
                });
                setActiveTab('computation');
                setMessage("File parsed successfully! Review and save.");
            } catch (error: any) {
                console.error("File processing error:", error);
                setMessage(`Error processing file: ${error.message}`);
            } finally {
                setLoading(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Upload className="mr-2 text-blue-600 dark:text-blue-400" /> Upload ITR JSON
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
                Upload your ITR JSON file downloaded from the official income tax portal.
            </p>
            <div className="flex items-center justify-center w-full">
                <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-10 h-10 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">JSON file (e.g., ITR-1, ITR-2, ITR-3, ITR-4, Prefill)</p>
                    </div>
                    <input id="dropzone-file" type="file" className="hidden" accept=".json" onChange={handleFileUpload} disabled={loading}/>
                </label>
            </div>
            {loading && <p className="text-blue-500 dark:text-blue-400 mt-4 text-center">Processing file...</p>}
            {message && <p className={`text-sm ${message.includes('Error') ? 'text-red-500' : 'text-green-500'} mt-2 text-center`}>{message}</p>}
        </div>
    );
}
