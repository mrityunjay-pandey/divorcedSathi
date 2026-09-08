"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dropdown } from "@/components/ui/Dropdown";
import { Alert } from "@/components/ui/Alert";
import { api, ApiError } from "@/lib/api-client";
import { DIET_OPTIONS, HABIT_FREQUENCY_OPTIONS, type Diet, type HabitFrequency, type Lifestyle } from "@/types/profile";

export interface LifestyleValues {
  diet: Diet | undefined;
  smoking: HabitFrequency | undefined;
  drinking: HabitFrequency | undefined;
  fitnessRoutine: string;
  hobbies: string;
  pets: string;
  travelFrequency: string;
  sleepSchedule: string;
  socialLifestyle: string;
}

const EMPTY_VALUES: LifestyleValues = {
  diet: undefined,
  smoking: undefined,
  drinking: undefined,
  fitnessRoutine: "",
  hobbies: "",
  pets: "",
  travelFrequency: "",
  sleepSchedule: "",
  socialLifestyle: "",
};

export function LifestyleStep({
  initial,
  onSaved,
}: {
  initial?: Partial<LifestyleValues>;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<LifestyleValues>({ ...EMPTY_VALUES, ...initial });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof LifestyleValues>(key: K, value: LifestyleValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.put<{ lifestyle: Lifestyle }>("/profiles/me/lifestyle", {
        diet: values.diet,
        smoking: values.smoking,
        drinking: values.drinking,
        fitnessRoutine: values.fitnessRoutine || undefined,
        hobbies: values.hobbies || undefined,
        pets: values.pets || undefined,
        travelFrequency: values.travelFrequency || undefined,
        sleepSchedule: values.sleepSchedule || undefined,
        socialLifestyle: values.socialLifestyle || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your lifestyle details. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl">Lifestyle</h2>
        <p className="text-sm text-neutral-500">
          All optional. Choose "Prefer not to say" for anything you'd rather not share.
        </p>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Dropdown
          label="Diet"
          items={DIET_OPTIONS}
          value={values.diet}
          onChange={(v) => set("diet", v as Diet)}
          placeholder="Select"
        />
        <Dropdown
          label="Smoking"
          items={HABIT_FREQUENCY_OPTIONS}
          value={values.smoking}
          onChange={(v) => set("smoking", v as HabitFrequency)}
          placeholder="Select"
        />
        <Dropdown
          label="Drinking"
          items={HABIT_FREQUENCY_OPTIONS}
          value={values.drinking}
          onChange={(v) => set("drinking", v as HabitFrequency)}
          placeholder="Select"
        />
        <Input label="Fitness routine" hint="Optional" value={values.fitnessRoutine} onChange={(e) => set("fitnessRoutine", e.target.value)} />
        <Input label="Hobbies" hint="Optional" value={values.hobbies} onChange={(e) => set("hobbies", e.target.value)} />
        <Input label="Pets" hint="Optional" value={values.pets} onChange={(e) => set("pets", e.target.value)} />
        <Input label="Travel" hint="Optional" value={values.travelFrequency} onChange={(e) => set("travelFrequency", e.target.value)} />
        <Input label="Sleep schedule" hint="Optional" value={values.sleepSchedule} onChange={(e) => set("sleepSchedule", e.target.value)} />
        <Input label="Social lifestyle" hint="Optional" value={values.socialLifestyle} onChange={(e) => set("socialLifestyle", e.target.value)} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" isLoading={submitting}>
          Save and continue
        </Button>
      </div>
    </form>
  );
}
