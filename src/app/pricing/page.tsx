
"use client";

import React from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-provider';

const Check = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-green-500"><path d="M20 6 9 17l-5-5"/></svg>;
const ArrowLeft = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>;
const Gem = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 mx-auto mb-4 text-blue-600"><path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M12 22 6 9l-4-6h12l4 6"/><path d="M2 9h20"/></svg>;
const Star = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 mx-auto mb-4 text-blue-600"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const Building = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 mx-auto mb-4 text-blue-600"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>;


const tiers = [
    {
        name: 'Family',
        priceId: 'plan_OE9gbfiWb9nI7m',
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
        priceId: 'plan_OE9hFbf4P06p2i',
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
        priceId: 'plan_OE9hpchP0BwV7H',
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

        // Feature not implemented message
        toast({
            title: "Feature Coming Soon",
            description: "Subscription functionality is not yet implemented.",
        });
    };

    return (
        <div className="bg-gray-50 dark:bg-gray-900 py-12">
            <div className="container mx-auto max-w-7xl px-4">
                 <div className="mb-8">
                    <Link href="/" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                        <ArrowLeft /> Back to Dashboard
                    </Link>
                </div>
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold">Choose Your Plan</h1>
                    <p className="text-lg text-gray-500 dark:text-gray-400 mt-4 max-w-2xl mx-auto">
                        Unlock powerful features to streamline your tax workflow. All plans start with a 14-day free trial.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
                    {tiers.map((tier) => (
                        <div key={tier.name} className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-2xl transition-shadow duration-300 ${tier.highlight ? 'border-blue-600 border-2 -my-4' : ''}`}>
                            <div className="p-8 text-center">
                                {tier.icon && <tier.icon />}
                                <h2 className="text-3xl font-bold">{tier.name}</h2>
                                <p className="min-h-[40px] text-gray-500 dark:text-gray-400">{tier.description}</p>
                                <div className="flex items-baseline justify-center gap-1 mt-4">
                                    <span className="text-4xl font-bold">{tier.price}</span>
                                    <span className="text-gray-500 dark:text-gray-400">{tier.priceSuffix}</span>
                                </div>
                            </div>
                            <div className="p-8">
                                <ul className="space-y-3 text-center">
                                    {tier.features.map((feature, index) => (
                                        <li key={index} className="flex items-center justify-center gap-2">
                                            <Check />
                                            <span className="text-gray-500 dark:text-gray-400">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="p-8">
                                <button
                                    className={`w-full px-4 py-2 rounded-md font-bold ${tier.highlight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                                    onClick={() => handleSubscription(tier.priceId)}
                                >
                                    {tier.highlight ? 'Choose Pro' : 'Choose Plan'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                 <div className="text-center mt-12 text-gray-500 dark:text-gray-400">
                    <p>Looking for a custom solution? <Link href="/contact" className="text-blue-600 font-semibold hover:underline">Contact us</Link> for enterprise options.</p>
                </div>
            </div>
        </div>
    );
};

export default PricingPage;
