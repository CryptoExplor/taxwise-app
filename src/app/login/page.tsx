
"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/icons";
import { Loader } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
        <title>Google</title>
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.3 1.62-3.96 1.62-3.33 0-6.03-2.73-6.03-6.03s2.7-6.03 6.03-6.03c1.87 0 3.13.79 3.84 1.48l2.84-2.78C18.43 2.37 15.82 1.25 12.48 1.25c-5.47 0-9.9 4.43-9.9 9.9s4.43 9.9 9.9 9.9c5.22 0 9.4-3.53 9.4-9.65 0-.6-.07-1.12-.17-1.65z" fill="currentColor"></path>
    </svg>
);


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            await setDoc(userDocRef, {
                email: user.email,
                name: user.displayName,
                plan: "free",
                createdAt: new Date(),
                usage: { clients: 0, reports: 0 },
            });
             toast({
                title: "Account Created",
                description: "Welcome! Your account has been created.",
            });
        }
        router.push("/");

    } catch (err: any) {
        setError(err.message);
        toast({
            variant: "destructive",
            title: "Google Sign-In Error",
            description: err.message,
        });
    } finally {
        setGoogleLoading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        const userCred = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const uid = userCred.user.uid;
        await setDoc(doc(db, "users", uid), {
          email,
          plan: "free",
          createdAt: new Date(),
          usage: { clients: 0, reports: 0 },
        });
        toast({
          title: "Account Created",
          description: "You have been successfully registered.",
        });
        router.push("/");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/80 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <form onSubmit={handleSubmit}>
          <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-2 mb-4">
                <Logo className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-3xl font-headline font-bold">
              {isRegister ? "Create an Account" : "Welcome Back"}
            </CardTitle>
            <CardDescription className="pt-2">
              {isRegister
                ? "Enter your details below to start your journey."
                : "Sign in to access your TaxWise dashboard."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-2 text-left">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || googleLoading}
              />
            </div>
            <div className="space-y-2 text-left">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || googleLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 p-6 pt-0">
            <Button size="lg" type="submit" className="w-full font-bold" disabled={loading || googleLoading}>
              {loading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              {loading
                ? isRegister
                  ? "Creating Account..."
                  : "Signing In..."
                : isRegister
                ? "Create Account"
                : "Sign In"}
            </Button>
            
            <div className="relative w-full py-2">
                <Separator />
                <span className="absolute left-1/2 -translate-x-1/2 -top-0.5 bg-card px-2 text-xs text-muted-foreground">OR</span>
            </div>

            <Button variant="outline" size="lg" type="button" className="w-full font-semibold" onClick={handleGoogleSignIn} disabled={loading || googleLoading}>
                {googleLoading ? (
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <GoogleIcon className="mr-2 h-5 w-5" />
                )}
                Sign in with Google
            </Button>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              {isRegister
                ? "Already have an account?"
                : "Don’t have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError("");
                }}
                className="font-semibold text-primary underline-offset-4 hover:underline"
                disabled={loading || googleLoading}
              >
                {isRegister ? "Sign in" : "Sign up"}
              </button>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
