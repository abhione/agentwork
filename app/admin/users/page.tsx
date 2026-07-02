"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Loader2, ShieldAlert, User, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  mfa_enrolled: boolean;
  created_at: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndLoadUsers();
  }, []);

  async function checkAdminAndLoadUsers() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    // Check if admin
    const { data: adminCheck } = await supabase
      .from("admin_users")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!adminCheck) {
      router.replace("/marketplace");
      return;
    }

    setIsAdmin(true);

    // Load all users
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    setUsers(profiles || []);
    setLoading(false);
  }

  async function approveUser(userId: string) {
    setActionLoading(userId);
    
    const response = await fetch("/api/admin/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    if (response.ok) {
      setUsers(users.map(u => 
        u.id === userId ? { ...u, status: "approved" as const } : u
      ));
    }
    
    setActionLoading(null);
  }

  async function rejectUser(userId: string) {
    const reason = window.prompt("Rejection reason (optional):");
    if (reason === null) return; // Cancelled
    
    setActionLoading(userId);
    
    const response = await fetch("/api/admin/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, reason: reason || undefined }),
    });

    if (response.ok) {
      setUsers(users.map(u => 
        u.id === userId ? { ...u, status: "rejected" as const } : u
      ));
    }
    
    setActionLoading(null);
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const pendingUsers = users.filter(u => u.status === "pending");
  const approvedUsers = users.filter(u => u.status === "approved");
  const rejectedUsers = users.filter(u => u.status === "rejected");

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          Approve or reject user signups for AgentWork
        </p>
      </div>

      {/* Pending Users */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-400">
            <Clock className="h-5 w-5" />
            Pending Approval ({pendingUsers.length})
          </CardTitle>
          <CardDescription>
            Users waiting for admin review
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending users</p>
          ) : (
            <div className="space-y-3">
              {pendingUsers.map(user => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                      <User className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="font-medium">{user.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Signed up {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                      onClick={() => approveUser(user.id)}
                      disabled={actionLoading === user.id}
                    >
                      {actionLoading === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      onClick={() => rejectUser(user.id)}
                      disabled={actionLoading === user.id}
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approved Users */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-400">
            <Check className="h-5 w-5" />
            Approved ({approvedUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {approvedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No approved users</p>
          ) : (
            <div className="space-y-2">
              {approvedUsers.map(user => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
                      <User className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{user.email}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                        {user.mfa_enrolled && (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <ShieldAlert className="h-3 w-3" />
                            MFA
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejected Users */}
      {rejectedUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <X className="h-5 w-5" />
              Rejected ({rejectedUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rejectedUsers.map(user => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20">
                      <User className="h-4 w-4 text-red-400" />
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => approveUser(user.id)}
                    disabled={actionLoading === user.id}
                  >
                    Reconsider
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
