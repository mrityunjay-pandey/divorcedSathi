"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { api, ApiError } from "@/lib/api-client";
import type { PreviousMarriage } from "@/types/profile";

export interface PreviousMarriageValues {
  marriedYear: string;
  endedYear: string;
  divorceFinalized: boolean;
  additionalInfo: string;
}

const EMPTY_VALUES: PreviousMarriageValues = {
  marriedYear: "",
  endedYear: "",
  divorceFinalized: false,
  additionalInfo: "",
};

export function PreviousMarriageStep({
  initial,
  onSaved,
}: {
  initial?: Partial<PreviousMarriageValues>;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<PreviousMarriageValues>({ ...EMPTY_VALUES, ...initial });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof PreviousMarriageValues>(key: K, value: PreviousMarriageValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.put<{ previousMarriage: PreviousMarriage }>("/profiles/me/previous-marriage", {
        marriedYear: values.marriedYear ? Number(values.marriedYear) : undefined,
        endedYear: values.endedYear ? Number(values.endedYear) : undefined,
        divorceFinalized: values.divorceFinalized,
        additionalInfo: values.additionalInfo || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save this step. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl">Previous Marriage</h2>
        <p className="text-sm text-neutral-500">
          Other members only ever see a short summary — "Previously married • Divorce finalized" —
          never the details below.
        </p>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <Alert tone="info" title="What others will see">
        <div className="mt-1 flex items-center gap-2">
          <Badge tone="neutral">Previously married</Badge>
          {values.divorceFinalized && <Badge tone="success">Divorce finalized</Badge>}
        </div>
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Year of marriage"
          type="number"
          hint="Private — not shown to other members"
          value={values.marriedYear}
          onChange={(e) => set("marriedYear", e.target.value)}
        />
        <Input
          label="Year marriage ended"
          type="number"
          hint="Private — not shown to other members"
          value={values.endedYear}
          onChange={(e) => set("endedYear", e.target.value)}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={values.divorceFinalized}
          onChange={(e) => set("divorceFinalized", e.target.checked)}
          className="h-4 w-4 rounded border-neutral-300"
        />
        Divorce is legally finalized
      </label>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="pm-additional-info" className="text-sm font-medium text-neutral-700">
          Additional information
        </label>
        <textarea
          id="pm-additional-info"
          value={values.additionalInfo}
          maxLength={2000}
          onChange={(e) => set("additionalInfo", e.target.value)}
          rows={4}
          placeholder="Anything else you'd like on record for your own reference. This stays private."
          className="rounded-md border border-neutral-300 bg-white p-3 text-base text-neutral-800 placeholder:text-neutral-400 focus:border-primary-400"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" isLoading={submitting}>
          Save and continue
        </Button>
      </div>
    </form>
  );
}
