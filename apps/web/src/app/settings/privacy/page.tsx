"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { Alert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Skeleton";
import { api, ApiError } from "@/lib/api-client";
import { VISIBILITY_OPTIONS, type PrivacySettings, type VisibilityLevel } from "@/types/profile";

const FIELD_LABELS: { key: keyof PrivacySettings; label: string; description: string }[] = [
  { key: "incomeVisibility", label: "Income", description: "Who can see your income range." },
  { key: "divorceDetailsVisibility", label: "Divorce details", description: "Exact years and additional notes — the summary badge is always shown." },
  { key: "childrenDetailsVisibility", label: "Children details", description: "Number of children and living arrangement." },
  { key: "photoVisibility", label: "Photos", description: "Who can see your profile photos." },
  { key: "contactVisibility", label: "Contact information", description: "Reserved for a future direct-contact feature — your email and mobile are never shown to other members regardless of this setting." },
];

export default function PrivacySettingsPage() {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function load() {
    try {
      const { settings } = await api.get<{ settings: PrivacySettings }>("/privacy-settings/me");
      setSettings(settings);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load privacy settings.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  function setField<K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const { profileId, ...update } = settings;
      await api.put("/privacy-settings/me", update);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your privacy settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <div>
        <h1 className="text-2xl">Privacy Settings</h1>
        <p className="text-sm text-neutral-500">Control who sees your sensitive information.</p>
      </div>

      {!settings && !error && <Skeleton className="h-64 w-full" />}
      {error && <Alert tone="danger">{error}</Alert>}
      {saved && <Alert tone="success">Your privacy settings have been saved.</Alert>}

      {settings && (
        <>
          <div className="flex flex-col gap-4">
            {FIELD_LABELS.map(({ key, label, description }) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle>{label}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Dropdown
                    label="Visible to"
                    items={VISIBILITY_OPTIONS}
                    value={settings[key] as VisibilityLevel}
                    onChange={(v) => setField(key, v as PrivacySettings[typeof key])}
                  />
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardHeader>
                <CardTitle>Photo requests</CardTitle>
              </CardHeader>
              <CardContent>
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={settings.requirePhotoRequestApproval}
                    onChange={(e) => setField("requirePhotoRequestApproval", e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300"
                  />
                  Require my approval before someone can view my private photos
                </label>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} isLoading={saving}>
              Save changes
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
