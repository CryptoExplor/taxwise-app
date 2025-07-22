
"use client";

import React from 'react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const Mail = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-blue-600 mt-1"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>;
const Phone = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-blue-600 mt-1"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const MapPin = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-blue-600 mt-1"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;


const ContactPage = () => {
    const { toast } = useToast();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        toast({
            title: "Feature Coming Soon",
            description: "The contact form is not yet active. Please use the email provided below.",
        });
    };

    return (
        <div className="bg-gray-50 dark:bg-gray-900 py-16">
            <div className="container mx-auto max-w-4xl px-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                    <div className="text-center p-8">
                        <h1 className="text-4xl font-bold">Contact Us</h1>
                        <p className="text-lg text-gray-600 dark:text-gray-400">
                            Have questions, feedback, or need support? We'd love to hear from you.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-12 p-8">
                        <div>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label htmlFor="name" className="block text-sm font-medium">Your Name</label>
                                    <input id="name" name="name" required className="w-full px-3 py-2 border rounded-md" />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="email" className="block text-sm font-medium">Your Email</label>
                                    <input id="email" name="email" type="email" required className="w-full px-3 py-2 border rounded-md" />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="subject" className="block text-sm font-medium">Subject</label>
                                    <input id="subject" name="subject" required className="w-full px-3 py-2 border rounded-md" />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="message" className="block text-sm font-medium">Message</label>
                                    <textarea id="message" name="message" rows={5} required className="w-full px-3 py-2 border rounded-md" />
                                </div>
                                <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700">
                                    Send Message
                                </button>
                            </form>
                        </div>
                        <div className="flex flex-col justify-center space-y-6">
                            <h3 className="text-2xl font-semibold text-center">Other Ways to Reach Us</h3>
                            <div className="flex items-start gap-4">
                                <Mail />
                                <div>
                                    <h4 className="font-semibold">Email</h4>
                                    <p className="text-gray-500 dark:text-gray-400">ravikumar699121@gmail.com</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <Phone />
                                <div>
                                    <h4 className="font-semibold">Phone</h4>
                                    <p className="text-gray-500 dark:text-gray-400">+91 98765 43210</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <MapPin />
                                <div>
                                    <h4 className="font-semibold">Address</h4>
                                    <p className="text-gray-500 dark:text-gray-400">123 Tax Lane, Financial District, New Delhi, India</p>
                                </div>
                            </div>
                             <div className="text-center pt-4">
                                <Link href="/" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                                    Back to Home
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;
