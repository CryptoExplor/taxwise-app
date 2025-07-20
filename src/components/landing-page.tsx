
"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Bot, BarChart, ShieldCheck, UploadCloud } from "lucide-react";

export function LandingPage() {
    
    const features = [
        {
            icon: <UploadCloud className="w-8 h-8 text-primary" />,
            title: "Effortless ITR Upload",
            description: "Simply upload your ITR JSON file. We handle the rest, parsing and organizing your data in seconds.",
        },
        {
            icon: <BarChart className="w-8 h-8 text-primary" />,
            title: "Instant Summary Dashboard",
            description: "Visualize your tax situation with a clean, comprehensive dashboard. See your income, deductions, and liability at a glance.",
        },
        {
            icon: <Bot className="w-8 h-8 text-primary" />,
            title: "AI-Powered Insights",
            description: "Receive personalized, actionable tips from our AI to help you save on taxes and optimize your financial health.",
        },
        {
            icon: <ShieldCheck className="w-8 h-8 text-primary" />,
            title: "Secure & Private",
            description: "Your data is yours. We use secure authentication and data handling to ensure your information remains confidential.",
        },
    ];

    return (
        <div className="flex flex-col">
            {/* Hero Section */}
            <section className="py-20 md:py-32 bg-muted/20">
                <div className="container mx-auto text-center px-4">
                    <h1 className="text-4xl md:text-6xl font-headline font-bold mb-4">
                        Smart ITR Analysis, Simplified.
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                        Stop guessing. Upload your ITR JSON to get instant tax computation, a beautiful summary dashboard, and AI-driven insights to maximize your savings.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Button asChild size="lg">
                            <Link href="/login">Get Started for Free</Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 md:py-28">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                         <h2 className="text-3xl md:text-4xl font-headline font-bold">Why Choose TaxWise?</h2>
                         <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                            Everything you need to understand your tax return and plan for the future.
                         </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((feature, index) => (
                           <Card key={index} className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
                               <CardHeader>
                                   <div className="mx-auto bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                                      {feature.icon}
                                   </div>
                                   <CardTitle className="font-headline text-xl">{feature.title}</CardTitle>
                               </CardHeader>
                               <CardContent>
                                   <p className="text-muted-foreground">{feature.description}</p>
                               </CardContent>
                           </Card>
                        ))}
                    </div>
                </div>
            </section>
            
            {/* How it Works Section */}
            <section className="py-20 md:py-28 bg-muted/20">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                         <h2 className="text-3xl md:text-4xl font-headline font-bold">Simple Steps to Clarity</h2>
                         <p className="text-muted-foreground mt-2">Get your complete tax breakdown in minutes.</p>
                    </div>
                    <div className="relative">
                        {/* The connecting line */}
                        <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2"></div>
                        
                        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12">
                            <div className="text-center">
                                <div className="relative mb-4">
                                    <div className="mx-auto w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">1</div>
                                </div>
                                <h3 className="text-xl font-semibold mb-2">Upload Your ITR</h3>
                                <p className="text-muted-foreground">Securely upload the JSON file you downloaded from the official tax portal.</p>
                            </div>
                             <div className="text-center">
                                <div className="relative mb-4">
                                    <div className="mx-auto w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">2</div>
                                </div>
                                <h3 className="text-xl font-semibold mb-2">Get Instant Analysis</h3>
                                <p className="text-muted-foreground">Our app automatically computes your taxes and generates a detailed summary.</p>
                            </div>
                             <div className="text-center">
                                <div className="relative mb-4">
                                    <div className="mx-auto w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">3</div>
                                </div>
                                <h3 className="text-xl font-semibold mb-2">Receive AI Insights</h3>
                                <p className="text-muted-foreground">Discover personalized tips to optimize your tax savings for next year.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>


            {/* Final CTA Section */}
            <section className="py-20">
                <div className="container mx-auto text-center px-4">
                    <h2 className="text-3xl md:text-4xl font-headline font-bold mb-4">
                        Ready to Take Control of Your Taxes?
                    </h2>
                    <p className="text-muted-foreground mb-8">
                        Sign up today and get the clarity you deserve.
                    </p>
                    <Button asChild size="lg">
                        <Link href="/login">Start Now for Free</Link>
                    </Button>
                </div>
            </section>
            
             {/* Footer */}
            <footer className="py-6 border-t bg-muted/50">
                <div className="container mx-auto flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
                    <span>© {new Date().getFullYear()} TaxWise. All Rights Reserved.</span>
                    <div className="flex gap-4 mt-4 md:mt-0">
                        <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
                        <Link href="/profile" className="hover:text-primary transition-colors">Profile</Link>
                        <Link href="/calculator" className="hover:text-primary transition-colors">Calculator</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
