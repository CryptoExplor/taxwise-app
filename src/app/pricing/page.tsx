
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ArrowLeft, Star, Gem, Building } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-provider';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const tiers = [
    {
        name: 'Family',
        priceId: 'plan_OE9gbfiWb9nI7m', // Replace with your actual Price ID from Razorpay
        price: '₹499',
        priceSuffix: '/year',
        description: 'For individuals and families managing multiple returns.',
        features: [
            'Up to 5 clients',
            'Unlimited ITR Analysis',
            'PDF & CSV Export',
            'AI-Powered Tax Tips',
            'Refresh AI Analysis',
        ],
        icon: Gem
    },
    {
        name: 'Pro',
        priceId: 'plan_OE9hFbf4P06p2i', // Replace with your actual Price ID from Razorpay
        price: '₹1,999',
        priceSuffix: '/year',
        description: 'Perfect for freelance tax preparers and small firms.',
        features: [
            'Up to 100 clients',
            'All Family features',
            'Priority Support',
            'Export Branding Options',
        ],
        highlight: true,
        icon: Star
    },
    {
        name: 'Agency',
        priceId: 'plan_OE9hpchP0BwV7H', // Replace with your actual Price ID from Razorpay
        price: '₹4,999',
        priceSuffix: '/year',
        description: 'For professional agencies with a large client base.',
        features: [
            'Unlimited clients',
            'All Pro features',
            'Team Member Access (Coming Soon)',
            'API Access (Coming Soon)',
        ],
        icon: Building
    },
];

const PricingPage = () => {
    const { toast } = useToast();
    const { user, userProfile } = useAuth();
    
    const handleSubscription = async (priceId: string) => {
        if (!user || !userProfile) {
            toast({
                variant: 'destructive',
                title: 'Authentication Error',
                description: 'You must be logged in to subscribe.',
            });
            return;
        }

        const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Use environment variable
            subscription_id: priceId,
            name: 'TaxWise Pro',
            description: 'Unlock premium features',
            image: 'https://example.com/your_logo.png', // Replace with your logo URL
            handler: function (response: any) {
                toast({
                    title: 'Payment Successful!',
                    description: `Your subscription is now active. Payment ID: ${response.razorpay_payment_id}`,
                });
                // Here you would typically verify the payment on your backend and update the user's plan in Firestore
            },
            prefill: {
                name: userProfile.name,
                email: userProfile.email,
                contact: userProfile.phone
            },
            notes: {
                address: userProfile.address,
                firebase_uid: user.uid,
            },
            theme: {
                color: '#3F51B5' // Your primary color
            }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
    };


    return (
        <div className="bg-muted/40 py-12">
            <div className="container mx-auto max-w-7xl px-4">
                 <div className="mb-8">
                    <Button variant="outline" asChild>
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                        </Link>
                    </Button>
                </div>
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-headline font-bold">Choose Your Plan</h1>
                    <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
                        Unlock powerful features to streamline your tax workflow. All plans start with a 14-day free trial.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
                    {tiers.map((tier) => (
                        <Card key={tier.name} className={`shadow-lg hover:shadow-2xl transition-shadow duration-300 ${tier.highlight ? 'border-primary border-2 -my-4' : ''}`}>
                            <CardHeader className="text-center">
                                {tier.icon && <tier.icon className="w-12 h-12 mx-auto mb-4 text-primary" />}
                                <CardTitle className="text-3xl font-headline">{tier.name}</CardTitle>
                                <CardDescription className="min-h-[40px]">{tier.description}</CardDescription>
                                <div className="flex items-baseline justify-center gap-1 mt-4">
                                    <span className="text-4xl font-bold">{tier.price}</span>
                                    <span className="text-muted-foreground">{tier.priceSuffix}</span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3 text-center">
                                    {tier.features.map((feature, index) => (
                                        <li key={index} className="flex items-center justify-center gap-2">
                                            <Check className="w-5 h-5 text-green-500" />
                                            <span className="text-muted-foreground">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    className="w-full"
                                    variant={tier.highlight ? 'default' : 'outline'}
                                    onClick={() => handleSubscription(tier.priceId)}
                                >
                                    {tier.highlight ? 'Choose Pro' : 'Choose Plan'}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
                 <div className="text-center mt-12 text-muted-foreground">
                    <p>Looking for a custom solution? <Link href="/contact" className="text-primary font-semibold hover:underline">Contact us</Link> for enterprise options.</p>
                </div>
            </div>
        </div>
    );
};

export default PricingPage;
