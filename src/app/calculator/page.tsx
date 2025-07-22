
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
import { ArrowLeft, Calculator as CalculatorIcon, ReceiptText, Landmark, Scale } from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

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

interface TaxResult {
    netTaxableIncome: number;
    taxLiability: number;
    cess: number;
    totalPayable: number;
    regime: 'Old' | 'New';
}

interface ComparisonResult {
    oldRegimeTax: number;
    newRegimeTax: number;
}

export default function TaxCalculatorPage() {
    const [taxResult, setTaxResult] = useState<TaxResult | null>(null);
    const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);

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
        // Main calculation for selected regime
        const taxableIncome = data.taxRegime === 'Old' 
            ? Math.max(0, data.grossTotalIncome - data.totalDeductions) 
            : data.grossTotalIncome;

        const result = computeTax(taxableIncome, data.age, data.taxRegime, '2024-25');
        
        setTaxResult({
            netTaxableIncome: taxableIncome,
            taxLiability: result.taxBeforeCess,
            cess: result.cess,
            totalPayable: result.totalTaxLiability,
            regime: data.taxRegime,
        });

        // Comparison calculation
        const oldRegimeTaxableIncome = Math.max(0, data.grossTotalIncome - data.totalDeductions);
        const oldRegimeResult = computeTax(oldRegimeTaxableIncome, data.age, 'Old', '2024-25');
        
        const newRegimeTaxableIncome = data.grossTotalIncome;
        const newRegimeResult = computeTax(newRegimeTaxableIncome, data.age, 'New', '2024-25');

        setComparisonResult({
            oldRegimeTax: oldRegimeResult.totalTaxLiability,
            newRegimeTax: newRegimeResult.totalTaxLiability,
        });
    };
    
    const SummaryItem = ({ label, value }: { label: string; value: string | number }) => (
        <div className="flex justify-between items-center text-sm py-2">
            <p className="text-muted-foreground">{label}</p>
            <p className="font-medium">{typeof value === 'number' ? formatCurrency(value) : value}</p>
        </div>
    );

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
                    {taxResult ? (
                        <Card className="bg-muted/30">
                            <CardHeader>
                                <CardTitle className="font-headline text-2xl">Calculation Result</CardTitle>
                                <CardDescription>Based on the {taxResult.regime} Tax Regime.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-headline text-md font-semibold flex items-center gap-2 mb-2 text-muted-foreground">
                                            <Landmark className="w-4 h-4" /> Income
                                        </h3>
                                        <Separator />
                                        <SummaryItem label="Net Taxable Income" value={taxResult.netTaxableIncome} />
                                    </div>

                                    <div>
                                        <h3 className="font-headline text-md font-semibold flex items-center gap-2 mb-2 text-muted-foreground">
                                            <ReceiptText className="w-4 h-4" /> Tax
                                        </h3>
                                        <Separator />
                                        <SummaryItem label="Tax before Cess" value={taxResult.taxLiability} />
                                        <Separator />
                                        <SummaryItem label="Health & Education Cess (4%)" value={taxResult.cess} />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                               <div className="w-full flex justify-between items-center p-3 rounded-lg bg-background border">
                                    <h4 className="font-bold text-lg text-destructive">
                                        Total Tax Payable
                                    </h4>
                                    <p className="font-bold text-xl text-destructive">
                                        {formatCurrency(taxResult.totalPayable)}
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
                                <CardTitle className="font-headline text-2xl flex items-center gap-2">
                                    <Scale className="w-6 h-6 text-primary" /> Regime Comparison
                                </CardTitle>
                                <CardDescription>See which regime saves you more tax.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-around text-center">
                                    <div>
                                        <p className="text-muted-foreground font-semibold">Old Regime</p>
                                        <p className="text-lg font-bold">{formatCurrency(comparisonResult.oldRegimeTax)}</p>
                                    </div>
                                     <div>
                                        <p className="text-muted-foreground font-semibold">New Regime</p>
                                        <p className="text-lg font-bold">{formatCurrency(comparisonResult.newRegimeTax)}</p>
                                    </div>
                                </div>
                                <div className="p-3 rounded-md text-center font-semibold bg-accent/10 text-accent-foreground">
                                    {comparisonResult.oldRegimeTax < comparisonResult.newRegimeTax
                                        ? `The Old Regime seems more beneficial, saving you ${formatCurrency(comparisonResult.newRegimeTax - comparisonResult.oldRegimeTax)}.`
                                        : comparisonResult.newRegimeTax < comparisonResult.oldRegimeTax
                                        ? `The New Regime seems more beneficial, saving you ${formatCurrency(comparisonResult.oldRegimeTax - comparisonResult.newRegimeTax)}.`
                                        : `Both regimes result in the same tax liability.`}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
