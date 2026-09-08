"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { api, ApiError } from "@/lib/api-client";
import type { BlockedUser } from "@/types/profile";

export default function BlockedUsersPage() {
  const [blocks, setBlocks] = useState<BlockedUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  async function load() {
    try {
      const { blocks } = await api.get<{ blocks: BlockedUser[] }>("/blocks");
      setBlocks(blocks);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load blocked users.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUnblock(blockedUserId: string) {
    setUnblockingId(blockedUserId);
    try {
      await api.delete(`/blocks/${blockedUserId}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't unblock this user.");
    } finally {
      setUnblockingId(null);
    }
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <div>
        <h1 className="text-2xl">Blocked Profiles</h1>
        <p className="text-sm text-neutral-500">
          Blocked profiles can't message you, send you interests, or see your profile in search.
        </p>
      </div>

      {!blocks && !error && <Skeleton className="h-24 w-full" />}
      {error && <ErrorState title="Couldn't load blocked users" description={error} />}

      {blocks && blocks.length === 0 && !error && (
        <EmptyState title="No blocked profiles" description="Profiles you block will appear here." />
      )}

      {blocks && blocks.length > 0 && (
        <div className="flex flex-col gap-3">
          {blocks.map((block) => (
            <Card key={block.id} className="flex items-center justify-between">
              <CardContent>
                <p className="text-sm text-neutral-700">Blocked {new Date(block.createdAt).toLocaleDateString()}</p>
              </CardContent>
              <div className="p-6 pt-0 sm:p-0 sm:pr-6">
                <Button
                  size="sm"
                  variant="outline"
                  isLoading={unblockingId === block.blockedUserId}
                  onClick={() => handleUnblock(block.blockedUserId)}
                >
                  Unblock
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
