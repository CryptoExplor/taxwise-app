
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { db } from '@/lib/firebase';
import Link from 'next/link';

const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-blue-600"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const ArrowLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>;

interface UserProfile {
    email: string;
    name: string;
    pan: string;
    phone: string;
    address: string;
}

const ProfilePage = () => {
    const { user } = useAuth();
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
                // If doc doesn't exist, create it with default values for non-anonymous users
                 if (!user.isAnonymous) {
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
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
            alert('Failed to fetch your profile data.');
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!profile) return;
        const { name, value } = e.target;
        setProfile({ ...profile, [name]: value });
    };

    const handleSave = async () => {
        if (!user || !profile || user.isAnonymous) {
            alert('Cannot save profile for anonymous user.');
            return;
        };
        setIsSaving(true);
        try {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                name: profile.name,
                pan: profile.pan,
                phone: profile.phone,
                address: profile.address,
            });
            alert('Your profile has been updated.');
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating profile:", error);
            alert('Failed to update your profile.');
        } finally {
            setIsSaving(false);
        }
    };
    
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }
    
    if (!profile) {
        return (
             <div className="flex items-center justify-center min-h-screen bg-background text-center">
                <div>
                    <p className="text-lg text-red-500">Could not load profile. You might be logged in as an anonymous user.</p>
                    <Link href="/login">
                       <button className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <ArrowLeftIcon /> Go to Login
                        </button>
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto max-w-3xl py-12 px-4">
             <div className="mb-8">
                <Link href="/" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <ArrowLeftIcon /> Back to Dashboard
                </Link>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <div className="p-6">
                    <div className="flex items-center gap-4">
                        <UserIcon />
                        <div>
                            <h1 className="text-3xl font-bold">My Profile</h1>
                            <p className="text-gray-500 dark:text-gray-400">View and manage your personal information.</p>
                        </div>
                    </div>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label htmlFor="name" className="block text-sm font-medium">Full Name</label>
                            <input id="name" name="name" value={profile.name} onChange={handleChange} disabled={!isEditing || isSaving} className="w-full px-3 py-2 border rounded-md" />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="email" className="block text-sm font-medium">Email Address</label>
                            <input id="email" name="email" value={profile.email} disabled className="w-full px-3 py-2 border rounded-md bg-gray-100 dark:bg-gray-700" />
                             <p className="text-xs text-gray-400">Email cannot be changed.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label htmlFor="pan" className="block text-sm font-medium">PAN Card</label>
                            <input id="pan" name="pan" value={profile.pan} onChange={handleChange} disabled={!isEditing || isSaving} className="w-full px-3 py-2 border rounded-md" />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="phone" className="block text-sm font-medium">Phone Number</label>
                            <input id="phone" name="phone" value={profile.phone} onChange={handleChange} disabled={!isEditing || isSaving} className="w-full px-3 py-2 border rounded-md" />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <label htmlFor="address" className="block text-sm font-medium">Address</label>
                        <textarea id="address" name="address" value={profile.address} onChange={handleChange} disabled={!isEditing || isSaving} className="w-full px-3 py-2 border rounded-md" />
                    </div>
                </div>
                <div className="p-6 flex justify-end gap-2">
                    {isEditing ? (
                        <>
                            <button className="px-4 py-2 border rounded-md" onClick={() => { setIsEditing(false); fetchProfile(); }} disabled={isSaving}>Cancel</button>
                            <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700">Edit Profile</button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
