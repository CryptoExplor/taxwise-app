
"use client";

import type { ClientData } from "@/lib/types";
import { formatCurrency, cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import {
  User,
  FileDown,
  RefreshCw,
  Loader,
  Edit,
  Save,
  XCircle,
  Scale,
} from "lucide-react";
import { generatePDF } from "@/lib/pdf-exporter";
import { useState, useTransition, useEffect, useMemo } from "react";
import { useAuth } from "./auth-provider";
import { useToast } from "@/hooks/use-toast";
import { getTaxAnalysis } from "@/ai/flows/tax-analysis-flow";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Input } from "./ui/input";
import { computeTax } from "@/lib/tax-calculator";
import type { ClientDataToSave } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";


interface ClientCardProps {
  client: ClientData;
}

const ComputationRow = ({
  label,
  value,
  isBold = false,
  isTotal = false,
  isEditable = false,
  onChange,
  isSubItem = false,
  isFinal = false,
  textColor,
}: {
  label: string;
  value: number | string;
  isBold?: boolean;
  isTotal?: boolean;
  isEditable?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSubItem?: boolean;
  isFinal?: boolean;
  textColor?: string;
}) => {
  const valueFormatted = typeof value === "number" ? formatCurrency(value) : value;
  const labelStyle = isBold ? "font-bold" : "";
  const rowStyle = isTotal
    ? "bg-muted/60 border-t-2 border-b-2 border-black"
    : "border-b";
  const finalStyle = isFinal ? "text-lg font-bold" : "";

  return (
    <tr className={rowStyle}>
      <td className={`p-2 ${isSubItem ? "pl-8" : "pl-4"} ${labelStyle}`}>
        {label}
      </td>
      <td
        className={`p-2 text-right pr-4 font-mono ${finalStyle} ${textColor}`}
      >
        {isEditable ? (
          <Input
            type="text"
            value={value}
            onChange={onChange}
            className="h-8 text-right bg-background"
            onFocus={(e) => e.target.select()}
          />
        ) : (
          valueFormatted
        )}
      </td>
    </tr>
  );
};


