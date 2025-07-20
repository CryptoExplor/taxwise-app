"use client";

import { useState, useRef, useTransition } from "react";
import { UploadCloud, Loader, FileText, Download, Sparkles } from "lucide-react";
import { ClientData } from "@/lib/types";
import { parseITR } from "@/lib/itr-parser";
import { computeTax } from "@/lib/tax-calculator";
import { ClientCard } from "./client-card";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { exportClientsToCSV } from "@/lib/csv-exporter";
import { getTaxAnalysis } from "@/ai/flows/tax-analysis-flow";

export function Dashboard() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setIsAnalyzing(true);
    startTransition(async () => {
      const newClients: ClientData[] = [];
      for (const file of Array.from(files)) {
        try {
          if (file.type !== "application/json") {
            throw new Error(`File ${file.name} is not a JSON file.`);
          }
          const parsedData = await parseITR(file);
          const taxableIncome = Math.max(0, parsedData.incomeDetails.grossTotalIncome - parsedData.deductions.totalDeductions);
          const taxComputationResult = computeTax(taxableIncome, parsedData.personalInfo.age, parsedData.taxRegime);

          const totalTaxPaid = parsedData.taxesPaid.tds + parsedData.taxesPaid.advanceTax;
          const finalAmount = taxComputationResult.totalTaxLiability - totalTaxPaid;
          
          const clientForAI: Omit<ClientData, 'id' | 'taxComputation' | 'aiSummary' | 'aiTips'> = {
            ...parsedData
          };

          const aiResponse = await getTaxAnalysis(clientForAI);
          
          const newClient: ClientData = {
            ...parsedData,
            id: `${file.name}-${new Date().getTime()}`,
            taxComputation: {
              ...taxComputationResult,
              netTaxPayable: Math.max(0, finalAmount),
              refund: Math.max(0, -finalAmount),
            },
            aiSummary: aiResponse.summary,
            aiTips: aiResponse.tips,
          };
          newClients.push(newClient);
        } catch (error) {
          console.error("Error processing file:", file.name, error);
          toast({
            variant: "destructive",
            title: "Processing Error",
            description: `Could not process file ${file.name}. ${error instanceof Error ? error.message : ''}`,
          });
        }
      }
      setClients(prevClients => [...prevClients, ...newClients]);
      setIsAnalyzing(false);
    });

    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const currentLoaderState = isPending && isAnalyzing;

  return (
    <div className="container mx-auto px-4 py-8">
      {clients.length === 0 && !currentLoaderState && (
        <div className="text-center flex flex-col items-center justify-center h-[calc(100vh-12rem)]">
          <UploadCloud className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-3xl font-headline font-bold mb-2">Upload your ITR JSON</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Get an instant, easy-to-understand summary of your tax return, plus AI-powered insights. Secure, private, and fast.
          </p>
          <Button size="lg" onClick={handleUploadClick}>
            <FileText className="mr-2 h-5 w-5" />
            Select ITR JSON File
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="application/json"
            multiple
            className="hidden"
          />
        </div>
      )}

      {currentLoaderState && (
         <div className="text-center flex flex-col items-center justify-center h-[calc(100vh-12rem)]">
            <Loader className="h-16 w-16 text-primary animate-spin mb-4" />
            <h2 className="text-2xl font-headline font-semibold">Analyzing your returns...</h2>
            <p className="text-muted-foreground">Please wait while we compute your tax summary and generate AI insights.</p>
         </div>
      )}

      {clients.length > 0 && (
        <>
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <h2 className="text-3xl font-headline font-bold flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-accent" />
            AI-Powered Tax Dashboard
          </h2>
          <div className="flex gap-2">
             <Button onClick={handleUploadClick} disabled={currentLoaderState}>
                <UploadCloud className="mr-2 h-4 w-4" />
                Upload More
            </Button>
            <Button variant="outline" onClick={() => exportClientsToCSV(clients)} disabled={currentLoaderState}>
                <Download className="mr-2 h-4 w-4" />
                Export All as CSV
            </Button>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="application/json"
                multiple
                className="hidden"
            />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {clients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
          {currentLoaderState && (
            <div className="text-center flex flex-col items-center justify-center rounded-lg border border-dashed p-8 lg:col-span-2">
                <Loader className="h-12 w-12 text-primary animate-spin mb-4" />
                <h2 className="text-xl font-headline font-semibold">Analyzing new returns...</h2>
                <p className="text-muted-foreground">Adding more summaries to your dashboard.</p>
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );
}
