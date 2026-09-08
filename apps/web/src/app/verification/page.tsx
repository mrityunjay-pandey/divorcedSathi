"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Skeleton";
import { api, ApiError } from "@/lib/api-client";
import type { VerificationBadges } from "@/types/profile";

function IdentityBadge({ status }: { status: VerificationBadges["identityStatus"] }) {
  if (status === "APPROVED") return <Badge tone="success">Identity Verified</Badge>;
  if (status === "PENDING") return <Badge tone="warning">Under Review</Badge>;
  if (status === "REJECTED") return <Badge tone="danger">Resubmission Needed</Badge>;
  return <Badge tone="neutral">Not Submitted</Badge>;
}

export default function VerificationPage() {
  const [badges, setBadges] = useState<VerificationBadges | null>(null);
  const [documentRef, setDocumentRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    try {
      const data = await api.get<VerificationBadges>("/verification/me");
      setBadges(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load verification status.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      await api.post("/verification/identity", { documentStorageKey: documentRef });
      setMessage("Your document has been submitted for review.");
      setDocumentRef("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't submit for verification.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <div>
        <h1 className="text-2xl">Verification</h1>
        <p className="text-sm text-neutral-500">Verified profiles build trust with other members.</p>
      </div>

      {!badges && !error && <Skeleton className="h-32 w-full" />}
      {error && <Alert tone="danger">{error}</Alert>}

      {badges && (
        <Card>
          <CardHeader>
            <CardTitle>Your badges</CardTitle>
            <CardDescription>These appear on your profile.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge tone={badges.mobileVerified ? "success" : "neutral"}>
              {badges.mobileVerified ? "Mobile Verified" : "Mobile Not Verified"}
            </Badge>
            <Badge tone={badges.emailVerified ? "success" : "neutral"}>
              {badges.emailVerified ? "Email Verified" : "Email Not Verified"}
            </Badge>
            <IdentityBadge status={badges.identityStatus} />
          </CardContent>
        </Card>
      )}

      {badges && badges.identityStatus !== "APPROVED" && badges.identityStatus !== "PENDING" && (
        <Card>
          <CardHeader>
            <CardTitle>Verify your identity</CardTitle>
            <CardDescription>
              Upload a government-issued ID. It's stored securely and is never shown to other members —
              only used to confirm you're a real person.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {message && (
              <Alert tone="success" className="mb-4">
                {message}
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Document reference"
                hint="Placeholder for the file-upload flow — a real upload widget (with secure, presigned storage) is a follow-up to this module."
                required
                value={documentRef}
                onChange={(e) => setDocumentRef(e.target.value)}
              />
              <div className="flex justify-end">
                <Button type="submit" isLoading={submitting}>
                  Submit for review
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
