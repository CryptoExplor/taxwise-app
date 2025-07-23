
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo, GoogleIcon } from "@/components/icons";


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();

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
             alert("Welcome! Your account has been created.");
        }
        router.push("/");

    } catch (err: any) {
        setError(err.message);
        alert(`Google Sign-In Error: ${err.message}`);
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
          name: name,
          email,
          plan: "free",
          createdAt: new Date(),
          usage: { clients: 0, reports: 0 },
        });
        alert("You have been successfully registered.");
        router.push("/");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message);
      alert(`Authentication Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <form onSubmit={handleSubmit}>
          <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-2 mb-4">
                <Logo className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">
              {isRegister ? "Create an Account" : "Welcome Back"}
            </CardTitle>
            <CardDescription>
              {isRegister
                ? "Enter your details below to start your journey."
                : "Sign in to access your TaxWise dashboard."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading || googleLoading}
                />
              </div>
            )}
            <div className="space-y-2">
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
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || googleLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button size="lg" type="submit" className="w-full font-bold" disabled={loading || googleLoading}>
              {loading ? "..." : isRegister ? "Create Account" : "Sign In"}
            </Button>
            
            <div className="relative w-full py-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">OR</span></div>
            </div>

            <Button variant="outline" type="button" className="w-full font-semibold" onClick={handleGoogleSignIn} disabled={loading || googleLoading}>
                {googleLoading ? "..." : <GoogleIcon />}
                Sign in with Google
            </Button>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              {isRegister ? "Already have an account?" : "Don’t have an account?"}{" "}
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
