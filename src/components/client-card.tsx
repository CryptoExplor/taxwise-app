
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
  ChevronDown,
  Plus,
  Sparkles,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Label } from "./ui/label";


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
  isSubItem = false,
  isFinal = false,
  textColor,
}: {
  label: string;
  value: number | string;
  isBold?: boolean;
  isTotal?: boolean;
  isSubItem?: boolean;
  isFinal?: boolean;
  textColor?: string;
}) => {
  const valueFormatted = typeof value === "number" ? formatCurrency(value) : value;
  const labelStyle = isBold ? "font-bold" : "";
  const rowStyle = isTotal
    ? "bg-muted/60"
    : "";
  const finalStyle = isFinal ? "text-lg font-bold" : "";

  return (
    <div className={cn("flex justify-between items-center py-2 px-4 border-b", rowStyle)}>
      <span className={cn("text-sm", isSubItem ? "pl-4" : "", labelStyle)}>
        {label}
      </span>
      <span
        className={cn(`font-mono text-sm`, finalStyle, textColor)}
      >
        {valueFormatted}
      </span>
    </div>
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
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  useEffect(() => {
    // When editing is toggled, or client data changes, reset state
     const dataWithInitializedArrays = {
        ...client,
        deductions: {
            ...client.deductions,
            customDeductions: Array.isArray(client.deductions.customDeductions) ? client.deductions.customDeductions : []
        },
        incomeDetails: {
             ...client.incomeDetails,
            customIncomes: Array.isArray(client.incomeDetails.customIncomes) ? client.incomeDetails.customIncomes : []
        }
    };
    if (!isEditing && !isNewClient) {
      setEditableData(dataWithInitializedArrays);
    } else {
      setEditableData(dataWithInitializedArrays);
    }
    setDisplayRegime(client.taxRegime);
  }, [client, isEditing, isNewClient]);


 const handleIncomeChange = (field: keyof Omit<ClientData['incomeDetails'], 'capitalGains' | 'grossTotalIncome' | 'customIncomes'>, value: string) => {
    const numericValue = parseFloat(value) || 0;
    setEditableData(prev => {
        const newIncomeDetails = { ...prev.incomeDetails, [field]: numericValue };
        const newData = { ...prev, incomeDetails: newIncomeDetails };
        return recomputeAll(newData);
    });
  };

  const handleCustomIncomeChange = (id: string, field: 'label' | 'value', value: string | number) => {
    setEditableData(prev => {
        const newCustomIncomes = prev.incomeDetails.customIncomes?.map(d => {
            if (d.id === id) {
                return { ...d, [field]: field === 'value' ? (parseFloat(value as string) || 0) : value };
            }
            return d;
        });
        const newIncomeDetails = { ...prev.incomeDetails, customIncomes: newCustomIncomes };
        return recomputeAll({ ...prev, incomeDetails: newIncomeDetails });
    });
  };

  const handleAddCustomIncome = () => {
      setEditableData(prev => {
          const newIncome = { id: `custom_income_${Date.now()}`, label: '', value: 0 };
          const customIncomes = [...(prev.incomeDetails.customIncomes || []), newIncome];
          const newIncomeDetails = { ...prev.incomeDetails, customIncomes };
          return { ...prev, incomeDetails: newIncomeDetails };
      });
  };

  const handleRemoveCustomIncome = (id: string) => {
      setEditableData(prev => {
          const customIncomes = prev.incomeDetails.customIncomes?.filter(d => d.id !== id);
          const newIncomeDetails = { ...prev.incomeDetails, customIncomes };
          return recomputeAll({ ...prev, incomeDetails: newIncomeDetails });
      });
  };


  const handleDeductionChange = (field: keyof Omit<ClientData['deductions'], 'totalDeductions' | 'customDeductions'>, value: string) => {
    const numericValue = parseFloat(value) || 0;
    setEditableData(prev => {
        const newDeductions = { ...prev.deductions, [field]: numericValue };
        const newData = { ...prev, deductions: newDeductions };
        return recomputeAll(newData);
    });
  };
  
  const handleCustomDeductionChange = (id: string, field: 'label' | 'value', value: string | number) => {
    setEditableData(prev => {
        const newCustomDeductions = prev.deductions.customDeductions?.map(d => {
            if (d.id === id) {
                return { ...d, [field]: field === 'value' ? (parseFloat(value as string) || 0) : value };
            }
            return d;
        });
        const newDeductions = { ...prev.deductions, customDeductions: newCustomDeductions };
        return recomputeAll({ ...prev, deductions: newDeductions });
    });
  };

  const handleAddCustomDeduction = () => {
      setEditableData(prev => {
          const newDeduction = { id: `custom_deduction_${Date.now()}`, label: '', value: 0 };
          const customDeductions = [...(prev.deductions.customDeductions || []), newDeduction];
          const newDeductions = { ...prev.deductions, customDeductions };
          return { ...prev, deductions: newDeductions };
      });
  };

  const handleRemoveCustomDeduction = (id: string) => {
      setEditableData(prev => {
          const customDeductions = prev.deductions.customDeductions?.filter(d => d.id !== id);
          const newDeductions = { ...prev.deductions, customDeductions };
          return recomputeAll({ ...prev, deductions: newDeductions });
      });
  };

  const handleTdsChange = (field: 'tds' | 'selfAssessmentTax' | 'tcs' | 'advanceTax', value: string) => {
    const numericValue = parseFloat(value) || 0;
    setEditableData(prev => {
        const newTaxesPaid = { ...prev.taxesPaid, [field]: numericValue };
        const newData = { ...prev, taxesPaid: newTaxesPaid };
        return recomputeAll(newData);
    });
  };

  const handleCapitalGainChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'stcg' | 'ltcg') => {
    const { name, value } = e.target;
    const numericValue = parseFloat(value) || 0;

    setEditableData(prev => {
        const newData = JSON.parse(JSON.stringify(prev));
        newData.incomeDetails.capitalGains[type][name as 'purchase' | 'sale' | 'expenses'] = numericValue;
        return recomputeAll(newData);
    });
  }

  const recomputeAll = (data: ClientData): ClientData => {
    // Recalculate capital gains totals
    const stcgProfit = data.incomeDetails.capitalGains.stcg.sale - data.incomeDetails.capitalGains.stcg.purchase;
    data.incomeDetails.capitalGains.shortTerm = stcgProfit - data.incomeDetails.capitalGains.stcg.expenses;

    const ltcgProfit = data.incomeDetails.capitalGains.ltcg.sale - data.incomeDetails.capitalGains.ltcg.purchase;
    data.incomeDetails.capitalGains.longTerm = ltcgProfit - data.incomeDetails.capitalGains.ltcg.expenses;

    // Recalculate Gross Total Income
    const customIncomesTotal = data.incomeDetails.customIncomes?.reduce((acc, d) => acc + d.value, 0) || 0;
    data.incomeDetails.grossTotalIncome = 
        data.incomeDetails.salary +
        data.incomeDetails.houseProperty +
        data.incomeDetails.businessIncome +
        data.incomeDetails.capitalGains.shortTerm +
        data.incomeDetails.capitalGains.longTerm +
        (data.incomeDetails.interestIncomeFD || 0) +
        (data.incomeDetails.interestIncomeSaving || 0) +
        (data.incomeDetails.dividendIncome || 0) +
        data.incomeDetails.otherSources +
        customIncomesTotal;
    
    // Recalculate Total Deductions from both standard and custom fields
    const customDeductionsTotal = data.deductions.customDeductions?.reduce((acc, d) => acc + d.value, 0) || 0;
    data.deductions.totalDeductions = 
        (data.deductions.section80C || 0) + 
        (data.deductions.section80D || 0) +
        (data.deductions.interestOnBorrowedCapital || 0) +
        (data.deductions.section80CCD1B || 0) +
        (data.deductions.section80CCD2 || 0) +
        (data.deductions.section80G || 0) +
        (data.deductions.section80TTA || 0) +
        (data.deductions.section80TTB || 0) +
        customDeductionsTotal;

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
    data.taxesPaid.totalTaxPaid = data.taxesPaid.tds + data.taxesPaid.selfAssessmentTax + data.taxesPaid.advanceTax + data.taxesPaid.tcs;

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
    
    const dataToSave = recomputeAll(editableData);

    const { id, createdAt, ...finalData } = dataToSave;
    const plainData = JSON.parse(JSON.stringify(finalData));

    try {
      if (isNewClient) {
        const clientsCollectionRef = collection(db, `users/${user.uid}/clients`);
        const docRef = await addDoc(clientsCollectionRef, { ...plainData, createdAt: serverTimestamp() });
        toast({ title: "Success", description: "Client data saved successfully." });
        onSave({ ...dataToSave, id: docRef.id }); 
        setIsEditing(false); 
      } else {
        const docRef = doc(db, `users/${user.uid}/clients`, id);
        await updateDoc(docRef, plainData);
        toast({ title: "Success", description: "Client data updated successfully." });
        onSave(dataToSave);
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
          onDelete(client.id); 
      } else {
          setIsEditing(false);
      }
  };
  
  const handleExport = async () => {
    const dataForPdf = recomputeAll(editableData);
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
        onDelete(client.id);
    } catch (error) {
        console.error("Error deleting client:", error);
        toast({ variant: "destructive", title: "Delete Failed", description: "Could not remove the client." });
    } finally {
        setIsDeleting(false);
    }
  };

  const handleRefreshAI = async () => {
    setIsGeneratingAI(true);
    try {
      const { taxComputation, aiSummary, aiTips, ...aiInput } = recomputeAll(editableData);
      const aiResponse = await getTaxAnalysis(aiInput);
      setEditableData(prev => ({
        ...prev,
        aiSummary: aiResponse.summary,
        aiTips: aiResponse.tips
      }));
      if (!isNewClient) {
        const docRef = doc(db, `users/${user!.uid}/clients`, client.id);
        await updateDoc(docRef, {
            aiSummary: aiResponse.summary,
            aiTips: aiResponse.tips
        });
      }
      toast({ title: "AI Analysis Refreshed", description: "New insights have been generated." });
    } catch (error) {
       toast({ variant: "destructive", title: "AI Failed", description: "Could not generate AI insights." });
    } finally {
        setIsGeneratingAI(false);
    }
  }

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

  const computeCapitalGain = (data: {sale: number, purchase: number, expenses: number}) => (data.sale - data.purchase - data.expenses);
  
  const standardIncomeFields = [
      { key: 'salary', label: 'Salary' },
      { key: 'houseProperty', label: 'House Property' },
      { key: 'businessIncome', label: 'Business Income' },
      { key: 'interestIncomeFD', label: 'Interest from FD' },
      { key: 'interestIncomeSaving', label: 'Interest from Savings' },
      { key: 'dividendIncome', label: 'Dividend Income' },
      { key: 'otherSources', label: 'Other Sources (Misc.)' },
  ] as const;

  const regularDeductions = [
    { key: 'section80C', label: 'Section 80C' },
    { key: 'section80D', label: 'Section 80D (Health)' },
    { key: 'interestOnBorrowedCapital', label: 'Interest on Home Loan' },
    { key: 'section80CCD1B', label: '80CCD(1B) (NPS)' },
    { key: 'section80CCD2', label: "80CCD(2) (Employer's NPS)" },
    { key: 'section80G', label: '80G (Donations)' },
    { key: 'section80TTA', label: '80TTA (Savings Interest)' },
    { key: 'section80TTB', label: '80TTB (Senior Citizen)' },
  ] as const;

  const taxesPaidFields = [
    { key: 'tds', label: 'TDS (Tax Deducted at Source)' },
    { key: 'tcs', label: 'TCS (Tax Collected at Source)' },
    { key: 'advanceTax', label: 'Advance Tax Paid' },
    { key: 'selfAssessmentTax', label: 'Self Assessment Tax Paid' },
  ] as const;

  const CollapsibleCard = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <Collapsible defaultOpen={false}>
      <Card className="bg-muted/30 shadow-sm">
        <CollapsibleTrigger asChild>
          <CardHeader className="flex flex-row items-center justify-between cursor-pointer">
            <CardTitle>{title}</CardTitle>
            <Button variant="ghost" size="sm">
              <ChevronDown className="h-4 w-4" />
              <span className="sr-only">Toggle</span>
            </Button>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );

  return (
    <div className="w-full space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
              <div>
                  <CardTitle className="font-headline text-2xl">
                      Computation Summary
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
        <CardContent className="p-0 border-t">
            {computationToShow && (
              <div className="divide-y">
                  <ComputationRow label="Name" value={editableData.personalInfo.name} isBold={true} />
                  <ComputationRow label="PAN" value={editableData.personalInfo.pan} isBold={true} />
                  
                  <div className="bg-muted/50 font-bold p-2 pl-4 text-sm">Income Particulars</div>
                  <ComputationRow label="Income from Salary" value={editableData.incomeDetails.salary} />
                  <ComputationRow label="Income from House Property" value={editableData.incomeDetails.houseProperty} />
                  <ComputationRow label="Income from Business" value={editableData.incomeDetails.businessIncome} />
                  <ComputationRow label="Capital Gains" value={editableData.incomeDetails.capitalGains.shortTerm + editableData.incomeDetails.capitalGains.longTerm} />
                  
                  <ComputationRow label="Other Sources" value={(editableData.incomeDetails.interestIncomeFD || 0) + (editableData.incomeDetails.interestIncomeSaving || 0) + (editableData.incomeDetails.dividendIncome || 0) + editableData.incomeDetails.otherSources} />

                  <ComputationRow label="Gross Total Income" value={editableData.incomeDetails.grossTotalIncome} isTotal={true} isBold={true}/>

                  {displayRegime === 'Old' && <ComputationRow label="Less: Total Deductions" value={-editableData.deductions.totalDeductions} />}
                  <ComputationRow label="Less: Standard Deduction" value={-standardDeduction} />
                  
                  <ComputationRow label="NET TAXABLE AMOUNT" value={taxableIncomeToShow} isTotal={true} isBold={true}/>

                  <div className="bg-muted/50 font-bold p-2 pl-4 text-sm">Tax on Total Income</div>
                  {computationToShow.slabBreakdown?.map((slab, i) => (
                      <ComputationRow key={i} label={`On ${formatCurrency(slab.amount)} @ ${slab.rate}%`} value={slab.tax} isSubItem={true} />
                  ))}
                  <ComputationRow label="Short Term Capital Gain @ Special Rate" value={computationToShow.taxOnSTCG} isSubItem={true} />
                  <ComputationRow label="Long Term Capital Gain @ Special Rate" value={computationToShow.taxOnLTCG} isSubItem={true} />
                  
                  <ComputationRow label="Total Tax" value={computationToShow.taxBeforeCess} isBold={true} />
                  <ComputationRow label="Less: Rebate u/s 87A" value={-computationToShow.rebate} />
                  <ComputationRow label="Add: Education Cess (4%)" value={computationToShow.cess} />
                  <ComputationRow label="TOTAL TAX LIABILITY" value={computationToShow.totalTaxLiability} isTotal={true} isBold={true}/>

                  <ComputationRow label="Less: T.D.S." value={-editableData.taxesPaid.tds} />
                  <ComputationRow label="Less: T.C.S" value={-editableData.taxesPaid.tcs} />
                  <ComputationRow label="Less: Advance Tax" value={-editableData.taxesPaid.advanceTax} />
                  <ComputationRow label="Less: Self Assessment Tax" value={-editableData.taxesPaid.selfAssessmentTax} />

                   <ComputationRow 
                      label={netPayable > 0 ? "Amount to be PAYABLE" : "Refundable"} 
                      value={netPayable > 0 ? netPayable : refund} 
                      isTotal={true}
                      isFinal={true}
                      textColor={netPayable > 0 ? "text-destructive" : "text-green-600"}
                  />
              </div>
            )}
        </CardContent>
      </Card>

      {isEditing && (
        <div className="space-y-4">
          <CollapsibleCard title="Manual Income Entry">
            <div className="grid grid-cols-2 gap-4">
              {standardIncomeFields.map(field => (
                <div key={field.key} className="space-y-1">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Input id={field.key} type="number" value={editableData.incomeDetails[field.key] || 0} onChange={(e) => handleIncomeChange(field.key, e.target.value)} />
                </div>
              ))}
            </div>
            <Separator className="my-4"/>
            <h4 className="font-semibold text-md text-muted-foreground mb-2">Custom Income Sources</h4>
            {editableData.incomeDetails.customIncomes?.map((income) => (
              <div key={income.id} className="grid grid-cols-[1fr,1fr,auto] gap-2 items-center mb-2">
                <Input placeholder="Income Source Name" value={income.label} onChange={(e) => handleCustomIncomeChange(income.id, 'label', e.target.value)} />
                <Input type="number" placeholder="Amount" value={income.value} onChange={(e) => handleCustomIncomeChange(income.id, 'value', e.target.value)} />
                <Button variant="ghost" size="icon" onClick={() => handleRemoveCustomIncome(income.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={handleAddCustomIncome}><Plus className="w-4 h-4 mr-2" />Add Custom Income</Button>
          </CollapsibleCard>

          <CollapsibleCard title="Capital Gains Manual Entry">
            {(['stcg', 'ltcg'] as const).map((type) => (
              <div key={type} className="mb-4">
                <h4 className="font-semibold text-md text-muted-foreground mb-2">{type === 'stcg' ? 'Short Term' : 'Long Term'} Capital Gain</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><Label>Purchase</Label><Input name="purchase" type="number" value={editableData.incomeDetails.capitalGains[type].purchase} onChange={(e) => handleCapitalGainChange(e, type)} /></div>
                  <div><Label>Sale</Label><Input name="sale" type="number" value={editableData.incomeDetails.capitalGains[type].sale} onChange={(e) => handleCapitalGainChange(e, type)} /></div>
                  <div><Label>Expenses</Label><Input name="expenses" type="number" value={editableData.incomeDetails.capitalGains[type].expenses} onChange={(e) => handleCapitalGainChange(e, type)} /></div>
                  <div><Label>Profit / Loss</Label><Input readOnly disabled value={formatCurrency(computeCapitalGain(editableData.incomeDetails.capitalGains[type]))} className="font-semibold" /></div>
                </div>
              </div>
            ))}
          </CollapsibleCard>

          <CollapsibleCard title="Deductions Manual Entry">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {regularDeductions.map(({key, label}) => (
                    <div key={key} className="flex items-center justify-between">
                        <Label htmlFor={key} className="flex-1">{label}</Label>
                        <Input 
                            id={key} type="number" className="w-1/2"
                            value={editableData.deductions[key] || 0}
                            onChange={(e) => handleDeductionChange(key, e.target.value)}
                            disabled={displayRegime === 'New' && key !== 'section80CCD2'}
                        />
                    </div>
                ))}
            </div>
            <Separator className="my-4"/>
            <h4 className="font-semibold text-md text-muted-foreground mb-2">Custom Deductions</h4>
            {editableData.deductions.customDeductions?.map((deduction) => (
                <div key={deduction.id} className="grid grid-cols-[1fr,1fr,auto] gap-2 items-center mb-2">
                    <Input placeholder="Deduction Name (e.g., 80E)" value={deduction.label} onChange={(e) => handleCustomDeductionChange(deduction.id, 'label', e.target.value)} disabled={displayRegime === 'New'} />
                    <Input type="number" placeholder="Amount" value={deduction.value} onChange={(e) => handleCustomDeductionChange(deduction.id, 'value', e.target.value)} disabled={displayRegime === 'New'} />
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveCustomDeduction(deduction.id)} disabled={displayRegime === 'New'}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
            ))}
            <Button variant="outline" size="sm" onClick={handleAddCustomDeduction} disabled={displayRegime === 'New'}><Plus className="w-4 h-4 mr-2" />Add Custom Deduction</Button>
            {displayRegime === 'New' && <p className="text-xs text-muted-foreground mt-2">Most deductions are not applicable under the New Regime, except for employer's contribution to NPS u/s 80CCD(2).</p>}
          </CollapsibleCard>

          <CollapsibleCard title="Taxes Paid Manual Entry">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {taxesPaidFields.map(field => (
                <div key={field.key} className="space-y-1">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Input id={field.key} type="number" value={editableData.taxesPaid[field.key] || 0} onChange={e => handleTdsChange(field.key, e.target.value)} />
                </div>
              ))}
            </div>
          </CollapsibleCard>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-accent" />
            <CardTitle>AI-Powered Insights</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefreshAI} disabled={isGeneratingAI}>
            {isGeneratingAI ? <Loader className="animate-spin mr-2" /> : <RefreshCw className="mr-2" />}
            {isGeneratingAI ? 'Generating...' : 'Refresh'}
          </Button>
        </CardHeader>
        <CardContent>
          <p className="font-semibold text-foreground">{editableData.aiSummary || "Click 'Refresh' to generate AI insights based on the current data."}</p>
          {editableData.aiTips && editableData.aiTips.length > 0 && (
            <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
              {editableData.aiTips.map((tip, i) => <li key={i}>{tip}</li>)}
            </ul>
          )}
        </CardContent>
      </Card>
      
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
    </div>
  );
}
