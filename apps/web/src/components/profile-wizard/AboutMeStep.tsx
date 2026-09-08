"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { api, ApiError } from "@/lib/api-client";
import type { Profile } from "@/types/profile";

const PROMPTS = [
  "What kind of person are you?",
  "What are you looking for?",
  "What matters most to you in marriage?",
  "What does a happy marriage mean to you?",
  "What are your interests?",
];

const MAX_LENGTH = 2000;

export function AboutMeStep({ initial, onSaved }: { initial?: string; onSaved: () => void }) {
  const [aboutMe, setAboutMe] = useState(initial ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.patch<{ profile: Profile }>("/profiles/me", { aboutMe });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your About Me. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl">About Me</h2>
        <p className="text-sm text-neutral-500">
          Write in your own words — this is what other members will read first.
        </p>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <ul className="flex flex-col gap-1 rounded-md bg-neutral-50 p-4 text-sm text-neutral-600">
        {PROMPTS.map((prompt) => (
          <li key={prompt}>• {prompt}</li>
        ))}
      </ul>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="about-me" className="text-sm font-medium text-neutral-700">
          About Me
        </label>
        <textarea
          id="about-me"
          value={aboutMe}
          maxLength={MAX_LENGTH}
          onChange={(e) => setAboutMe(e.target.value)}
          rows={8}
          placeholder="Share a bit about who you are and what you're looking for…"
          className="rounded-md border border-neutral-300 bg-white p-3 text-base text-neutral-800 placeholder:text-neutral-400 focus:border-primary-400"
        />
        <p className="self-end text-xs text-neutral-400">
          {aboutMe.length} / {MAX_LENGTH}
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="submit" isLoading={submitting}>
          Save and continue
        </Button>
      </div>
    </form>
  );
}
