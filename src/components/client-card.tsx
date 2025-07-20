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
  ShieldCheck,
  Landmark,
  FileDown,
  ArrowRight,
  ArrowDown,
} from "lucide-react";
import { generatePDF } from "@/lib/pdf-exporter";
import { useState } from "react";

interface ClientCardProps {
  client: ClientData;
}

export function ClientCard({ client }: ClientCardProps) {
  const { personalInfo, incomeDetails, deductions, taxesPaid, taxComputation } = client;
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
                <CardTitle className="font-headline text-2xl flex items-center gap-2">
                <User className="w-6 h-6 text-primary" />
                {personalInfo.name}
                </CardTitle>
                <CardDescription>
                PAN: {personalInfo.pan} | AY: {personalInfo.assessmentYear}
                </CardDescription>
            </div>
            <p className="text-xs text-muted-foreground pt-1 truncate max-w-[120px]">{client.fileName}</p>
        </div>
      </CardHeader>
      <CardContent className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        <div>
          <h3 className="font-headline text-lg font-semibold flex items-center gap-2 mb-2">
            <Landmark className="w-5 h-5 text-accent" /> Income & Deductions
          </h3>
          <Separator />
          <SummaryItem label="Gross Total Income" value={formatCurrency(incomeDetails.grossTotalIncome)} />
          <Separator />
          <SummaryItem label="Total Deductions" value={formatCurrency(deductions.totalDeductions)} />
          <Separator />
          <div className="flex justify-between items-center py-3">
              <p className="font-semibold">Net Taxable Income</p>
              <p className="font-bold text-lg text-primary">{formatCurrency(taxComputation.taxableIncome)}</p>
          </div>
        </div>

        <div>
          <h3 className="font-headline text-lg font-semibold flex items-center gap-2 mb-2">
            <ReceiptText className="w-5 h-5 text-accent" /> Tax Summary
          </h3>
          <Separator />
          <SummaryItem label="Tax before Cess" value={formatCurrency(taxComputation.taxBeforeCess)} />
          <Separator />
          <SummaryItem label="Rebate" value={formatCurrency(taxComputation.rebate)} />
          <Separator />
          <SummaryItem label="Total Tax Liability" value={formatCurrency(taxComputation.totalTaxLiability)} />
           <Separator />
          <SummaryItem label="Taxes Paid (TDS + Adv.)" value={formatCurrency(taxesPaid.tds + taxesPaid.advanceTax)} />
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-4 p-4 bg-muted/50 dark:bg-card-foreground/5 rounded-b-lg">
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
