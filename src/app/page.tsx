import { Dashboard } from "@/components/dashboard";
import { Logo } from "@/components/icons";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <div className="mr-4 flex items-center">
            <Logo className="h-8 w-8 mr-2 text-primary" />
            <h1 className="text-2xl font-bold font-headline">TaxWise</h1>
          </div>
        </div>
      </header>
      <main className="flex-grow">
        <Dashboard />
      </main>
    </div>
  );
}
