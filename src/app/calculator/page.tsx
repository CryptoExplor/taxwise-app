
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { generateCalculatorPDF } from '@/lib/pdf-exporter';
import { computeTax } from '@/lib/tax-calculator';

const ArrowLeft = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>;
const CalculatorIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-blue-600"><path d="M16 4h4v4"/><path d="M14 10l6-6"/><path d="M4 20v-4h4"/><path d="M10 14l-6 6"/><rect width="8" height="8" x="4" y="4" rx="2"/><rect width="8" height="8" x="12" y="12" rx="2"/></svg>;
const FileDown = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>;


export default function TaxCalculatorPage() {
    const [grossTotalIncome, setGrossTotalIncome] = useState(500000);
    const [totalDeductions, setTotalDeductions] = useState(0);
    const [taxRegime, setTaxRegime] = useState<'Old' | 'New'>('New');
    const [age, setAge] = useState(30);
    const [mainResult, setMainResult] = useState(null);
    const [isExporting, setIsExporting] = useState(false);

    const onSubmit = (e) => {
        e.preventDefault();
        const income = { salary: grossTotalIncome, interestIncome: 0, otherIncome: 0, capitalGains: 0, businessIncome: 0, speculationIncome: 0, fnoIncome: 0 };
        const deductions = { section80C: totalDeductions, section80CCD1B: 0, section80CCD2: 0, section80D: 0, section80TTA: 0, section80TTB: 0, section80G: 0, section24B: 0 };
        
        const result = computeTax(income, deductions, taxRegime, [], age.toString());
        setMainResult({ tax: result, regime: taxRegime });
    };

    const handleExport = async () => {
        if (!mainResult) return;
        setIsExporting(true);
        // Simplified data for PDF exporter
        const pdfData = { grossTotalIncome, totalDeductions, taxRegime, age, assessmentYear: '2024-25', comparisonResult: { oldRegimeTax: mainResult.tax, newRegimeTax: 0 }};
        await generateCalculatorPDF(pdfData);
        setIsExporting(false);
    };

    return (
        <div className="container mx-auto max-w-4xl py-12 px-4">
            <div className="mb-8">
                <Link href="/" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <ArrowLeft /> Back to Dashboard
                </Link>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <div className="flex items-center gap-4 mb-4">
                        <CalculatorIcon />
                        <div>
                            <h1 className="text-3xl font-bold">Quick Tax Calculator</h1>
                            <p className="text-gray-500 dark:text-gray-400">Estimate your tax for AY 2024-25.</p>
                        </div>
                    </div>
                    <form onSubmit={onSubmit}>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="grossTotalIncome" className="block text-sm font-medium">Gross Total Income (Annual)</label>
                                <input type="number" id="grossTotalIncome" value={grossTotalIncome} onChange={e => setGrossTotalIncome(Number(e.target.value))} className="w-full px-3 py-2 border rounded-md" />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="age" className="block text-sm font-medium">Your Age</label>
                                <input type="number" id="age" value={age} onChange={e => setAge(Number(e.target.value))} className="w-full px-3 py-2 border rounded-md" />
                            </div>
                            <div className="space-y-3">
                                <label className="block text-sm font-medium">Tax Regime</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center"><input type="radio" name="taxRegime" value="New" checked={taxRegime === 'New'} onChange={() => { setTaxRegime('New'); setTotalDeductions(0); }} className="mr-2" />New Regime (Default)</label>
                                    <label className="flex items-center"><input type="radio" name="taxRegime" value="Old" checked={taxRegime === 'Old'} onChange={() => setTaxRegime('Old')} className="mr-2" />Old Regime</label>
                                </div>
                            </div>
                            <div className={`space-y-2 transition-opacity duration-300 ${taxRegime === 'Old' ? 'opacity-100' : 'opacity-50'}`}>
                                <label htmlFor="totalDeductions" className="block text-sm font-medium">Total Deductions (Chapter VI-A)</label>
                                <input type="number" id="totalDeductions" value={totalDeductions} onChange={e => setTotalDeductions(Number(e.target.value))} disabled={taxRegime === 'New'} className="w-full px-3 py-2 border rounded-md" />
                            </div>
                        </div>
                        <div className="mt-6">
                            <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700">Calculate Tax</button>
                        </div>
                    </form>
                </div>

                <div className="space-y-8">
                    {mainResult ? (
                        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
                            <h2 className="font-bold text-2xl">Calculation Result</h2>
                            <p className="text-gray-500 mb-4">Based on the {mainResult.regime} Tax Regime.</p>
                            <div className="w-full flex justify-between items-center p-3 rounded-lg bg-white dark:bg-gray-700 border">
                                <h4 className="font-bold text-lg text-red-600">Total Tax Payable</h4>
                                <p className="font-bold text-xl text-red-600">₹{mainResult.tax.toLocaleString('en-IN')}</p>
                            </div>
                             <div className="mt-4">
                                <button onClick={handleExport} disabled={isExporting} className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                                    <FileDown /> {isExporting ? 'Exporting...' : 'Export PDF'}
                                </button>
                            </div>
                        </div>
                    ) : (
                         <div className="flex items-center justify-center h-full rounded-lg border-2 border-dashed text-center p-8">
                             <div>
                                <p className="text-gray-500">Your tax results will appear here.</p>
                                <p className="text-xs text-gray-400 mt-4">Disclaimer: This is an estimate for AY 2024-25 and does not include surcharge or other complexities. Consult a tax professional for exact figures.</p>
                             </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
