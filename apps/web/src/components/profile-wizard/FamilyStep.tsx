"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { Alert } from "@/components/ui/Alert";
import { api, ApiError } from "@/lib/api-client";
import type { ChildrenCount, FamilyDetails, LivingArrangement } from "@/types/profile";

const CHILDREN_COUNT_OPTIONS: { label: string; value: ChildrenCount }[] = [
  { label: "No children", value: "NONE" },
  { label: "1 child", value: "ONE" },
  { label: "2 children", value: "TWO" },
  { label: "3 or more children", value: "THREE_OR_MORE" },
];

const LIVING_ARRANGEMENT_OPTIONS: { label: string; value: LivingArrangement }[] = [
  { label: "With me", value: "WITH_ME" },
  { label: "With the other parent", value: "WITH_OTHER_PARENT" },
  { label: "Shared arrangement", value: "SHARED" },
  { label: "Other", value: "OTHER" },
];

export interface FamilyValues {
  childrenCount: ChildrenCount;
  childrenLivingArrangement: LivingArrangement | undefined;
}

export function FamilyStep({
  initial,
  onSaved,
}: {
  initial?: Partial<FamilyValues>;
  onSaved: () => void;
}) {
  const [childrenCount, setChildrenCount] = useState<ChildrenCount>(initial?.childrenCount ?? "NONE");
  const [livingArrangement, setLivingArrangement] = useState<LivingArrangement | undefined>(
    initial?.childrenLivingArrangement,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChildren = childrenCount !== "NONE";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.put<{ familyDetails: FamilyDetails }>("/profiles/me/family", {
        childrenCount,
        childrenLivingArrangement: hasChildren ? livingArrangement : undefined,
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
        <h2 className="text-xl">Family &amp; Children</h2>
        <p className="text-sm text-neutral-500">Whatever your situation, there's no wrong answer here.</p>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <Dropdown
        label="Children"
        items={CHILDREN_COUNT_OPTIONS}
        value={childrenCount}
        onChange={(v) => setChildrenCount(v as ChildrenCount)}
      />

      {hasChildren && (
        <Dropdown
          label="Children's living arrangement"
          items={LIVING_ARRANGEMENT_OPTIONS}
          value={livingArrangement}
          onChange={(v) => setLivingArrangement(v as LivingArrangement)}
          placeholder="Select"
        />
      )}

      <div className="flex justify-end">
        <Button type="submit" isLoading={submitting}>
          Save and continue
        </Button>
      </div>
    </form>
  );
}