export function ClientCard({ client }: ClientCardProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editableData, setEditableData] = useState<ClientData>(client);
  const [displayRegime, setDisplayRegime] = useState<'Old' | 'New'>(client.taxRegime);

  useEffect(() => {
    // When editing is toggled, or client data changes, reset state
    if (!isEditing) {
      setEditableData(client);
    }
    setDisplayRegime(client.taxRegime);
  }, [client, isEditing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, path: string) => {
    const { value } = e.target;
    // Remove formatting for calculation
    const numericValue = parseFloat(value.replace(/,/g, '')) || 0;
    
    setEditableData(prev => {
        const newData = JSON.parse(JSON.stringify(prev)); // Deep copy
        let currentLevel: any = newData;
        const pathArray = path.split('.');
        pathArray.forEach((key, index) => {
            if (index === pathArray.length - 1) {
                currentLevel[key] = numericValue;
            } else {
                currentLevel = currentLevel[key];
            }
        });
        return recomputeAll(newData);
    });
  };

  const recomputeAll = (data: ClientData): ClientData => {
    // Recalculate Gross Total Income
    data.incomeDetails.grossTotalIncome = 
        data.incomeDetails.salary +
        data.incomeDetails.houseProperty +
        data.incomeDetails.businessIncome +
        data.incomeDetails.capitalGains.shortTerm +
        data.incomeDetails.capitalGains.longTerm +
        (data.incomeDetails.interestIncomeFD || 0) +
        (data.incomeDetails.interestIncomeSaving || 0) +
        (data.incomeDetails.dividendIncome || 0) +
        data.incomeDetails.otherSources;
    
    // Recalculate Total Deductions
    data.deductions.totalDeductions = data.deductions.section80C + data.deductions.section80D; // Add other deductions here

    // Recompute taxes for both regimes for comparison
    const oldRegimeTaxableIncome = Math.max(0, data.incomeDetails.grossTotalIncome - data.deductions.totalDeductions);
    const newRegimeTaxableIncome = data.incomeDetails.grossTotalIncome;
    
    const oldRegimeResult = computeTax(oldRegimeTaxableIncome, data.personalInfo.age, 'Old', data.personalInfo.assessmentYear);
    const newRegimeResult = computeTax(newRegimeTaxableIncome, data.personalInfo.age, 'New', data.personalInfo.assessmentYear);
    
    // Set the main computation based on the original regime
    const taxComputationResult = data.taxRegime === 'Old' ? oldRegimeResult : newRegimeResult;
    const taxableIncome = data.taxRegime === 'Old' ? oldRegimeTaxableIncome : newRegimeTaxableIncome;
    
    // Recalculate total tax paid
    data.taxesPaid.totalTaxPaid = data.taxesPaid.tds; // Add TCS, self-assessment etc. here

    const finalAmount = taxComputationResult.totalTaxLiability - data.taxesPaid.totalTaxPaid;
    
    return {
      ...data,
      taxComputation: { ...taxComputationResult, taxableIncome, netTaxPayable: Math.max(0, finalAmount), refund: Math.max(0, -finalAmount) },
      taxComparison: { oldRegime: oldRegimeResult, newRegime: newRegimeResult },
    };
  };

  const handleSave = async () => {
    if (!user) return;
    try {
        const { id, createdAt, ...dataToSave } = editableData;
        const docRef = doc(db, `users/${user.uid}/clients`, id);
        // Persist the user's regime choice
        dataToSave.taxRegime = displayRegime; 
        await updateDoc(docRef, dataToSave as ClientDataToSave);
        toast({ title: "Success", description: "Client data updated successfully." });
        setIsEditing(false);
    } catch (error) {
        console.error("Error saving client data:", error);
        toast({ variant: "destructive", title: "Save Failed", description: "Could not update client data." });
    }
  };

  const handleCancel = () => {
      setIsEditing(false);
      setEditableData(client);
      setDisplayRegime(client.taxRegime);
  };
  
  const handleExport = async () => {
    // Export PDF based on the currently displayed regime
    const dataForPdf = { ...editableData, taxRegime: displayRegime };
    await generatePDF(dataForPdf, "Generated by TaxWise");
  };

  // Determine which computation to show based on the toggle
  const computationToShow = displayRegime === 'Old'
    ? editableData.taxComparison?.oldRegime
    : editableData.taxComparison?.newRegime;

  const taxableIncomeToShow = displayRegime === 'Old'
    ? Math.max(0, editableData.incomeDetails.grossTotalIncome - editableData.deductions.totalDeductions)
    : editableData.incomeDetails.grossTotalIncome;

  const finalAmount = computationToShow ? (computationToShow.totalTaxLiability - editableData.taxesPaid.totalTaxPaid) : 0;
  const netPayable = Math.max(0, finalAmount);
  const refund = Math.max(0, -finalAmount);

  const comparisonChartData = editableData.taxComparison ? [
      { name: 'Old Regime', Tax: editableData.taxComparison.oldRegime.totalTaxLiability },
      { name: 'New Regime', Tax: editableData.taxComparison.newRegime.totalTaxLiability },
  ] : [];

  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow duration-300 w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="font-headline text-2xl">
                    Computation of Income
                </CardTitle>
                <CardDescription>
                    Assessment Year: {editableData.personalInfo.assessmentYear}
                </CardDescription>
            </div>
            <div className="flex items-center gap-2">
                 <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm"><Scale className="mr-2" /> Compare</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                        <DialogTitle>Regime Comparison</DialogTitle>
                        <DialogDescription>
                            Comparing tax liability for {editableData.personalInfo.name} for AY {editableData.personalInfo.assessmentYear}.
                        </DialogDescription>
                        </DialogHeader>
                        <div className="h-[250px] w-full pt-4">
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={comparisonChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis tickFormatter={(value) => formatCurrency(value as number)} />
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} formatter={(value:any) => formatCurrency(value)} />
                                    <Legend />
                                    <Bar dataKey="Tax" fill="hsl(var(--primary))" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </DialogContent>
                </Dialog>
                <div className="flex rounded-md p-1 bg-muted">
                    <Button onClick={() => setDisplayRegime('Old')} variant={displayRegime === 'Old' ? 'secondary': 'ghost'} size="sm" className="h-8">Old</Button>
                    <Button onClick={() => setDisplayRegime('New')} variant={displayRegime === 'New' ? 'secondary': 'ghost'} size="sm" className="h-8">New</Button>
                </div>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-0">
          <div className="overflow-x-auto">
             {computationToShow && (
                <table className="w-full text-sm">
                    <tbody>
                        <ComputationRow label="Name" value={editableData.personalInfo.name} isBold={true} />
                        <ComputationRow label="PAN" value={editableData.personalInfo.pan} isBold={true} />
                        
                        {/* --- Income Section --- */}
                        <tr className="bg-muted/30"><td colSpan={2} className="p-2 pl-4 font-bold">Income Particulars</td></tr>
                        <ComputationRow label="Income from Salary" value={editableData.incomeDetails.salary} isEditable={isEditing} onChange={(e) => handleInputChange(e, 'incomeDetails.salary')} />
                        <ComputationRow label="Income from House Property" value={editableData.incomeDetails.houseProperty} isEditable={isEditing} onChange={(e) => handleInputChange(e, 'incomeDetails.houseProperty')} />
                        <ComputationRow label="Income from Business" value={editableData.incomeDetails.businessIncome} isEditable={isEditing} onChange={(e) => handleInputChange(e, 'incomeDetails.businessIncome')} />
                        <ComputationRow label="Capital Gains" value={editableData.incomeDetails.capitalGains.shortTerm + editableData.incomeDetails.capitalGains.longTerm} />
                        
                        <tr className="bg-muted/30"><td colSpan={2} className="p-2 pl-4 font-bold">Other Sources</td></tr>
                        <ComputationRow label="Interest Income (FD, etc.)" value={editableData.incomeDetails.interestIncomeFD || 0} isEditable={isEditing} onChange={(e) => handleInputChange(e, 'incomeDetails.interestIncomeFD')} isSubItem={true} />
                        <ComputationRow label="Interest Income (Savings)" value={editableData.incomeDetails.interestIncomeSaving || 0} isEditable={isEditing} onChange={(e) => handleInputChange(e, 'incomeDetails.interestIncomeSaving')} isSubItem={true} />
                        <ComputationRow label="Dividend Income" value={editableData.incomeDetails.dividendIncome || 0} isEditable={isEditing} onChange={(e) => handleInputChange(e, 'incomeDetails.dividendIncome')} isSubItem={true} />
                        <ComputationRow label="Other Miscellaneous Income" value={editableData.incomeDetails.otherSources} isEditable={isEditing} onChange={(e) => handleInputChange(e, 'incomeDetails.otherSources')} isSubItem={true} />

                        <ComputationRow label="Gross Total Income" value={editableData.incomeDetails.grossTotalIncome} isTotal={true}/>

                        {/* --- Deductions Section --- */}
                        <ComputationRow label="Less: Standard Deduction u/s 16(ia)" value={-50000} />
                        <ComputationRow label="Less: Deductions u/s 80C" value={editableData.deductions.section80C} isEditable={isEditing} onChange={(e) => handleInputChange(e, 'deductions.section80C')} />
                        <ComputationRow label="Less: Deductions u/s 80D (Health)" value={editableData.deductions.section80D} isEditable={isEditing} onChange={(e) => handleInputChange(e, 'deductions.section80D')} />
                        <ComputationRow label="NET TAXABLE AMOUNT" value={taxableIncomeToShow} isTotal={true}/>

                        {/* --- Tax Calculation Section --- */}
                        <tr className="bg-muted/30"><td colSpan={2} className="p-2 pl-4 font-bold">Tax on Total Income</td></tr>
                        {computationToShow.slabBreakdown?.map((slab, i) => (
                            <ComputationRow key={i} label={`On ${formatCurrency(slab.amount)} @ ${slab.rate}%`} value={slab.tax} isSubItem={true} />
                        ))}
                        <ComputationRow label="Total Tax" value={computationToShow.taxBeforeCess} isBold={true} />
                        <ComputationRow label="Less: Rebate u/s 87A" value={-computationToShow.rebate} />
                        <ComputationRow label="Add: Education Cess (4%)" value={computationToShow.cess} />
                        <ComputationRow label="TOTAL TAX PAYABLE" value={computationToShow.totalTaxLiability} isTotal={true}/>

                        {/* --- TDS Section --- */}
                        <ComputationRow label="Less: T.D.S." value={-editableData.taxesPaid.tds} isEditable={isEditing} onChange={(e) => handleInputChange(e, 'taxesPaid.tds')} />

                        {/* --- Final Amount --- */}
                         <ComputationRow 
                            label={netPayable > 0 ? "Amount to be PAYABLE" : "Refundable"} 
                            value={netPayable > 0 ? netPayable : refund} 
                            isTotal={true}
                            isFinal={true}
                            textColor={netPayable > 0 ? "text-destructive" : "text-green-600"}
                        />
                    </tbody>
                </table>
            )}
          </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-4 p-4 bg-muted/50 rounded-b-lg mt-4">
        <div className="flex gap-2 justify-end">
            {isEditing ? (
                <>
                    <Button variant="ghost" onClick={handleCancel}><XCircle /> Cancel</Button>
                    <Button onClick={handleSave}><Save /> Save Changes</Button>
                </>
            ) : (
                <Button variant="outline" onClick={() => setIsEditing(true)}><Edit /> Edit Data</Button>
            )}
            <Button onClick={handleExport} disabled={isEditing}>
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
