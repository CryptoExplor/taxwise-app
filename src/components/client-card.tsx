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
} from "lucide-react";
import { generatePDF } from "@/lib/pdf-exporter";
import { useState } from "react";
import { Badge } from "./ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";


interface ClientCardProps {
  client: ClientData;
}

export function ClientCard({ client }: ClientCardProps) {
  const { personalInfo, incomeDetails, deductions, taxesPaid, taxComputation, taxRegime, aiSummary, aiTips } = client;
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    await generatePDF(client);
    setIsExporting(false);
  };

  const SummaryItem = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between items-center text-sm py-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );

  return (
    <Card className="flex flex-col">
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
              <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                <div>
                  <h3 className="font-headline text-md font-semibold flex items-center gap-2 mb-2 text-muted-foreground">
                    <Landmark className="w-4 h-4" /> Income & Deductions
                  </h3>
                  <Separator />
                  <SummaryItem label="Gross Total Income" value={formatCurrency(incomeDetails.grossTotalIncome)} />
                  <Separator />
                  <SummaryItem label="Total Deductions" value={formatCurrency(deductions.totalDeductions)} />
                  <Separator />
                   <div className="flex justify-between items-center py-2 text-sm">
                      <p className="text-muted-foreground">Net Taxable Income</p>
                      <p className="font-semibold text-primary">{formatCurrency(taxComputation.taxableIncome)}</p>
                  </div>
                </div>

                <div>
                   <h3 className="font-headline text-md font-semibold flex items-center gap-2 mb-2 text-muted-foreground">
                    <ReceiptText className="w-4 h-4" /> Tax Summary
                  </h3>
                  <Separator />
                  <SummaryItem label="Tax before Cess" value={formatCurrency(taxComputation.taxBeforeCess)} />
                  <Separator />
                  <SummaryItem label="Rebate" value={formatCurrency(taxComputation.rebate)} />
                  <Separator />
                  <SummaryItem label="Taxes Paid (TDS + Adv.)" value={formatCurrency(taxesPaid.tds + taxesPaid.advanceTax)} />
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="font-headline text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" /> AI Analysis
                </div>
              </AccordionTrigger>
              <AccordionContent>
                 <div className="space-y-4">
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
