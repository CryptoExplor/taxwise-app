
"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc } from "firebase/firestore";
import { UploadCloud, Loader, Download, Sparkles, BarChart, FileText } from "lucide-react";
import type { ClientData } from "@/lib/types";
import { parseITR } from "@/lib/itr-parser";
import { ClientCard } from "./client-card";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { exportClientsToCSV } from "@/lib/csv-exporter";
import { getTaxAnalysis, TaxAnalysisOutput } from "@/ai/flows/tax-analysis-flow";
import { useAuth } from "./auth-provider";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function Dashboard() {
  const { user, userProfile } = useAuth();
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!user) {
       setIsInitialLoading(false);
       return;
    }
    
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
            getTaxAnalysis(aiInput).then(async (aiResponse: TaxAnalysisOutput) => {
                await updateDoc(doc(db, `users/${user!.uid}/clients`, docRef.id), {
                    aiSummary: aiResponse.summary,
                    aiTips: aiResponse.tips
                });

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
    <div className="text-center flex flex-col items-center justify-center min-h-[40vh] bg-background rounded-lg border-2 border-dashed border-border p-8">
        <UploadCloud className="w-16 h-16 mb-4 text-accent" />
        <h2 className="text-3xl font-headline font-bold mt-4 mb-2">Upload your ITR JSON</h2>
        <p className="text-muted-foreground max-w-md mb-6">
          Get an instant summary of your tax return, plus AI-powered insights. Secure, private, and fast.
        </p>
        <Button size="lg" onClick={handleUploadClick} disabled={isProcessing}>
          <UploadCloud className="mr-2 h-5 w-5" />
          {isProcessing ? "Processing..." : "Select Files"}
        </Button>
    </div>
  );

  const loadingState = (title: string, subtitle: string) => (
      <div className="text-center flex flex-col items-center justify-center min-h-[40vh] bg-background rounded-lg border-2 border-dashed border-border p-8">
        <Loader className="h-16 w-16 text-primary animate-spin mb-4" />
        <h2 className="text-2xl font-headline font-semibold">{title}</h2>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
  );
  
  if (isInitialLoading) {
    return (
        <div className="container mx-auto px-4 py-8">
            {loadingState("Loading Dashboard...", "Please wait while we fetch your saved clients.")}
        </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4 p-4 rounded-lg bg-card border">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-accent" />
            <div>
              <h2 className="text-3xl font-headline font-bold">Welcome, {userProfile?.name || user?.email}</h2>
              <p className="text-muted-foreground">You have {clients.length} client{clients.length !== 1 ? 's' : ''} saved.</p>
            </div>
          </div>
          {clients.length > 0 && (
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
          )}
        </div>

      <input id="file-upload-main" type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="application/json" multiple disabled={isProcessing} />

      {clients.length === 0 && !isProcessing && <UploadArea />}

      {isProcessing && clients.length === 0 && (
        loadingState("Processing your returns...", "Please wait while we compute your tax summary.")
      )}

      {clients.length > 0 && (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {clients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
          
          <Card className="lg:col-span-2">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-headline text-xl">
                      <BarChart className="w-5 h-5" />
                      Usage Summary
                  </CardTitle>
              </CardHeader>
              <CardContent>
                  <ul className="list-disc pl-5 space-y-3 text-muted-foreground">
                      <li>
                          <span className="font-semibold text-foreground">{clients.length}</span> Clients added
                      </li>
                      <li className="capitalize">
                          Current Plan: <span className="font-semibold text-foreground">{userProfile?.plan || 'Free'}</span>
                      </li>
                       <li>
                          <span className="font-semibold text-foreground">{clients.length}</span> Reports generated
                      </li>
                  </ul>
              </CardContent>
          </Card>

          {isProcessing && clients.length > 0 && (
            <div className="text-center flex flex-col items-center justify-center rounded-lg border border-dashed p-8 md:col-span-1 lg:col-span-2">
                <Loader className="h-12 w-12 text-primary animate-spin mb-4" />
                <h2 className="text-xl font-headline font-semibold">Processing new returns...</h2>
                <p className="text-muted-foreground">Adding more summaries to your dashboard.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
