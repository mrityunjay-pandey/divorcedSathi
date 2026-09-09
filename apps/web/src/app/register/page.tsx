"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dropdown } from "@/components/ui/Dropdown";
import { Alert } from "@/components/ui/Alert";
import { api, ApiError } from "@/lib/api-client";

const GENDER_OPTIONS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
  { label: "Prefer not to say", value: "prefer_not_to_say" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<string | undefined>();
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [city, setCity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!gender) {
      setError("Please select a gender.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/auth/register", {
        firstName,
        lastName: lastName || undefined,
        email,
        password,
        gender,
        dateOfBirth,
        city,
        marriageStatus: "divorced",
      });
      router.push(`/verify-otp?email=${encodeURIComponent(email)}&type=EMAIL`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div>
        <h1 className="text-2xl">Create Your Profile</h1>
        <p className="text-sm text-neutral-500">A new beginning starts here.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <Alert tone="danger">{error}</Alert>}

          <div className="grid grid-cols-2 gap-3">
            <Input label="First name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <Input label="Last name" hint="Optional" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>

          <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            label="Password"
            type="password"
            required
            hint="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Dropdown label="Gender" items={GENDER_OPTIONS} value={gender} onChange={setGender} placeholder="Select" />

          <Input
            label="Date of birth"
            type="date"
            required
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
          <Input label="City" required value={city} onChange={(e) => setCity(e.target.value)} />

          <p className="text-xs text-neutral-400">
            DivorcedSathi.com currently supports remarriage after divorce. Widowed, separated, and
            annulled-marriage support is planned.
          </p>

          <Button type="submit" isLoading={submitting}>
            Create Account
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm text-neutral-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary-600 hover:underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
