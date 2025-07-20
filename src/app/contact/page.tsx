
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Mail, Phone, MapPin } from 'lucide-react';
import Link from 'next/link';

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
        <div className="bg-muted/40 py-16">
            <div className="container mx-auto max-w-4xl px-4">
                <Card className="shadow-lg">
                    <CardHeader className="text-center">
                        <CardTitle className="text-4xl font-headline">Contact Us</CardTitle>
                        <CardDescription className="text-lg">
                            Have questions, feedback, or need support? We'd love to hear from you.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-12 p-8">
                        <div>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Your Name</Label>
                                    <Input id="name" name="name" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Your Email</Label>
                                    <Input id="email" name="email" type="email" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="subject">Subject</Label>
                                    <Input id="subject" name="subject" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="message">Message</Label>
                                    <Textarea id="message" name="message" rows={5} required />
                                </div>
                                <Button type="submit" className="w-full">
                                    Send Message
                                </Button>
                            </form>
                        </div>
                        <div className="flex flex-col justify-center space-y-6">
                            <h3 className="text-2xl font-headline font-semibold text-center">Other Ways to Reach Us</h3>
                            <div className="flex items-start gap-4">
                                <Mail className="w-6 h-6 text-primary mt-1" />
                                <div>
                                    <h4 className="font-semibold">Email</h4>
                                    <p className="text-muted-foreground">support@taxwise.app</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <Phone className="w-6 h-6 text-primary mt-1" />
                                <div>
                                    <h4 className="font-semibold">Phone</h4>
                                    <p className="text-muted-foreground">+91 98765 43210</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <MapPin className="w-6 h-6 text-primary mt-1" />
                                <div>
                                    <h4 className="font-semibold">Address</h4>
                                    <p className="text-muted-foreground">123 Tax Lane, Financial District, New Delhi, India</p>
                                </div>
                            </div>
                             <div className="text-center pt-4">
                                <Button variant="outline" asChild>
                                    <Link href="/">
                                        Back to Home
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ContactPage;
