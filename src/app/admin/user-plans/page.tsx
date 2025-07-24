
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";


interface User {
  id: string;
  email?: string;
  plan?: string;
  role?: 'user' | 'employee' | 'admin';
  usage?: {
    clients: number;
    reports: number;
  };
}

export default function UserPlansPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    setStatus("");
    try {
      const userSnap = await getDocs(collection(db, "users"));
      const data = userSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];
      setUsers(data);
    } catch (error) {
      console.error("Error loading users:", error);
      setStatus("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (currentUser) {
        loadUsers();
    }
  }, [currentUser]);


  const handlePlanChange = async (userId: string, newPlan: string) => {
    if (!userId || !newPlan) {
      alert("Invalid user or plan selected.");
      return;
    }
    setUpdating(userId);
    setStatus("");
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { plan: newPlan });
      setStatus(`Plan updated successfully for user ${userId}.`);
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === userId ? { ...u, plan: newPlan } : u))
      );
    } catch (error) {
      console.error("Error updating plan:", error);
      setStatus("Failed to update plan.");
    } finally {
      setUpdating(null);
    }
  };
  
  if (loading && users.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border">
      <table className="min-w-full">
        <thead className="bg-gray-100 dark:bg-gray-700">
          <tr>
            <th className="py-3 px-4 text-left text-sm font-semibold uppercase">Email</th>
            <th className="py-3 px-4 text-left text-sm font-semibold uppercase">Plan</th>
            <th className="py-3 px-4 text-left text-sm font-semibold uppercase">Clients</th>
            <th className="py-3 px-4 text-left text-sm font-semibold uppercase">Reports</th>
            <th className="py-3 px-4 text-left text-sm font-semibold uppercase">Change Plan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {users.map((u) => (
            <tr key={u.id}>
              <td className="py-3 px-4">{u.email}</td>
              <td className="py-3 px-4 capitalize">{u.plan || "free"}</td>
              <td className="py-3 px-4">{u.usage?.clients || 0}</td>
              <td className="py-3 px-4">{u.usage?.reports || 0}</td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <select
                    value={u.plan || 'free'}
                    onChange={(e) => handlePlanChange(u.id, e.target.value)}
                    disabled={updating === u.id || u.plan === 'admin'}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-50"
                  >
                    <option value="free">Free</option>
                    <option value="family">Family</option>
                    <option value="pro">Pro</option>
                    <option value="agency">Agency</option>
                    {u.plan === 'admin' && <option value="admin">Admin</option>}
                  </select>
                  {updating === u.id && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {status && <p className="mt-4 p-4 text-sm text-green-700 dark:text-green-400">{status}</p>}
    </div>
  );
}
