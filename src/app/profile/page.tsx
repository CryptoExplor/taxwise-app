
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader, User, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface UserProfile {
    email: string;
    name: string;
    pan: string;
    phone: string;
    address: string;
}

const ProfilePage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const fetchProfile = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                const data = userDoc.data();
                setProfile({
                    email: data.email || '',
                    name: data.name || '',
                    pan: data.pan || '',
                    phone: data.phone || '',
                    address: data.address || '',
                });
            } else {
                // If doc doesn't exist, create it with default values
                const newProfile = {
                    email: user.email || '',
                    name: user.displayName || '',
                    pan: '',
                    phone: '',
                    address: '',
                };
                await setDoc(userDocRef, newProfile);
                setProfile(newProfile);
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to fetch your profile data.',
            });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!profile) return;
        const { name, value } = e.target;
        setProfile({ ...profile, [name]: value });
    };

    const handleSave = async () => {
        if (!user || !profile) return;
        setIsSaving(true);
        try {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                name: profile.name,
                pan: profile.pan,
                phone: profile.phone,
                address: profile.address,
            });
            toast({
                title: 'Success',
                description: 'Your profile has been updated.',
            });
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating profile:", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to update your profile.',
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!profile) {
        return (
             <div className="flex items-center justify-center min-h-screen bg-background text-center">
                <div>
                    <p className="text-lg text-destructive">Could not load profile.</p>
                    <Link href="/">
                        <Button variant="outline" className="mt-4">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back Home
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto max-w-3xl py-12 px-4">
             <div className="mb-8">
                <Link href="/">
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Button>
                </Link>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <User className="h-10 w-10 text-primary" />
                        <div>
                            <CardTitle className="text-3xl font-headline">My Profile</CardTitle>
                            <CardDescription>View and manage your personal information.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" name="name" value={profile.name} onChange={handleChange} disabled={!isEditing || isSaving} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input id="email" name="email" value={profile.email} disabled />
                             <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="pan">PAN Card</Label>
                            <Input id="pan" name="pan" value={profile.pan} onChange={handleChange} disabled={!isEditing || isSaving} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input id="phone" name="phone" value={profile.phone} onChange={handleChange} disabled={!isEditing || isSaving} />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea id="address" name="address" value={profile.address} onChange={handleChange} disabled={!isEditing || isSaving} />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    {isEditing ? (
                        <>
                            <Button variant="ghost" onClick={() => { setIsEditing(false); fetchProfile(); }} disabled={isSaving}>Cancel</Button>
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </>
                    ) : (
                        <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
};

export default ProfilePage;
