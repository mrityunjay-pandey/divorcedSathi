"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { Tabs, TabList, Tab, TabPanel } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api-client";
import type { Interest, InterestStatus } from "@/types/profile";

function StatusBadge({ status }: { status: InterestStatus }) {
  if (status === "ACCEPTED") return <Badge tone="success">Accepted</Badge>;
  if (status === "DECLINED") return <Badge tone="neutral">Declined</Badge>;
  return <Badge tone="warning">Pending</Badge>;
}

function ReceivedInterestRow({ interest, onResponded }: { interest: Interest; onResponded: () => void }) {
  const { show } = useToast();
  const [responding, setResponding] = useState<"ACCEPTED" | "DECLINED" | null>(null);

  async function respond(response: "ACCEPTED" | "DECLINED") {
    setResponding(response);
    try {
      await api.post(`/interests/${interest.id}/respond`, { response });
      show({
        title: response === "ACCEPTED" ? "Interest accepted — you're now matched" : "Interest declined",
        tone: response === "ACCEPTED" ? "success" : "neutral",
      });
      onResponded();
    } catch (err) {
      show({ title: "Couldn't respond", description: err instanceof ApiError ? err.message : undefined, tone: "danger" });
    } finally {
      setResponding(null);
    }
  }

  return (
    <Card className="flex items-center justify-between">
      <CardContent className="flex items-center gap-3">
        <span className="text-sm text-neutral-700">Interest from a member</span>
        <StatusBadge status={interest.status} />
      </CardContent>
      {interest.status === "PENDING" && (
        <div className="flex gap-2 p-6 pt-0 sm:p-0 sm:pr-6">
          <Button size="sm" isLoading={responding === "ACCEPTED"} onClick={() => respond("ACCEPTED")}>
            Accept
          </Button>
          <Button size="sm" variant="outline" isLoading={responding === "DECLINED"} onClick={() => respond("DECLINED")}>
            Decline
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function InterestsPage() {
  const [received, setReceived] = useState<Interest[] | null>(null);
  const [sent, setSent] = useState<Interest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [receivedData, sentData] = await Promise.all([
        api.get<{ interests: Interest[] }>("/interests/received"),
        api.get<{ interests: Interest[] }>("/interests/sent"),
      ]);
      setReceived(receivedData.interests);
      setSent(sentData.interests);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load your interests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12">
      <div>
        <h1 className="text-2xl">Interests</h1>
        <p className="text-sm text-neutral-500">Manage interests you've sent and received.</p>
      </div>

      {loading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {!loading && error && <ErrorState title="Couldn't load your interests" description={error} />}

      {!loading && !error && received && sent && (
        <Tabs defaultValue="received">
          <TabList>
            <Tab value="received">Received ({received.length})</Tab>
            <Tab value="sent">Sent ({sent.length})</Tab>
          </TabList>

          <TabPanel value="received">
            {received.length === 0 ? (
              <EmptyState title="No interests yet" description="When someone sends you an interest, it'll show up here." />
            ) : (
              <div className="flex flex-col gap-3">
                {received.map((interest) => (
                  <ReceivedInterestRow key={interest.id} interest={interest} onResponded={load} />
                ))}
              </div>
            )}
          </TabPanel>

          <TabPanel value="sent">
            {sent.length === 0 ? (
              <EmptyState title="You haven't sent any interests yet" description="Browse Search or Discover to find profiles." />
            ) : (
              <div className="flex flex-col gap-3">
                {sent.map((interest) => (
                  <Card key={interest.id} className="flex items-center justify-between">
                    <CardContent className="flex items-center gap-3">
                      <span className="text-sm text-neutral-700">Interest sent</span>
                      <StatusBadge status={interest.status} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabPanel>
        </Tabs>
      )}
    </main>
  );
}
