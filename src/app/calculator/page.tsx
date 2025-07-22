
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { computeTax } from '@/lib/tax-calculator';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, Calculator as CalculatorIcon, ReceiptText, Landmark, Scale, FileDown } from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import type { TaxComputationResult, TaxSlab } from '@/lib/types';
import { generateCalculatorPDF } from '@/lib/pdf-exporter';


const calculatorSchema = z.object({
    grossTotalIncome: z.number().min(0, "Income must be a positive number."),
    totalDeductions: z.number().min(0, "Deductions must be a positive number."),
    taxRegime: z.enum(['Old', 'New']),
    age: z.number().min(18, "Age must be at least 18.").max(120, "Please enter a valid age."),
}).refine(data => {
    if (data.taxRegime === 'Old') {
      return data.grossTotalIncome >= data.totalDeductions;
    }
    return true;
}, {
    message: "Deductions cannot exceed gross income.",
    path: ["totalDeductions"],
});

type CalculatorFormValues = z.infer<typeof calculatorSchema>;

interface CalculationResult {
    taxableIncome: number;
    regime: 'Old' | 'New';
    computation: TaxComputationResult;
}

interface ComparisonResult {
    oldRegime: TaxComputationResult;
    newRegime: TaxComputationResult;
}

export default function TaxCalculatorPage() {
    const [mainResult, setMainResult] = useState<CalculationResult | null>(null);
    const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [formData, setFormData] = useState<CalculatorFormValues | null>(null);


    const { control, handleSubmit, watch, formState: { errors } } = useForm<CalculatorFormValues>({
        resolver: zodResolver(calculatorSchema),
        defaultValues: {
            grossTotalIncome: 500000,
            totalDeductions: 0,
            taxRegime: 'New',
            age: 30,
        },
    });

    const taxRegime = watch('taxRegime');

    const onSubmit = (data: CalculatorFormValues) => {
        setFormData(data);
        const taxableIncomeOld = Math.max(0, data.grossTotalIncome - data.totalDeductions);
        const taxableIncomeNew = data.grossTotalIncome;
        
        const oldRegimeResult = computeTax(taxableIncomeOld, data.age, 'Old', '2024-25');
        const newRegimeResult = computeTax(taxableIncomeNew, data.age, 'New', '2024-25');

        setComparisonResult({
            oldRegime: oldRegimeResult,
            newRegime: newRegimeResult,
        });

        if (data.taxRegime === 'Old') {
            setMainResult({
                taxableIncome: taxableIncomeOld,
                computation: oldRegimeResult,
                regime: 'Old'
            });
        } else {
            setMainResult({
                taxableIncome: taxableIncomeNew,
                computation: newRegimeResult,
                regime: 'New'
            });
        }
    };
    
    const handleExport = async () => {
        if (!formData || !comparisonResult) return;
        setIsExporting(true);
        await generateCalculatorPDF({
            ...formData,
            assessmentYear: '2024-25',
            comparisonResult: {
                oldRegimeTax: comparisonResult.oldRegime.totalTaxLiability,
                newRegimeTax: comparisonResult.newRegime.totalTaxLiability,
            },
        });
        setIsExporting(false);
    };

    const SummaryItem = ({ label, value }: { label: string; value: string | number }) => (
        <div className="flex justify-between items-center text-sm py-2">
            <p className="text-muted-foreground">{label}</p>
            <p className="font-medium">{typeof value === 'number' ? formatCurrency(value) : value}</p>
        </div>
    );
    
    const chartData = comparisonResult ? [
        { name: 'Old Regime', Tax: comparisonResult.oldRegime.totalTaxLiability, breakdown: comparisonResult.oldRegime.slabBreakdown },
        { name: 'New Regime', Tax: comparisonResult.newRegime.totalTaxLiability, breakdown: comparisonResult.newRegime.slabBreakdown },
    ] : [];
    
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const breakdown: TaxSlab[] = data.breakdown || [];
            return (
                <div className="bg-background border shadow-lg rounded-lg p-4 text-sm w-80">
                    <p className="font-bold text-lg mb-2">{label}</p>
                    <Separator />
                    <table className="w-full mt-2">
                        <thead>
                            <tr className="text-left text-muted-foreground">
                                <th className="font-normal py-1">Slab Amount</th>
                                <th className="font-normal py-1 text-center">Rate</th>
                                <th className="font-normal py-1 text-right">Tax</th>
                            </tr>
                        </thead>
                        <tbody>
                            {breakdown.map((slab, i) => (
                                <tr key={i}>
                                    <td>{formatCurrency(slab.amount)}</td>
                                    <td className="text-center">{slab.rate}%</td>
                                    <td className="text-right">{formatCurrency(slab.tax)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <Separator className="my-2"/>
                    <div className="flex justify-between font-semibold">
                        <span>Total Taxable</span>
                        <span>{formatCurrency(data.breakdown.reduce((acc: number, s: TaxSlab) => acc + s.amount, 0))}</span>
                    </div>
                     <div className="flex justify-between font-semibold">
                        <span>Tax Before Cess</span>
                        <span>{formatCurrency(data.breakdown.reduce((acc: number, s: TaxSlab) => acc + s.tax, 0))}</span>
                    </div>
                     <Separator className="my-2"/>
                    <div className="flex justify-between font-bold text-lg text-primary">
                        <p>Total Payable</p>
                        <p>{formatCurrency(data.Tax)}</p>
                    </div>
                </div>
            );
        }
        return null;
    };


    return (
        <div className="container mx-auto max-w-4xl py-12 px-4">
             <div className="mb-8">
                <Button variant="outline" asChild>
                    <Link href="/">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Link>
                </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <CalculatorIcon className="h-10 w-10 text-primary" />
                            <div>
                                <CardTitle className="text-3xl font-headline">Quick Tax Calculator</CardTitle>
                                <CardDescription>Estimate your tax for AY 2024-25.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="grossTotalIncome">Gross Total Income (Annual)</Label>
                                <Controller
                                    name="grossTotalIncome"
                                    control={control}
                                    render={({ field }) => (
                                        <Input {...field} type="number" id="grossTotalIncome" placeholder="e.g., 800000" onChange={e => field.onChange(e.target.valueAsNumber)} />
                                    )}
                                />
                                {errors.grossTotalIncome && <p className="text-sm text-destructive">{errors.grossTotalIncome.message}</p>}
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="age">Your Age</Label>
                                <Controller
                                    name="age"
                                    control={control}
                                    render={({ field }) => (
                                        <Input {...field} type="number" id="age" placeholder="e.g., 35" onChange={e => field.onChange(e.target.valueAsNumber)} />
                                    )}
                                />
                                {errors.age && <p className="text-sm text-destructive">{errors.age.message}</p>}
                            </div>
                            <div className="space-y-3">
                                <Label>Tax Regime</Label>
                                <Controller
                                    name="taxRegime"
                                    control={control}
                                    render={({ field }) => (
                                       <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="New" id="new-regime" />
                                                <Label htmlFor="new-regime">New Regime (Default)</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="Old" id="old-regime" />
                                                <Label htmlFor="old-regime">Old Regime</Label>
                                            </div>
                                        </RadioGroup>
                                    )}
                                />
                            </div>
                             <div className={`space-y-2 transition-opacity duration-300 ${taxRegime === 'Old' ? 'opacity-100' : 'opacity-50'}`}>
                                <Label htmlFor="totalDeductions">Total Deductions (Chapter VI-A)</Label>
                                <Controller
                                    name="totalDeductions"
                                    control={control}
                                    render={({ field }) => (
                                        <Input {...field} type="number" id="totalDeductions" placeholder="e.g., 150000" disabled={taxRegime === 'New'} onChange={e => field.onChange(e.target.valueAsNumber || 0)} value={taxRegime === 'New' ? 0 : field.value} />
                                    )}
                                />
                                 {taxRegime === 'New' && <p className="text-xs text-muted-foreground">Deductions are generally not applicable under the New Regime.</p>}
                                {errors.totalDeductions && <p className="text-sm text-destructive">{errors.totalDeductions.message}</p>}
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full">Calculate Tax</Button>
                        </CardFooter>
                    </form>
                </Card>

                <div className="space-y-8">
                    {mainResult ? (
                        <Card className="bg-muted/30">
                            <CardHeader>
                                <CardTitle className="font-headline text-2xl">Calculation Result</CardTitle>
                                <CardDescription>Based on the {mainResult.regime} Tax Regime.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-headline text-md font-semibold flex items-center gap-2 mb-2 text-muted-foreground">
                                            <Landmark className="w-4 h-4" /> Income
                                        </h3>
                                        <Separator />
                                        <SummaryItem label="Net Taxable Income" value={mainResult.taxableIncome} />
                                    </div>

                                    <div>
                                        <h3 className="font-headline text-md font-semibold flex items-center gap-2 mb-2 text-muted-foreground">
                                            <ReceiptText className="w-4 h-4" /> Tax
                                        </h3>
                                        <Separator />
                                        <SummaryItem label="Tax before Cess" value={mainResult.computation.taxBeforeCess} />
                                         <Separator />
                                        <SummaryItem label="Rebate u/s 87A" value={mainResult.computation.rebate} />
                                        <Separator />
                                        <SummaryItem label="Health & Education Cess (4%)" value={mainResult.computation.cess} />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                               <div className="w-full flex justify-between items-center p-3 rounded-lg bg-background border">
                                    <h4 className="font-bold text-lg text-destructive">
                                        Total Tax Payable
                                    </h4>
                                    <p className="font-bold text-xl text-destructive">
                                        {formatCurrency(mainResult.computation.totalTaxLiability)}
                                    </p>
                                </div>
                            </CardFooter>
                        </Card>
                    ) : (
                         <div className="flex items-center justify-center h-full rounded-lg border-2 border-dashed text-center p-8">
                             <div>
                                <p className="text-muted-foreground">Your tax results will appear here.</p>
                                <p className="text-xs text-muted-foreground mt-4">Disclaimer: This is an estimate for AY 2024-25 and does not include surcharge or other complexities. Consult a tax professional for exact figures.</p>
                             </div>
                        </div>
                    )}

                    {comparisonResult && (
                        <Card>
                            <CardHeader>
                                 <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <Scale className="w-6 h-6 text-primary" />
                                        <CardTitle className="font-headline text-2xl">Regime Comparison</CardTitle>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
                                        <FileDown className="mr-2 h-4 w-4" />
                                        {isExporting ? 'Exporting...' : 'Export PDF'}
                                    </Button>
                                </div>
                                <CardDescription>See which regime saves you more tax. Hover over the bars for a detailed slab breakdown.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-3 rounded-md text-center font-semibold bg-accent/10 text-accent-foreground">
                                    {comparisonResult.oldRegime.totalTaxLiability < comparisonResult.newRegime.totalTaxLiability
                                        ? `The Old Regime seems more beneficial, saving you ${formatCurrency(comparisonResult.newRegime.totalTaxLiability - comparisonResult.oldRegime.totalTaxLiability)}.`
                                        : comparisonResult.newRegime.totalTaxLiability < comparisonResult.oldRegime.totalTaxLiability
                                        ? `The New Regime seems more beneficial, saving you ${formatCurrency(comparisonResult.oldRegime.totalTaxLiability - comparisonResult.newRegime.totalTaxLiability)}.`
                                        : `Both regimes result in the same tax liability.`}
                                </div>
                                <div className="h-[250px] w-full pt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis tickFormatter={(value) => formatCurrency(value as number)} />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                                            <Legend />
                                            <Bar dataKey="Tax" fill="hsl(var(--primary))" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
