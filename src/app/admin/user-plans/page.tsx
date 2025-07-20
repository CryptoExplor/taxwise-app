"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader } from "lucide-react";
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
  const { toast } = useToast();

  useEffect(() => {
    const loadUsers = async () => {
        setLoading(true);
        try {
        const userSnap = await getDocs(collection(db, "users"));
        const data = userSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as User[];
        setUsers(data);
        } catch (error) {
        console.error("Error loading users:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load users.",
        });
        } finally {
        setLoading(false);
        }
    };
    
    if (currentUser) {
        loadUsers();
    }
  }, [currentUser, toast]);


  const handlePlanChange = async (userId: string, newPlan: string) => {
    if (!userId || !newPlan) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid user or plan selected.",
      });
      return;
    }
    setUpdating(userId);
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { plan: newPlan });
      toast({
        title: "Success",
        description: `Plan updated to ${newPlan}.`,
      });
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === userId ? { ...u, plan: newPlan } : u))
      );
    } catch (error) {
      console.error("Error updating plan:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update plan.",
      });
    } finally {
      setUpdating(null);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-card rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User ID</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Change Plan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-mono text-xs">{u.id}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell className="capitalize">{u.plan || "free"}</TableCell>
              <TableCell className="capitalize">{u.role || "user"}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Select
                    defaultValue={u.plan || 'free'}
                    onValueChange={(value) => handlePlanChange(u.id, value)}
                    disabled={updating === u.id}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="family">Family</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="agency">Agency</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {updating === u.id && <Loader className="w-4 h-4 animate-spin" />}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
