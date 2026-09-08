"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { api, ApiError } from "@/lib/api-client";
import type { MatchSummary } from "@/types/profile";

export default function MatchesPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<{ matches: MatchSummary[] }>("/matches");
        if (!cancelled) setMatches(data.matches);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Couldn't load your matches.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function openConversation(match: MatchSummary) {
    setOpeningId(match.matchId);
    try {
      const { conversation } = await api.post<{ conversation: { id: string } }>(`/matches/${match.matchId}/conversation`);
      router.push(`/messages/${conversation.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't open this conversation.");
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12">
      <div>
        <h1 className="text-2xl">Matches</h1>
        <p className="text-sm text-neutral-500">Profiles you've connected with after a mutual interest.</p>
      </div>

      {!matches && !error && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {error && <ErrorState title="Couldn't load your matches" description={error} />}

      {matches && matches.length === 0 && !error && (
        <EmptyState title="No matches yet" description="Accept an interest to create a match and start a conversation." />
      )}

      {matches && matches.length > 0 && (
        <div className="flex flex-col gap-3">
          {matches.map((match) => (
            <Card key={match.matchId} className="flex items-center justify-between">
              <CardContent>
                <p className="font-medium text-neutral-900">{match.otherUser.firstName}</p>
                <p className="text-xs text-neutral-500">Matched {new Date(match.createdAt).toLocaleDateString()}</p>
              </CardContent>
              <div className="p-6 pt-0 sm:p-0 sm:pr-6">
                <Button size="sm" isLoading={openingId === match.matchId} onClick={() => openConversation(match)}>
                  {match.conversationId ? "Open Chat" : "Start Chat"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
