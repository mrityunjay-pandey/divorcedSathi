"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { Tabs, TabList, Tab, TabPanel } from "@/components/ui/Tabs";
import { ProfileActionButtons } from "@/components/profile/ProfileActionButtons";
import { api, ApiError } from "@/lib/api-client";
import type { DiscoveryCard, DiscoveryDashboard } from "@/types/profile";

function CompatibilityBadge({ card }: { card: DiscoveryCard }) {
  if (!card.compatibility) return null;
  return (
    <span title={card.compatibility.basis}>
      <Badge tone="primary">Compatibility: {card.compatibility.total}%</Badge>
    </span>
  );
}

function ProfileCard({ card }: { card: DiscoveryCard }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {card.firstName}, {card.age}
        </CardTitle>
        <CardDescription>
          {[card.city, card.state].filter(Boolean).join(", ")}
          {card.previousMarriage && " · Previously married"}
          {card.previousMarriage?.divorceFinalized && " · Divorce finalized"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        {card.profession && <p>{card.profession}</p>}
        {card.education && <p className="text-neutral-500">{card.education}</p>}
        <CompatibilityBadge card={card} />
      </CardContent>
      <CardFooter>
        <ProfileActionButtons targetUserId={card.userId} />
      </CardFooter>
    </Card>
  );
}

export default function DiscoverPage() {
  const [dashboard, setDashboard] = useState<DiscoveryDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<DiscoveryDashboard>("/discover");
        if (!cancelled) setDashboard(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Couldn't load your matches.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12">
      <div>
        <h1 className="text-2xl">Discover</h1>
        <p className="text-sm text-neutral-500">
          Compatibility scores are based on the preferences you've provided — not a prediction of
          how well a marriage would work.
        </p>
      </div>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {!loading && error && <ErrorState title="Couldn't load your matches" description={error} />}

      {!loading && !error && dashboard && (
        <Tabs defaultValue="recommended">
          <TabList>
            <Tab value="recommended">Recommended for You</Tab>
            <Tab value="new">New Matches</Tab>
          </TabList>

          <TabPanel value="recommended">
            {dashboard.recommended.length === 0 ? (
              <EmptyState
                title="No recommendations yet"
                description="Set your partner preferences to get personalized matches."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {dashboard.recommended.map((card) => (
                  <ProfileCard key={card.profileId} card={card} />
                ))}
              </div>
            )}
          </TabPanel>

          <TabPanel value="new">
            {dashboard.newProfiles.length === 0 ? (
              <EmptyState title="No new profiles right now" description="Check back soon." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {dashboard.newProfiles.map((card) => (
                  <ProfileCard key={card.profileId} card={card} />
                ))}
              </div>
            )}
          </TabPanel>
        </Tabs>
      )}
    </main>
  );
}
