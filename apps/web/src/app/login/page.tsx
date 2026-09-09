"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { api, ApiError, setTokens } from "@/lib/api-client";

interface LoginResponse {
  user: { id: string; firstName: string };
  session: { accessToken: string; refreshToken: string };
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justVerified = searchParams.get("verified") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { session } = await api.post<LoginResponse>("/auth/login", { email, password });
      setTokens(session.accessToken, session.refreshToken);
      router.push("/discover");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't log in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6 py-12">
      <div>
        <h1 className="text-2xl">Welcome Back</h1>
        <p className="text-sm text-neutral-500">Log in to continue your journey.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {justVerified && <Alert tone="success">Your account is verified — please log in.</Alert>}
          {error && <Alert tone="danger">{error}</Alert>}

          <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />

          <Button type="submit" isLoading={submitting}>
            Log In
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm text-neutral-500">
        New here?{" "}
        <Link href="/register" className="font-medium text-primary-600 hover:underline">
          Create your profile
        </Link>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
