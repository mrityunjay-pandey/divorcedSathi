"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api-client";
import type { AdminDashboardStats, AdminUserSummary } from "@/types/profile";

const STAT_LABELS: { key: keyof AdminDashboardStats; label: string }[] = [
  { key: "totalUsers", label: "Total Users" },
  { key: "newRegistrations7d", label: "New (7d)" },
  { key: "verifiedUsers", label: "Verified Users" },
  { key: "suspendedAccounts", label: "Suspended" },
  { key: "pendingVerifications", label: "Pending Verification" },
  { key: "pendingReports", label: "Pending Reports" },
  { key: "interestsSent", label: "Interests Sent" },
  { key: "connections", label: "Connections" },
];

function StatusBadge({ status }: { status: AdminUserSummary["status"] }) {
  if (status === "ACTIVE") return <Badge tone="success">Active</Badge>;
  if (status === "SUSPENDED") return <Badge tone="warning">Suspended</Badge>;
  if (status === "BANNED") return <Badge tone="danger">Banned</Badge>;
  return <Badge tone="neutral">Deleted</Badge>;
}

export default function AdminDashboardPage() {
  const { show } = useToast();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminUserSummary[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);

  async function loadStats() {
    try {
      const data = await api.get<AdminDashboardStats>("/admin/dashboard");
      setStats(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load the dashboard.");
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const { users } = await api.get<{ users: AdminUserSummary[] }>(`/admin/users?q=${encodeURIComponent(query)}`);
      setResults(users);
    } catch (err) {
      show({ title: "Search failed", description: err instanceof ApiError ? err.message : undefined, tone: "danger" });
    } finally {
      setSearching(false);
    }
  }

  async function handleAction(userId: string, action: "suspend" | "ban" | "reactivate") {
    setActingOn(userId);
    try {
      await api.post(`/admin/users/${userId}/${action}`, {});
      show({ title: `User ${action === "reactivate" ? "reactivated" : action + "ed"}`, tone: "success" });
      await handleSearch();
    } catch (err) {
      show({ title: "Action failed", description: err instanceof ApiError ? err.message : undefined, tone: "danger" });
    } finally {
      setActingOn(null);
    }
  }

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16">
        <ErrorState title="Couldn't load the admin dashboard" description={error} />
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12">
      <div>
        <h1 className="text-2xl">Admin Dashboard</h1>
        <p className="text-sm text-neutral-500">
          Numbers here reflect what's actually built — active-user tracking, premium users, and revenue
          aren't shown because those features don't exist yet.
        </p>
      </div>

      {!stats && <Skeleton className="h-40 w-full" />}

      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {STAT_LABELS.map(({ key, label }) => (
            <Card key={key}>
              <CardContent className="text-center">
                <p className="text-2xl font-semibold text-neutral-900">{stats[key]}</p>
                <p className="text-xs text-neutral-500">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Input
              label="Search by name, email, or mobile"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button className="self-end" isLoading={searching} onClick={handleSearch}>
              Search
            </Button>
          </div>

          {results && results.length === 0 && <EmptyState title="No users found" />}

          {results && results.length > 0 && (
            <div className="flex flex-col gap-2">
              {results.map((user) => (
                <Card key={user.id} className="flex items-center justify-between">
                  <CardContent className="flex items-center gap-3">
                    <span className="font-medium">{user.firstName}</span>
                    <span className="text-xs text-neutral-500">{user.email ?? user.mobileNumber}</span>
                    <StatusBadge status={user.status} />
                  </CardContent>
                  <div className="flex gap-2 p-6 pt-0 sm:p-0 sm:pr-6">
                    {user.status === "ACTIVE" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          isLoading={actingOn === user.id}
                          onClick={() => handleAction(user.id, "suspend")}
                        >
                          Suspend
                        </Button>
                        <Button size="sm" variant="danger" isLoading={actingOn === user.id} onClick={() => handleAction(user.id, "ban")}>
                          Ban
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" isLoading={actingOn === user.id} onClick={() => handleAction(user.id, "reactivate")}>
                        Reactivate
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Alert tone="info">
        This dashboard is admin-only (enforced server-side). Moderation queues for reports and
        verification requests are managed via API today — a dedicated queue UI is a follow-up.
      </Alert>
    </main>
  );
}
