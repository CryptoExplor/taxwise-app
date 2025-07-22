
"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  email?: string;
  plan?: string;
  role?: "user" | "employee" | "admin";
  caAccountId?: string;
}

export default function EmployeeManagementPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [caUserEmail, setCaUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [caUsers, setCaUsers] = useState<User[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const userSnap = await getDocs(collection(db, "users"));
      const allUsers = userSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];
      setUsers(allUsers);
      const caUsersList = allUsers.filter(
        (u) => u.plan === "agency" || u.plan === "admin"
      );
      setCaUsers(caUsersList);
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load users for employee management.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, toast]);

  const assignEmployeeToCA = async () => {
    if (!selectedUserId || !caUserEmail) {
      toast({
        variant: "destructive",
        title: "Input Required",
        description: "Please select a user and a CA email.",
      });
      return;
    }

    setActionLoading(true);

    try {
      const caUserQuery = query(
        collection(db, "users"),
        where("email", "==", caUserEmail)
      );
      const caUserSnap = await getDocs(caUserQuery);

      if (caUserSnap.empty) {
        toast({
          variant: "destructive",
          title: "Not Found",
          description: "CA user with this email not found.",
        });
        setActionLoading(false);
        return;
      }

      const caUserDoc = caUserSnap.docs[0];
      const caUserId = caUserDoc.id;

      const employeeRef = doc(db, "users", selectedUserId);
      await updateDoc(employeeRef, {
        caAccountId: caUserId,
        role: "employee",
      });

      toast({
        title: "Success",
        description: "Successfully assigned employee.",
      });
      loadData();
      setSelectedUserId("");
      setCaUserEmail("");
    } catch (error: any) {
      console.error("Error assigning employee:", error);
      toast({
        variant: "destructive",
        title: "Assignment Failed",
        description: error.message,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const removeEmployeeAssignment = async (employeeId: string) => {
    setActionLoading(true);
    try {
      const employeeRef = doc(db, "users", employeeId);
      await updateDoc(employeeRef, {
        caAccountId: null,
        role: "user",
      });

      toast({
        title: "Success",
        description: "Successfully removed employee assignment.",
      });
      loadData();
    } catch (error: any) {
      console.error("Error removing assignment:", error);
      toast({
        variant: "destructive",
        title: "Removal Failed",
        description: error.message,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const assignedEmployees = users.filter(u => u.role === 'employee' && u.caAccountId);

  return (
    <div className="space-y-8">
      <div className="p-6 border rounded-lg bg-white dark:bg-gray-800">
        <h3 className="text-xl font-semibold mb-4">Assign User as Employee</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          <div className="space-y-2">
            <label htmlFor="user-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select User to Assign:</label>
            <select 
              id="user-select" 
              onChange={(e) => setSelectedUserId(e.target.value)} 
              value={selectedUserId} 
              disabled={actionLoading}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="">-- Select a User --</option>
              {users
                .filter((u) => u.plan !== "admin" && u.role !== "employee")
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email} (Plan: {user.plan})
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="ca-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assign to CA (Email):</label>
            <div className="flex gap-2">
                 <input
                    type="email"
                    id="ca-email"
                    value={caUserEmail}
                    onChange={(e) => setCaUserEmail(e.target.value)}
                    placeholder="Enter CA's email (agency plan)"
                    disabled={actionLoading}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
                 <select 
                    onChange={(e) => setCaUserEmail(e.target.value)} 
                    value={caUserEmail} 
                    disabled={actionLoading}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                 >
                    <option value="">Or Select CA</option>
                    {caUsers.map(ca => (
                       <option key={ca.id} value={ca.email!}>{ca.email}</option>
                    ))}
                </select>
            </div>
          </div>
        </div>
        <button
          onClick={assignEmployeeToCA}
          disabled={!selectedUserId || !caUserEmail || actionLoading}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {actionLoading ? 'Assigning...' : 'Assign Employee'}
        </button>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Current Employee Assignments
        </h3>
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="py-3 px-4 text-left text-sm font-semibold uppercase">Employee Email</th>
                <th className="py-3 px-4 text-left text-sm font-semibold uppercase">Assigned to CA Email</th>
                <th className="py-3 px-4 text-left text-sm font-semibold uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="text-center h-24">
                    Loading...
                  </td>
                </tr>
              ) : assignedEmployees.length > 0 ? (
                assignedEmployees.map((employee) => {
                  const caUser = users.find((u) => u.id === employee.caAccountId);
                  return (
                    <tr key={employee.id} className="border-b dark:border-gray-700">
                      <td className="py-3 px-4">{employee.email}</td>
                      <td className="py-3 px-4">{caUser?.email || "N/A"}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => removeEmployeeAssignment(employee.id)}
                          disabled={actionLoading}
                          className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:bg-gray-400"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={3} className="text-center h-24">
                    No employee assignments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
