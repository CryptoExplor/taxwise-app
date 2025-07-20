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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

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
      <div className="p-6 border rounded-lg bg-card">
        <h3 className="text-xl font-semibold mb-4">Assign User as Employee</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          <div className="space-y-2">
            <Label htmlFor="user-select">Select User to Assign:</Label>
            <Select onValueChange={setSelectedUserId} value={selectedUserId} disabled={actionLoading}>
              <SelectTrigger id="user-select">
                <SelectValue placeholder="-- Select a User --" />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter((u) => u.plan !== "admin" && u.role !== "employee")
                  .map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email} (Plan: {user.plan})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ca-email">Assign to CA (Email):</Label>
            <div className="flex gap-2">
                 <Input
                    type="email"
                    id="ca-email"
                    value={caUserEmail}
                    onChange={(e) => setCaUserEmail(e.target.value)}
                    placeholder="Enter CA's email (agency plan)"
                    disabled={actionLoading}
                />
                 <Select onValueChange={setCaUserEmail} value={caUserEmail} disabled={actionLoading}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Or Select CA"/>
                    </SelectTrigger>
                    <SelectContent>
                        {caUsers.map(ca => (
                           <SelectItem key={ca.id} value={ca.email!}>{ca.email}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </div>
        </div>
        <Button
          onClick={assignEmployeeToCA}
          disabled={!selectedUserId || !caUserEmail || actionLoading}
          className="mt-6"
        >
          {actionLoading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
          Assign Employee
        </Button>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4 text-foreground">
          Current Employee Assignments
        </h3>
        <div className="overflow-x-auto bg-card rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee Email</TableHead>
                <TableHead>Assigned to CA Email</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24">
                    <Loader className="mx-auto animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : assignedEmployees.length > 0 ? (
                assignedEmployees.map((employee) => {
                  const caUser = users.find((u) => u.id === employee.caAccountId);
                  return (
                    <TableRow key={employee.id}>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{caUser?.email || "N/A"}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeEmployeeAssignment(employee.id)}
                          disabled={actionLoading}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24">
                    No employee assignments found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
