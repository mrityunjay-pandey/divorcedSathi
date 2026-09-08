"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dropdown } from "@/components/ui/Dropdown";
import { Alert } from "@/components/ui/Alert";
import { api, ApiError } from "@/lib/api-client";
import {
  CHILDREN_PREFERENCE_OPTIONS,
  INCOME_RANGE_OPTIONS,
  MARRIAGE_STATUS_OPTIONS,
  type ChildrenPreference,
  type IncomeRange,
  type PartnerPreference,
} from "@/types/profile";

export interface PartnerPreferenceValues {
  ageMin: string;
  ageMax: string;
  preferredCities: string;
  preferredStates: string;
  willingToRelocate: boolean;
  preferredEducation: string;
  preferredProfessions: string;
  minIncomeRange: IncomeRange | undefined;
  previousMarriagePreferences: ("DIVORCED" | "WIDOWED" | "SEPARATED" | "ANNULLED")[];
  openToAnyMarriageStatus: boolean;
  childrenPreference: ChildrenPreference;
  otherPreferences: string;
}

const EMPTY_VALUES: PartnerPreferenceValues = {
  ageMin: "",
  ageMax: "",
  preferredCities: "",
  preferredStates: "",
  willingToRelocate: false,
  preferredEducation: "",
  preferredProfessions: "",
  minIncomeRange: undefined,
  previousMarriagePreferences: [],
  openToAnyMarriageStatus: false,
  childrenPreference: "OPEN_TO_EITHER",
  otherPreferences: "",
};

function toList(csv: string): string[] {
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function PartnerPreferencesStep({
  initial,
  onSaved,
}: {
  initial?: Partial<PartnerPreferenceValues>;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<PartnerPreferenceValues>({ ...EMPTY_VALUES, ...initial });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof PartnerPreferenceValues>(key: K, value: PartnerPreferenceValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function toggleMarriageStatus(status: "DIVORCED" | "WIDOWED" | "SEPARATED" | "ANNULLED") {
    setValues((prev) => ({
      ...prev,
      previousMarriagePreferences: prev.previousMarriagePreferences.includes(status)
        ? prev.previousMarriagePreferences.filter((s) => s !== status)
        : [...prev.previousMarriagePreferences, status],
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (values.ageMin && values.ageMax && Number(values.ageMin) > Number(values.ageMax)) {
      setError("Minimum age can't be greater than maximum age.");
      return;
    }

    setSubmitting(true);
    try {
      await api.put<{ preferences: PartnerPreference }>("/profiles/me/partner-preferences", {
        ageMin: values.ageMin ? Number(values.ageMin) : undefined,
        ageMax: values.ageMax ? Number(values.ageMax) : undefined,
        preferredCities: toList(values.preferredCities),
        preferredStates: toList(values.preferredStates),
        willingToRelocate: values.willingToRelocate,
        preferredEducation: toList(values.preferredEducation),
        preferredProfessions: toList(values.preferredProfessions),
        minIncomeRange: values.minIncomeRange,
        previousMarriagePreferences: values.openToAnyMarriageStatus ? [] : values.previousMarriagePreferences,
        openToAnyMarriageStatus: values.openToAnyMarriageStatus,
        childrenPreference: values.childrenPreference,
        otherPreferences: values.otherPreferences || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your preferences. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl">Partner Preferences</h2>
        <p className="text-sm text-neutral-500">
          These shape who you'll see in your matches — not a hard filter you can't change later.
        </p>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Minimum age" type="number" value={values.ageMin} onChange={(e) => set("ageMin", e.target.value)} />
        <Input label="Maximum age" type="number" value={values.ageMax} onChange={(e) => set("ageMax", e.target.value)} />
        <Input
          label="Preferred cities"
          hint="Comma-separated"
          value={values.preferredCities}
          onChange={(e) => set("preferredCities", e.target.value)}
        />
        <Input
          label="Preferred states"
          hint="Comma-separated"
          value={values.preferredStates}
          onChange={(e) => set("preferredStates", e.target.value)}
        />
        <Input
          label="Preferred education"
          hint="Comma-separated"
          value={values.preferredEducation}
          onChange={(e) => set("preferredEducation", e.target.value)}
        />
        <Input
          label="Preferred professions"
          hint="Comma-separated"
          value={values.preferredProfessions}
          onChange={(e) => set("preferredProfessions", e.target.value)}
        />
        <Dropdown
          label="Minimum income"
          items={INCOME_RANGE_OPTIONS}
          value={values.minIncomeRange}
          onChange={(v) => set("minIncomeRange", v as IncomeRange)}
          placeholder="No preference"
        />
        <Dropdown
          label="Children"
          items={CHILDREN_PREFERENCE_OPTIONS}
          value={values.childrenPreference}
          onChange={(v) => set("childrenPreference", v as ChildrenPreference)}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={values.willingToRelocate}
          onChange={(e) => set("willingToRelocate", e.target.checked)}
          className="h-4 w-4 rounded border-neutral-300"
        />
        I'm willing to relocate for the right match
      </label>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={values.openToAnyMarriageStatus}
            onChange={(e) => set("openToAnyMarriageStatus", e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300"
          />
          Open to any previous-marriage circumstance
        </label>

        {!values.openToAnyMarriageStatus && (
          <div className="ml-6 flex flex-wrap gap-3">
            {MARRIAGE_STATUS_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-1.5 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={values.previousMarriagePreferences.includes(option.value)}
                  onChange={() => toggleMarriageStatus(option.value)}
                  className="h-4 w-4 rounded border-neutral-300"
                />
                {option.label}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="other-preferences" className="text-sm font-medium text-neutral-700">
          Anything else you're looking for?
        </label>
        <textarea
          id="other-preferences"
          value={values.otherPreferences}
          maxLength={2000}
          onChange={(e) => set("otherPreferences", e.target.value)}
          rows={4}
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
