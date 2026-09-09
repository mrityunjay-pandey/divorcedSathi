"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { api, ApiError } from "@/lib/api-client";
import type { ProfilePhotoItem } from "@/types/profile";

/**
 * No real file-upload widget is built here — there's no object-storage
 * integration to upload to yet (see docs/ARCHITECTURE.md). The "storage
 * reference" field mirrors the same honest placeholder pattern used on
 * the Verification page: it's a text stand-in for what a real presigned
 * upload flow would produce, not a fake picker pretending to work.
 */
export function PhotosStep({ onSaved }: { onSaved: () => void }) {
  const [photos, setPhotos] = useState<ProfilePhotoItem[] | null>(null);
  const [reference, setReference] = useState("");
  const [caption, setCaption] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const { photos } = await api.get<{ photos: ProfilePhotoItem[] }>("/profiles/me/photos");
      setPhotos(photos);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load your photos.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd() {
    if (!reference.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await api.post("/profiles/me/photos", { storageKey: reference, caption: caption || undefined });
      setReference("");
      setCaption("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add that photo.");
    } finally {
      setAdding(false);
    }
  }

  async function handleSetPrimary(id: string) {
    setBusyId(id);
    try {
      await api.post(`/profiles/me/photos/${id}/primary`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update your primary photo.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(id: string) {
    setBusyId(id);
    try {
      await api.delete(`/profiles/me/photos/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't remove that photo.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl">Photos</h2>
        <p className="text-sm text-neutral-500">
          Add up to 10 photos. Who can see them is controlled from Settings → Privacy.
        </p>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <Alert tone="info">
        Real photo upload isn't wired up yet — there's no object storage connected. This is a
        placeholder for the storage reference a real upload flow would produce.
      </Alert>

      {photos && photos.length > 0 && (
        <div className="flex flex-col gap-2">
          {photos.map((photo) => (
            <Card key={photo.id}>
              <CardContent className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-neutral-100 text-xs text-neutral-400">
                    IMG
                  </div>
                  <div>
                    <p className="text-sm text-neutral-700">{photo.caption || photo.storageKey}</p>
                    {photo.isPrimary && <Badge tone="primary">Primary</Badge>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!photo.isPrimary && (
                    <Button size="sm" variant="outline" isLoading={busyId === photo.id} onClick={() => handleSetPrimary(photo.id)}>
                      Make Primary
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" isLoading={busyId === photo.id} onClick={() => handleRemove(photo.id)}>
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-md border border-dashed border-neutral-300 p-4">
        <Input
          label="Storage reference"
          hint="Placeholder — a real upload flow would fill this automatically"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
        <Input label="Caption" hint="Optional" value={caption} onChange={(e) => setCaption(e.target.value)} />
        <Button onClick={handleAdd} isLoading={adding} disabled={!reference.trim()}>
          Add Photo
        </Button>
      </div>

      <div className="flex justify-end">
        <Button onClick={onSaved} variant="outline">
          Continue
        </Button>
      </div>
    </div>
  );
}
