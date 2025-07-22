
"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useAppContext } from "@/context/app-context";
import { BarChartIcon, EditIcon } from "lucide-react";
import { calculateCapitalGainsTax } from "@/lib/tax-calculator";

const CustomBarChart = ({ data }: { data: { name: string, value: number }[] }) => {
    const chartData = data.map(item => ({
        name: item.name,
        Tax: item.value,
    }));
    return (
         <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`}/>
                    <Tooltip
                        wrapperClassName="!bg-gray-800 !border-gray-700 !rounded-lg"
                        contentStyle={{ backgroundColor: 'rgba(23, 23, 23, 0.8)', border: '1px solid #4b5563', borderRadius: '0.5rem' }}
                        labelStyle={{ color: '#e5e7eb' }}
                        formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Tax']}
                    />
                    <Legend wrapperStyle={{fontSize: "14px"}}/>
                    <Bar dataKey="Tax" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};


export function ComputationDashboard() {
    const { currentClient, setActiveTab, loading, message } = useAppContext();

    if (!currentClient) {
        return (
            <div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md text-center text-gray-600 dark:text-gray-400">
                No client selected. Please select a client from the dashboard or upload/create a new one.
            </div>
        );
    }
    
    const taxData = [
        { name: 'Old Regime', value: currentClient.taxOldRegime || 0 },
        { name: 'New Regime', value: currentClient.taxNewRegime || 0 },
    ];
    
    const regimeComparisonMessage = (currentClient.taxOldRegime || 0) < (currentClient.taxNewRegime || 0)
        ? `The Old Tax Regime seems more beneficial for this client, saving ₹${((currentClient.taxNewRegime || 0) - (currentClient.taxOldRegime || 0)).toLocaleString('en-IN')}.`
        : `The New Tax Regime seems more beneficial for this client, saving ₹${((currentClient.taxOldRegime || 0) - (currentClient.taxNewRegime || 0)).toLocaleString('en-IN')}.`;

    const totalCapitalGainsTax = calculateCapitalGainsTax(currentClient.capitalGainsTransactions || []);
    
    const totalIncome = Object.values(currentClient.income).reduce((sum, val) => typeof val === 'number' ? sum + val : sum, 0);
    const totalDeductions = Object.values(currentClient.deductions).reduce((sum, val) => sum + val, 0);

    return (
         <div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                 <h2 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <BarChartIcon className="mr-2 text-blue-600 dark:text-blue-400" /> Tax Computation for {currentClient.clientName}
                </h2>
                 <button onClick={() => setActiveTab('manual')} className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 shadow-sm flex items-center">
                    <EditIcon className="mr-2 h-4 w-4" /> Edit Data
                </button>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
                PAN: {currentClient.pan} | ITR Form Type: {currentClient.itrFormType}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-inner">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Income Summary</h3>
                    <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                       {Object.entries(currentClient.income).map(([key, value]) => (
                            <li key={key} className="flex justify-between">
                                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                                <span className="font-medium">₹{(value as number).toLocaleString('en-IN')}</span>
                            </li>
                        ))}
                        <li className="flex justify-between font-bold text-lg border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                           <span>Total Income:</span>
                           <span>₹{totalIncome.toLocaleString('en-IN')}</span>
                        </li>
                         <li className="flex justify-between font-bold text-lg text-red-600">
                           <span>Tax on Capital Gains (Special Rate):</span>
                           <span>₹{totalCapitalGainsTax.toLocaleString('en-IN')}</span>
                        </li>
                    </ul>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-inner">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Deductions Summary</h3>
                     <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                       {Object.entries(currentClient.deductions).map(([key, value]) => (
                            <li key={key} className="flex justify-between">
                                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').replace('section', 'Section ')}:</span>
                                <span className="font-medium">₹{value.toLocaleString('en-IN')}</span>
                            </li>
                        ))}
                         <li className="flex justify-between font-bold text-lg border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                           <span>Total Deductions:</span>
                           <span>₹{totalDeductions.toLocaleString('en-IN')}</span>
                        </li>
                    </ul>
                </div>
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Tax Regime Comparison</h3>
             <div className="flex flex-col md:flex-row items-center justify-around bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-inner mb-6">
                 <div className="flex flex-col items-center p-4">
                    <span className="text-lg font-medium text-gray-700 dark:text-gray-300">Tax (Old Regime)</span>
                    <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">₹{(currentClient.taxOldRegime || 0).toLocaleString('en-IN')}</span>
                </div>
                 <div className="flex flex-col items-center p-4 mt-4 md:mt-0">
                    <span className="text-lg font-medium text-gray-700 dark:text-gray-300">Tax (New Regime)</span>
                    <span className="text-3xl font-bold text-green-600 dark:text-green-400">₹{(currentClient.taxNewRegime || 0).toLocaleString('en-IN')}</span>
                </div>
            </div>

             <p className="text-center text-lg font-semibold text-gray-800 dark:text-gray-200 mb-6">
                {regimeComparisonMessage}
            </p>

             <div className="mb-6">
                <CustomBarChart data={taxData} />
            </div>

            {message && <p className={`text-sm ${message.includes('Error') ? 'text-red-500' : 'text-green-500'} mt-4 text-center`}>{message}</p>}
        </div>
    );
}
