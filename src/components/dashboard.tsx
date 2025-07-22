
"use client";

import { useState, useRef, useTransition, useEffect, useMemo } from "react";
import { collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc } from "firebase/firestore";
import { UploadCloud, Loader, Download, Sparkles, BarChart, FileText, PlusCircle, Search } from "lucide-react";
import type { ClientData } from "@/lib/types";
import { parseITR } from "@/lib/itr-parser";
import { ClientCard } from "./client-card";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { exportClientsToCSV } from "@/lib/csv-exporter";
import { getTaxAnalysis, TaxAnalysisOutput } from "@/ai/flows/tax-analysis-flow";
import { useAuth } from "./auth-provider";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "./ui/card";
import { computeTax } from "@/lib/tax-calculator";
import { v4 as uuidv4 } from 'uuid';
import { Input } from "./ui/input";

export function Dashboard() {
  const { user, userProfile } = useAuth();
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");

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
      setClients(clientsData.filter(c => c.id));
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
  
  const filteredClients = useMemo(() => {
    if (!searchQuery) return clients;
    return clients.filter(client => 
        client.personalInfo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.personalInfo.pan.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [clients, searchQuery]);


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
        
        const docRef = await addDoc(clientsCollectionRef, parsedData);

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

  const handleNewManualComputation = () => {
      const emptyTaxComputation = computeTax(0, 30, 'New', '2024-25', {
          salary: 0, houseProperty: 0, businessIncome: 0,
          capitalGains: { shortTerm: 0, longTerm: 0, stcg: { purchase: 0, sale: 0, expenses: 0 }, ltcg: { purchase: 0, sale: 0, expenses: 0 } },
          otherSources: 0, grossTotalIncome: 0 
      }, 0);
      
      const newClient: ClientData = {
          id: `temp-${uuidv4()}`,
          fileName: "Manual Entry",
          createdAt: new Date() as any,
          personalInfo: {
              name: "New Manual Client",
              pan: "ABCDE1234F",
              assessmentYear: "2024-25",
              age: 30,
              itrForm: 'Manual'
          },
          incomeDetails: { 
              salary: 0, houseProperty: 0, businessIncome: 0, 
              capitalGains: { shortTerm: 0, longTerm: 0, stcg: { purchase: 0, sale: 0, expenses: 0 }, ltcg: { purchase: 0, sale: 0, expenses: 0 } },
              otherSources: 0, grossTotalIncome: 0 
          },
          deductions: { section80C: 0, section80D: 0, totalDeductions: 0 },
          taxesPaid: { tds: 0, selfAssessmentTax: 0, advanceTax: 0, totalTaxPaid: 0 },
          taxRegime: 'New',
          taxComputation: { ...emptyTaxComputation, netTaxPayable: 0, refund: 0 },
          taxComparison: { oldRegime: emptyTaxComputation, newRegime: emptyTaxComputation },
          aiSummary: 'Enter details to get insights.',
          aiTips: []
      };
      
      setClients(prev => [newClient, ...prev]);
  };
  
  const handleClientDelete = (clientId: string) => {
    setClients(prevClients => prevClients.filter(client => client.id !== clientId));
  };
  
  const handleClientSave = (savedClient: ClientData) => {
    setClients(prevClients => prevClients.map(c => c.id === savedClient.id ? savedClient : c));
  }


  const UploadArea = () => (
    <div className="text-center flex flex-col items-center justify-center min-h-[40vh] bg-background rounded-lg border-2 border-dashed border-border p-8">
        <UploadCloud className="w-16 h-16 mb-4 text-accent" />
        <h2 className="text-3xl font-headline font-bold mt-4 mb-2">Upload your ITR JSON</h2>
        <p className="text-muted-foreground max-w-md mb-6">
          Or start a new manual computation to plan your taxes for the upcoming year.
        </p>
        <div className="flex gap-4">
            <Button size="lg" onClick={handleUploadClick} disabled={isProcessing}>
                <UploadCloud className="mr-2 h-5 w-5" />
                {isProcessing ? "Processing..." : "Select Files"}
            </Button>
            <Button size="lg" variant="outline" onClick={handleNewManualComputation} disabled={isProcessing}>
                <PlusCircle className="mr-2 h-5 w-5" />
                Manual Computation
            </Button>
        </div>
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
              <p className="text-muted-foreground">You have {clients.filter(c=>!c.id.startsWith('temp')).length} client{clients.length !== 1 ? 's' : ''} saved.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {clients.length > 0 && (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        type="text"
                        placeholder="Search by Name or PAN..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-64"
                    />
                </div>
            )}
            <div className="flex gap-2">
              <Button onClick={handleNewManualComputation} disabled={isProcessing}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Computation
              </Button>
              <Button variant="outline" onClick={() => exportClientsToCSV(clients)} disabled={clients.length === 0 || isProcessing}>
                  <Download className="mr-2 h-4 w-4" />
                  Export All as CSV
              </Button>
            </div>
          </div>
        </div>

      <input id="file-upload-main" type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="application/json" multiple disabled={isProcessing} />

      {clients.length === 0 && !isProcessing && <UploadArea />}

      {isProcessing && clients.length === 0 && (
        loadingState("Processing your returns...", "Please wait while we compute your tax summary.")
      )}

      {filteredClients.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {filteredClients.map((client) => (
            <ClientCard key={client.id} client={client} onDelete={handleClientDelete} onSave={handleClientSave} />
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
                          <span className="font-semibold text-foreground">{clients.filter(c=>!c.id.startsWith('temp')).length}</span> Clients added
                      </li>
                      <li className="capitalize">
                          Current Plan: <span className="font-semibold text-foreground">{userProfile?.plan || 'Free'}</span>
                      </li>
                       <li>
                          <span className="font-semibold text-foreground">{clients.filter(c=>!c.id.startsWith('temp')).length}</span> Reports generated
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
      ) : (
        clients.length > 0 && (
            <div className="text-center flex flex-col items-center justify-center min-h-[40vh] bg-background rounded-lg border-2 border-dashed border-border p-8">
                <Search className="w-16 h-16 mb-4 text-muted-foreground" />
                <h2 className="text-2xl font-headline font-bold mt-4 mb-2">No Clients Found</h2>
                <p className="text-muted-foreground max-w-md mb-6">
                  Your search for "{searchQuery}" did not match any clients.
                </p>
                <Button variant="outline" onClick={() => setSearchQuery('')}>Clear Search</Button>
            </div>
        )
      )}
    </div>
  );
}
