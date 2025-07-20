
"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { collection, addDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { UploadCloud, Loader, Download, Sparkles } from "lucide-react";
import type { ClientData, ClientDataToSave } from "@/lib/types";
import { parseITR } from "@/lib/itr-parser";
import { ClientCard } from "./client-card";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { exportClientsToCSV } from "@/lib/csv-exporter";
import { getTaxAnalysis, TaxAnalysisOutput } from "@/ai/flows/tax-analysis-flow";
import { useAuth } from "./auth-provider";
import { db } from "@/lib/firebase";

export function Dashboard() {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!user) return;
    
    setIsInitialLoading(true);
    const clientsCollectionRef = collection(db, `users/${user.uid}/clients`);
    const q = query(clientsCollectionRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clientsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ClientData[];
      setClients(clientsData);
      setIsInitialLoading(false);
    }, (error) => {
      console.error("Error fetching clients:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch client data from the database.",
      });
      setIsInitialLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !user) return;
    
    await processFiles(Array.from(files));
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const processFiles = async (files: File[]) => {
    setIsProcessing(true);
    const clientsCollectionRef = collection(db, `users/${user!.uid}/clients`);

    const newClientPromises = files.map(async (file) => {
      try {
        if (file.type !== "application/json") {
          toast({
            variant: "destructive",
            title: "Invalid File Type",
            description: `File ${file.name} is not a JSON file.`,
          });
          return;
        }
        
        const parsedData = await parseITR(file);
        
        // Save to firestore
        const docRef = await addDoc(clientsCollectionRef, parsedData);

        // Run AI analysis after saving, we don't need to block UI for this
        startTransition(() => {
            const { taxComputation, aiSummary, aiTips, ...aiInput } = parsedData;
            getTaxAnalysis(aiInput).then((aiResponse: TaxAnalysisOutput) => {
                // We don't update the doc here, as onSnapshot will do it.
                // In a more complex app, we'd update the doc in firestore,
                // and onSnapshot would handle the UI update. For now, we update local state for immediate feedback
                setClients(prev => prev.map(c => c.id === docRef.id ? { ...c, aiSummary: aiResponse.summary, aiTips: aiResponse.tips } : c));

            }).catch(err => {
                console.error("AI analysis failed for client:", docRef.id, err);
                toast({
                    variant: "destructive",
                    title: "AI Analysis Failed",
                    description: `Could not generate AI insights for ${parsedData.fileName}.`,
                });
            });
        });

      } catch (error) {
        console.error("Error processing file:", file.name, error);
        toast({
          variant: "destructive",
          title: "Processing Error",
          description: `Could not process file ${file.name}. ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
        return null;
      }
    });

    await Promise.all(newClientPromises);
    setIsProcessing(false);
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const UploadArea = () => (
    <div className="text-center flex flex-col items-center justify-center h-[calc(100vh-12rem)]">
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center w-full max-w-lg h-64 border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer bg-card hover:bg-muted transition-colors duration-200"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloud className="w-10 h-10 mb-4 text-accent" />
            <p className="mb-2 text-sm text-muted-foreground">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">ITR JSON files only</p>
          </div>
          <input id="file-upload" type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="application/json" multiple disabled={isProcessing} />
        </label>
        <h2 className="text-3xl font-headline font-bold mt-8 mb-2">Upload your ITR JSON</h2>
        <p className="text-muted-foreground max-w-md">
          Get an instant summary of your tax return, plus AI-powered insights. Secure, private, and fast.
        </p>
    </div>
  );

  const loadingState = (title: string, subtitle: string) => (
      <div className="text-center flex flex-col items-center justify-center h-[calc(100vh-12rem)]">
        <Loader className="h-16 w-16 text-primary animate-spin mb-4" />
        <h2 className="text-2xl font-headline font-semibold">{title}</h2>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
  );
  
  if (isInitialLoading) {
    return loadingState("Loading Dashboard...", "Please wait while we fetch your saved clients.");
  }


  return (
    <div className="container mx-auto px-4 py-8">
      {clients.length > 0 && (
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4 p-4 rounded-lg bg-card border">
          <h2 className="text-2xl font-headline font-bold flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-accent" />
            Tax Dashboard
          </h2>
          <div className="flex gap-2">
             <Button onClick={handleUploadClick} disabled={isProcessing}>
                <UploadCloud className="mr-2 h-4 w-4" />
                Upload More
            </Button>
            <Button variant="outline" onClick={() => exportClientsToCSV(clients)} disabled={clients.length === 0 || isProcessing}>
                <Download className="mr-2 h-4 w-4" />
                Export All as CSV
            </Button>
          </div>
        </div>
      )}

      {clients.length === 0 && !isProcessing && <UploadArea />}

      {isProcessing && clients.length === 0 && (
        loadingState("Processing your returns...", "Please wait while we compute your tax summary.")
      )}

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {clients.map((client) => (
          <ClientCard key={client.id} client={client} />
        ))}
        {isProcessing && clients.length > 0 && (
          <div className="text-center flex flex-col items-center justify-center rounded-lg border border-dashed p-8 md:col-span-1 lg:col-span-2">
              <Loader className="h-12 w-12 text-primary animate-spin mb-4" />
              <h2 className="text-xl font-headline font-semibold">Processing new returns...</h2>
              <p className="text-muted-foreground">Adding more summaries to your dashboard.</p>
          </div>
        )}
      </div>
    </div>
  );
}
