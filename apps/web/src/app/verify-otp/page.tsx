"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { api, ApiError } from "@/lib/api-client";

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const identifier = searchParams.get("email") ?? searchParams.get("mobile") ?? "";
  const identifierType = searchParams.get("type") === "MOBILE" ? "MOBILE" : "EMAIL";

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload =
        identifierType === "EMAIL" ? { email: identifier, identifierType, code } : { mobileNumber: identifier, identifierType, code };
      await api.post("/auth/otp/verify", payload);
      router.push("/login?verified=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That code didn't work. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setMessage(null);
    setError(null);
    try {
      const payload = identifierType === "EMAIL" ? { email: identifier, identifierType } : { mobileNumber: identifier, identifierType };
      await api.post("/auth/otp/resend", payload);
      setMessage("A new code has been sent.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't resend the code.");
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6 py-12">
      <div>
        <h1 className="text-2xl">Verify Your {identifierType === "EMAIL" ? "Email" : "Mobile Number"}</h1>
        <p className="text-sm text-neutral-500">
          We sent a 6-digit code to <span className="font-medium">{identifier}</span>.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <Alert tone="danger">{error}</Alert>}
          {message && <Alert tone="success">{message}</Alert>}

          <Input
            label="Verification code"
            required
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />

          <Button type="submit" isLoading={submitting} disabled={code.length !== 6}>
            Verify
          </Button>
          <Button type="button" variant="ghost" isLoading={resending} onClick={handleResend}>
            Resend code
          </Button>
        </form>
      </Card>
    </main>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense>
      <VerifyOtpForm />
    </Suspense>
  );
}
