
"use client";

import type { ClientData } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
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
  ReceiptText,
  Landmark,
  FileDown,
  ArrowRight,
  ArrowDown,
  Sparkles,
  Lightbulb,
  RefreshCw,
  Loader,
  Scale,
} from "lucide-react";
import { generatePDF } from "@/lib/pdf-exporter";
import { useState, useTransition } from "react";
import { Badge } from "./ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAuth } from "./auth-provider";
import { useToast } from "@/hooks/use-toast";
import { getTaxAnalysis } from "@/ai/flows/tax-analysis-flow";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";


interface ClientCardProps {
  client: ClientData;
}

export function ClientCard({ client }: ClientCardProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const { personalInfo, incomeDetails, deductions, taxesPaid, taxComputation, taxRegime, aiSummary, aiTips, taxComparison } = client;
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, startTransition] = useTransition();

  const handleExport = async () => {
    setIsExporting(true);
    await generatePDF(client);
    setIsExporting(false);
  };

  const handleRefreshAnalysis = () => {
    if (!user) return;
    startTransition(async () => {
        try {
            const { taxComputation, aiSummary, aiTips, ...aiInput } = client;
            const aiResponse = await getTaxAnalysis(aiInput);
            await updateDoc(doc(db, `users/${user.uid}/clients`, client.id), {
                aiSummary: aiResponse.summary,
                aiTips: aiResponse.tips
            });
            toast({
                title: "AI Analysis Refreshed",
                description: "The summary and tips have been updated.",
            });
        } catch (err) {
            console.error("AI analysis failed for client:", client.id, err);
            toast({
                variant: "destructive",
                title: "AI Analysis Failed",
                description: `Could not refresh AI insights for ${client.fileName}.`,
            });
        }
    });
  };

  const SummaryItem = ({ label, value }: { label: string; value: string | number }) => (
    <div className="flex justify-between items-center text-sm py-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{typeof value === 'number' ? formatCurrency(value) : value}</p>
    </div>
  );
  
  const canRefresh = userProfile && ['family', 'pro', 'agency', 'admin'].includes(userProfile.plan);

  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <div className="flex items-center gap-3">
                    <User className="w-8 h-8 text-primary" />
                    <div>
                        <CardTitle className="font-headline text-2xl">
                            {personalInfo.name}
                        </CardTitle>
                        <CardDescription>
                            PAN: {personalInfo.pan} | AY: {personalInfo.assessmentYear}
                        </CardDescription>
                    </div>
                </div>
            </div>
             <div className="flex flex-col items-end gap-2">
                <Badge variant={taxRegime === 'New' ? 'default' : 'secondary'}>{taxRegime} Regime</Badge>
                <p className="text-xs text-muted-foreground pt-1 truncate max-w-[120px]">{client.fileName}</p>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
          <Accordion type="single" collapsible defaultValue="item-1">
            <AccordionItem value="item-1">
              <AccordionTrigger className="font-headline text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <ReceiptText className="w-5 h-5 text-accent" /> Tax Computation
                </div>
              </AccordionTrigger>
              <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 pt-2">
                <div>
                  <h3 className="font-headline text-md font-semibold flex items-center gap-2 mb-2 text-muted-foreground">
                    <Landmark className="w-4 h-4" /> Income & Deductions
                  </h3>
                  <Separator />
                  <SummaryItem label="Gross Total Income" value={incomeDetails.grossTotalIncome} />
                  <Separator />
                  <SummaryItem label="Total Deductions" value={deductions.totalDeductions} />
                  <Separator />
                   <div className="flex justify-between items-center py-2">
                      <p className="text-muted-foreground">Net Taxable Income</p>
                      <p className="font-semibold text-lg text-primary">{formatCurrency(taxComputation.taxableIncome)}</p>
                  </div>
                </div>

                <div>
                   <h3 className="font-headline text-md font-semibold flex items-center gap-2 mb-2 text-muted-foreground">
                    <ReceiptText className="w-4 h-4" /> Tax Summary
                  </h3>
                  <Separator />
                  <SummaryItem label="Tax before Cess" value={taxComputation.taxBeforeCess} />
                  <Separator />
                  <SummaryItem label="Rebate u/s 87A" value={taxComputation.rebate} />
                   <Separator />
                  <SummaryItem label="Taxes Paid (TDS, etc.)" value={taxesPaid.totalTaxPaid} />
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="font-headline text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" /> AI Analysis & Comparison
                </div>
              </AccordionTrigger>
              <AccordionContent>
                 <div className="space-y-4 pt-2">
                    {aiSummary ? (
                         <p className="text-sm text-foreground/90 italic border-l-2 border-accent pl-3">{aiSummary}</p>
                    ): (
                         <p className="text-sm text-muted-foreground">AI summary is being generated...</p>
                    )}
                   
                    {aiTips && aiTips.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="font-semibold flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" /> Tax Saving Tips:</h4>
                            <ul className="list-disc pl-5 space-y-1 text-sm">
                                {aiTips.map((tip, index) => <li key={index}>{tip}</li>)}
                            </ul>
                        </div>
                    )}
                     {canRefresh && (
                        <div className="pt-2 text-right">
                            <Button variant="ghost" size="sm" onClick={handleRefreshAnalysis} disabled={isRefreshing}>
                                {isRefreshing ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                {isRefreshing ? "Refreshing..." : "Refresh AI Analysis"}
                            </Button>
                        </div>
                    )}

                    {taxComparison && (
                        <div className="space-y-3 pt-4">
                            <Separator />
                            <h4 className="font-semibold flex items-center gap-2"><Scale className="w-4 h-4 text-blue-500" /> Regime Comparison:</h4>
                            <div className="flex justify-around text-center p-2 rounded-lg bg-muted">
                                <div>
                                    <p className="text-muted-foreground text-sm font-semibold">Old Regime</p>
                                    <p className="text-md font-bold">{formatCurrency(taxComparison.oldRegime.totalTaxLiability)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-sm font-semibold">New Regime</p>
                                    <p className="text-md font-bold">{formatCurrency(taxComparison.newRegime.totalTaxLiability)}</p>
                                </div>
                            </div>
                             <div className="p-2 rounded-md text-center font-semibold text-sm bg-accent/10 text-accent-foreground">
                                {taxComparison.oldRegime.totalTaxLiability < taxComparison.newRegime.totalTaxLiability
                                    ? `The Old Regime seems more beneficial, saving you ${formatCurrency(taxComparison.newRegime.totalTaxLiability - taxComparison.oldRegime.totalTaxLiability)}.`
                                    : taxComparison.newRegime.totalTaxLiability < taxComparison.oldRegime.totalTaxLiability
                                    ? `The New Regime seems more beneficial, saving you ${formatCurrency(taxComparison.oldRegime.totalTaxLiability - taxComparison.newRegime.totalTaxLiability)}.`
                                    : `Both regimes result in the same tax liability.`}
                            </div>
                        </div>
                    )}
                 </div>
              </AccordionContent>
            </AccordionItem>
        </Accordion>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-4 p-4 bg-muted/50 dark:bg-card-foreground/5 rounded-b-lg mt-4">
        <div className="flex justify-between items-center p-3 rounded-lg bg-background">
          {taxComputation.netTaxPayable > 0 ? (
            <>
              <h4 className="font-bold text-lg text-destructive flex items-center gap-2">
                <ArrowRight className="w-5 h-5" /> Tax Payable
              </h4>
              <p className="font-bold text-xl text-destructive">
                {formatCurrency(taxComputation.netTaxPayable)}
              </p>
            </>
          ) : (
            <>
              <h4 className="font-bold text-lg text-green-600 flex items-center gap-2">
                <ArrowDown className="w-5 h-5" /> Refund Due
              </h4>
              <p className="font-bold text-xl text-green-600">
                {formatCurrency(taxComputation.refund)}
              </p>
            </>
          )}
        </div>
        <Button onClick={handleExport} disabled={isExporting}>
          <FileDown className="mr-2 h-4 w-4" />
          {isExporting ? "Exporting PDF..." : "Export PDF Summary"}
        </Button>
      </CardFooter>
    </Card>
  );
}
