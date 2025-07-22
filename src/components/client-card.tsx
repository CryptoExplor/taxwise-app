
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
  Trash2,
  FileText,
} from "lucide-react";
import { generatePDF } from "@/lib/pdf-exporter";
import { useState, useTransition, useEffect, useMemo } from "react";
import { useAuth } from "./auth-provider";
import { useToast } from "@/hooks/use-toast";
import { getTaxAnalysis } from "@/ai/flows/tax-analysis-flow";
import { doc, updateDoc, deleteDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";


interface ClientCardProps {
  client: ClientData;
  onDelete: (id: string) => void;
  onSave: (client: ClientData) => void;
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


export function ClientCard({ client, onDelete, onSave }: ClientCardProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  
  const isNewClient = client.id.startsWith('temp-');
  const [isEditing, setIsEditing] = useState(isNewClient);
  const [editableData, setEditableData] = useState<ClientData>(client);
  const [displayRegime, setDisplayRegime] = useState<'Old' | 'New'>(client.taxRegime);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // When editing is toggled, or client data changes, reset state
    if (!isEditing && !isNewClient) {
      setEditableData(client);
    }
    setDisplayRegime(client.taxRegime);
  }, [client, isEditing, isNewClient]);

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
    data.deductions.totalDeductions = 
        (data.deductions.section80C || 0) + 
        (data.deductions.section80D || 0) +
        (data.deductions.interestOnBorrowedCapital || 0) +
        (data.deductions.section80CCD1B || 0) +
        (data.deductions.section80CCD2 || 0) +
        (data.deductions.section80G || 0) +
        (data.deductions.section80TTA || 0) +
        (data.deductions.section80TTB || 0);

    const standardDeduction = data.incomeDetails.salary > 0 ? Math.min(data.incomeDetails.salary, 50000) : 0;
    
    // Recompute taxes for both regimes for comparison
    const oldRegimeTaxableIncome = Math.max(0, data.incomeDetails.grossTotalIncome - data.deductions.totalDeductions - standardDeduction);
    const newRegimeTaxableIncome = Math.max(0, data.incomeDetails.grossTotalIncome - standardDeduction);
    
    const oldRegimeResult = computeTax(oldRegimeTaxableIncome, data.personalInfo.age, 'Old', data.personalInfo.assessmentYear, data.incomeDetails, data.deductions.totalDeductions);
    const newRegimeResult = computeTax(newRegimeTaxableIncome, data.personalInfo.age, 'New', data.personalInfo.assessmentYear, data.incomeDetails, 0);
    
    // Set the main computation based on the original regime
    const taxComputationResult = data.taxRegime === 'Old' ? oldRegimeResult : newRegimeResult;
    const taxableIncome = data.taxRegime === 'Old' ? oldRegimeTaxableIncome : newRegimeTaxableIncome;
    
    // Recalculate total tax paid
    data.taxesPaid.totalTaxPaid = data.taxesPaid.tds + data.taxesPaid.selfAssessmentTax;

    const finalAmount = taxComputationResult.totalTaxLiability - data.taxesPaid.totalTaxPaid;
    
    return {
      ...data,
      taxComputation: { ...taxComputationResult, taxableIncome, netTaxPayable: Math.max(0, finalAmount), refund: Math.max(0, -finalAmount) },
      taxComparison: { oldRegime: oldRegimeResult, newRegime: newRegimeResult },
    };
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    
    const { id, createdAt, ...dataToSave } = editableData;

    try {
      if (isNewClient) {
        // Add new document
        const clientsCollectionRef = collection(db, `users/${user.uid}/clients`);
        const docRef = await addDoc(clientsCollectionRef, { ...dataToSave, createdAt: serverTimestamp() });
        toast({ title: "Success", description: "Client data saved successfully." });
        onSave({ ...editableData, id: docRef.id }); // Notify parent with the new ID
        setIsEditing(false); // Exit edit mode after saving
      } else {
        // Update existing document
        const docRef = doc(db, `users/${user.uid}/clients`, id);
        await updateDoc(docRef, dataToSave);
        toast({ title: "Success", description: "Client data updated successfully." });
        onSave(editableData);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error saving client data:", error);
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save client data." });
    } finally {
        setIsSaving(false);
    }
  };

  const handleCancel = () => {
      if (isNewClient) {
          onDelete(client.id); // Remove temporary client from dashboard
      } else {
          setIsEditing(false);
          setEditableData(client);
          setDisplayRegime(client.taxRegime);
      }
  };
  
  const handleExport = async () => {
    // Export PDF based on the currently displayed regime
    const dataForPdf = { ...editableData, taxRegime: displayRegime };
    await generatePDF(dataForPdf, "Generated by TaxWise");
  };

  const handleDelete = async () => {
    if (!user || isNewClient) {
        onDelete(client.id);
        toast({ title: "Client Removed", description: `The new entry has been discarded.` });
        return;
    };
    setIsDeleting(true);
    try {
        await deleteDoc(doc(db, `users/${user.uid}/clients`, client.id));
        toast({ title: "Client Removed", description: `${client.personalInfo.name} has been deleted.` });
        onDelete(client.id); // This will trigger the parent to update its state
    } catch (error) {
        console.error("Error deleting client:", error);
        toast({ variant: "destructive", title: "Delete Failed", description: "Could not remove the client." });
    } finally {
        setIsDeleting(false);
    }
  };

  // Determine which computation to show based on the toggle
  const computationToShow = displayRegime === 'Old'
    ? editableData.taxComparison?.oldRegime
    : editableData.taxComparison?.newRegime;

  const standardDeduction = editableData.incomeDetails.salary > 0 ? Math.min(editableData.incomeDetails.salary, 50000) : 0;

  const taxableIncomeToShow = displayRegime === 'Old'
    ? Math.max(0, editableData.incomeDetails.grossTotalIncome - editableData.deductions.totalDeductions - standardDeduction)
    : Math.max(0, editableData.incomeDetails.grossTotalIncome - standardDeduction);


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
                 <CardDescription className="flex items-center gap-2">
                    {editableData.personalInfo.itrForm && editableData.personalInfo.itrForm !== 'Unknown' && (
                        <>
                         <FileText className="w-4 h-4" />
                         <span>Form: {editableData.personalInfo.itrForm}</span>
                         <span className="text-muted-foreground/50">|</span>
                        </>
                    )}
                    <span>AY: {editableData.personalInfo.assessmentYear}</span>
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
                        <ComputationRow label="Other Income" value={editableData.incomeDetails.otherSources} isEditable={isEditing} onChange={(e) => handleInputChange(e, 'incomeDetails.otherSources')} isSubItem={true} />

                        <ComputationRow label="Gross Total Income" value={editableData.incomeDetails.grossTotalIncome} isTotal={true}/>

                        {/* --- Deductions Section --- */}
                        <ComputationRow label="Less: Standard Deduction u/s 16(ia)" value={-standardDeduction} />
                        <ComputationRow label="Less: Interest on Home Loan" value={-(editableData.deductions.interestOnBorrowedCapital || 0)} isEditable={isEditing} onChange={(e) => handleInputChange(e, 'deductions.interestOnBorrowedCapital')} />
                        <ComputationRow label="Less: Deductions u/s 80C" value={-(editableData.deductions.section80C || 0)} isEditable={isEditing} onChange={(e) => handleInputChange(e, 'deductions.section80C')} />
                        <ComputationRow label="Less: Deductions u/s 80D (Health)" value={-(editableData.deductions.section80D || 0)} isEditable={isEditing} onChange={(e) => handleInputChange(e, 'deductions.section80D')} />
                        <ComputationRow label="Less: 80CCD(1B)" value={-(editableData.deductions.section80CCD1B || 0)} isEditable={isEditing} onChange={(e) => handleInputChange(e, 'deductions.section80CCD1B')} />
                        <ComputationRow label="Less: 80CCD(2)" value={-(editableData.deductions.section80CCD2 || 0)} isEditable={isEditing} onChange={(e) => handleInputChange(e, 'deductions.section80CCD2')} />
                        <ComputationRow label="Less: 80G (Donations)" value={-(editableData.deductions.section80G || 0)} isEditable={isEditing} onChange={(e) => handleInputChange(e, 'deductions.section80G')} />
                        <ComputationRow label="Less: 80TTA (Savings Interest)" value={-(editableData.deductions.section80TTA || 0)} isEditable={isEditing} onChange={(e) => handleInputChange(e, 'deductions.section80TTA')} />
                        <ComputationRow label="Less: 80TTB (Senior Citizen)" value={-(editableData.deductions.section80TTB || 0)} isEditable={isEditing} onChange={(e) => handleInputChange(e, 'deductions.section80TTB')} />

                        <ComputationRow label="NET TAXABLE AMOUNT" value={taxableIncomeToShow} isTotal={true}/>

                        {/* --- Tax Calculation Section --- */}
                        <tr className="bg-muted/30"><td colSpan={2} className="p-2 pl-4 font-bold">Tax on Total Income</td></tr>
                        {computationToShow.slabBreakdown?.map((slab, i) => (
                            <ComputationRow key={i} label={`On ${formatCurrency(slab.amount)} @ ${slab.rate}%`} value={slab.tax} isSubItem={true} />
                        ))}
                        <ComputationRow label="Short Term Capital Gain @ 15%" value={computationToShow.taxOnSTCG} isSubItem={true} />
                        <ComputationRow label="Long Term Capital Gain @ 10%" value={computationToShow.taxOnLTCG} isSubItem={true} />
                        
                        <ComputationRow label="Total Tax" value={computationToShow.taxBeforeCess} isBold={true} />
                        <ComputationRow label="Less: Rebate u/s 87A" value={-computationToShow.rebate} />
                        <ComputationRow label="Add: Education Cess (4%)" value={computationToShow.cess} />
                        <ComputationRow label="TOTAL TAX PAYABLE" value={computationToShow.totalTaxLiability} isTotal={true}/>

                        {/* --- TDS Section --- */}
                        <ComputationRow label="Less: T.D.S." value={-editableData.taxesPaid.tds} isEditable={isEditing} onChange={(e) => handleInputChange(e, 'taxesPaid.tds')} />
                        <ComputationRow label="Less: Self Assessment Tax" value={-(editableData.taxesPaid.selfAssessmentTax || 0)} isEditable={isEditing} onChange={(e) => handleInputChange(e, 'taxesPaid.selfAssessmentTax')} />

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
        <div className="flex gap-2 justify-between w-full">
            <div>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={isEditing || isDeleting}>
                            <Trash2 className="mr-2" /> Delete Client
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the client data for {client.personalInfo.name}.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? <Loader className="animate-spin mr-2" /> : null}
                            Yes, delete
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            <div className="flex gap-2">
                {isEditing ? (
                    <>
                        <Button variant="ghost" onClick={handleCancel} disabled={isSaving}><XCircle /> Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                           {isSaving && <Loader className="animate-spin mr-2" />}
                           {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </>
                ) : (
                    <Button variant="outline" onClick={() => setIsEditing(true)}><Edit /> Edit Data</Button>
                )}
                <Button onClick={handleExport} disabled={isEditing}>
                <FileDown className="mr-2 h-4 w-4" />
                Export PDF
                </Button>
            </div>
        </div>
      </CardFooter>
    </Card>
  );
}
