"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dropdown } from "@/components/ui/Dropdown";
import { Alert } from "@/components/ui/Alert";
import { api, ApiError } from "@/lib/api-client";
import {
  EMPLOYMENT_TYPE_OPTIONS,
  INCOME_RANGE_OPTIONS,
  type EmploymentType,
  type IncomeRange,
  type Profile,
} from "@/types/profile";

export interface BasicInfoValues {
  city: string;
  state: string;
  heightCm: string;
  motherTongue: string;
  religion: string;
  community: string;
  education: string;
  profession: string;
  employmentType: EmploymentType | undefined;
  incomeRange: IncomeRange | undefined;
}

const EMPTY_VALUES: BasicInfoValues = {
  city: "",
  state: "",
  heightCm: "",
  motherTongue: "",
  religion: "",
  community: "",
  education: "",
  profession: "",
  employmentType: undefined,
  incomeRange: undefined,
};

export function BasicInfoStep({
  initial,
  hasExistingProfile,
  onSaved,
}: {
  initial?: Partial<BasicInfoValues>;
  hasExistingProfile: boolean;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<BasicInfoValues>({ ...EMPTY_VALUES, ...initial });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof BasicInfoValues>(key: K, value: BasicInfoValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.city.trim()) {
      setError("City is required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        city: values.city,
        state: values.state || undefined,
        heightCm: values.heightCm ? Number(values.heightCm) : undefined,
        motherTongue: values.motherTongue || undefined,
        religion: values.religion || undefined,
        community: values.community || undefined,
        education: values.education || undefined,
        profession: values.profession || undefined,
        employmentType: values.employmentType,
        incomeRange: values.incomeRange,
      };

      if (hasExistingProfile) {
        await api.patch<{ profile: Profile }>("/profiles/me", payload);
      } else {
        await api.post<{ profile: Profile }>("/profiles/me", payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your basic info. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl">Basic Information</h2>
        <p className="text-sm text-neutral-500">
          This helps us show you relevant matches. You can leave sensitive fields as "prefer not to say".
        </p>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="City" required value={values.city} onChange={(e) => set("city", e.target.value)} />
        <Input label="State" value={values.state} onChange={(e) => set("state", e.target.value)} />
        <Input
          label="Height (cm)"
          type="number"
          hint="Optional"
          value={values.heightCm}
          onChange={(e) => set("heightCm", e.target.value)}
        />
        <Input label="Mother tongue" value={values.motherTongue} onChange={(e) => set("motherTongue", e.target.value)} />
        <Input label="Religion" hint="Optional" value={values.religion} onChange={(e) => set("religion", e.target.value)} />
        <Input label="Community / caste" hint="Optional" value={values.community} onChange={(e) => set("community", e.target.value)} />
        <Input label="Education" value={values.education} onChange={(e) => set("education", e.target.value)} />
        <Input label="Profession" value={values.profession} onChange={(e) => set("profession", e.target.value)} />
        <Dropdown
          label="Employment type"
          items={EMPLOYMENT_TYPE_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
          value={values.employmentType}
          onChange={(v) => set("employmentType", v as EmploymentType)}
          placeholder="Select"
        />
        <Dropdown
          label="Income range"
          items={INCOME_RANGE_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
          value={values.incomeRange}
          onChange={(v) => set("incomeRange", v as IncomeRange)}
          placeholder="Select"
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
