
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

const Logo = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 text-blue-600"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
);
const GoogleIcon = () => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5"><title>Google</title><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.3 1.62-3.96 1.62-3.33 0-6.03-2.73-6.03-6.03s2.7-6.03 6.03-6.03c1.87 0 3.13.79 3.84 1.48l2.84-2.78C18.43 2.37 15.82 1.25 12.48 1.25c-5.47 0-9.9 4.43-9.9 9.9s4.43 9.9 9.9 9.9c5.22 0 9.4-3.53 9.4-9.65 0-.6-.07-1.12-.17-1.65z" fill="currentColor"></path></svg>
);

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
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md shadow-2xl rounded-lg bg-white dark:bg-gray-800">
        <form onSubmit={handleSubmit}>
          <div className="p-6 text-center">
            <div className="flex justify-center items-center gap-2 mb-4">
                <Logo />
            </div>
            <h2 className="text-3xl font-bold">
              {isRegister ? "Create an Account" : "Welcome Back"}
            </h2>
            <p className="pt-2 text-gray-500 dark:text-gray-400">
              {isRegister
                ? "Enter your details below to start your journey."
                : "Sign in to access your TaxWise dashboard."}
            </p>
          </div>
          <div className="p-6 space-y-6">
            {isRegister && (
              <div className="space-y-2 text-left">
                <label htmlFor="name" className="block text-sm font-medium">Full Name</label>
                <input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading || googleLoading}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            )}
            <div className="space-y-2 text-left">
              <label htmlFor="email" className="block text-sm font-medium">Email</label>
              <input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || googleLoading}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div className="space-y-2 text-left">
              <label htmlFor="password" className="block text-sm font-medium">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || googleLoading}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
          <div className="p-6 pt-0 flex flex-col gap-4">
            <button size="lg" type="submit" className="w-full font-bold px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400" disabled={loading || googleLoading}>
              {loading ? "..." : isRegister ? "Create Account" : "Sign In"}
            </button>
            
            <div className="relative w-full py-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">OR</span></div>
            </div>

            <button type="button" className="w-full font-semibold px-4 py-2.5 border rounded-md flex items-center justify-center disabled:opacity-50" onClick={handleGoogleSignIn} disabled={loading || googleLoading}>
                {googleLoading ? "..." : <GoogleIcon />}
                Sign in with Google
            </button>

            <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
              {isRegister ? "Already have an account?" : "Don’t have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError("");
                }}
                className="font-semibold text-blue-600 underline-offset-4 hover:underline"
                disabled={loading || googleLoading}
              >
                {isRegister ? "Sign in" : "Sign up"}
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
