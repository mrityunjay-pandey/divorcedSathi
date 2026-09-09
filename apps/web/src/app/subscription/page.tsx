"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api-client";
import type { SubscriptionInfo } from "@/types/profile";

const PREMIUM_FEATURES = [
  "Unlimited interests (Free plan is capped at 5/day)",
  "Advanced filters",
  "See who shortlisted you",
  "Enhanced visibility",
  "Private photo requests",
  "Advanced compatibility insights",
  "Profile boost",
];

export default function SubscriptionPage() {
  const { show } = useToast();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  async function load() {
    try {
      const { subscription } = await api.get<{ subscription: SubscriptionInfo }>("/subscription/me");
      setSubscription(subscription);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load your subscription.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpgrade() {
    setUpgrading(true);
    try {
      const order = await api.post<{ orderId: string; amountMinorUnits: number; currency: string }>("/subscription/upgrade");
      // No real payment gateway is integrated yet (Module 16 known limitation) —
      // this calls the mock confirmation endpoint directly to demonstrate the
      // flow end-to-end. A real integration would redirect to the provider's
      // checkout here instead.
      await api.post("/subscription/confirm", { orderId: order.orderId });
      show({ title: "Welcome to Premium!", tone: "success" });
      await load();
    } catch (err) {
      show({ title: "Upgrade failed", description: err instanceof ApiError ? err.message : undefined, tone: "danger" });
    } finally {
      setUpgrading(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <div>
        <h1 className="text-2xl">Subscription</h1>
        <p className="text-sm text-neutral-500">
          Core safety features — blocking, reporting, and messaging with your matches — are never
          paywalled.
        </p>
      </div>

      {!subscription && !error && <Skeleton className="h-40 w-full" />}
      {error && <Alert tone="danger">{error}</Alert>}

      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Current plan
              <Badge tone={subscription.plan === "PREMIUM" ? "primary" : "neutral"}>{subscription.plan}</Badge>
            </CardTitle>
            {subscription.currentPeriodEnd && (
              <CardDescription>Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</CardDescription>
            )}
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Premium</CardTitle>
          <CardDescription>₹999/month</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-1 text-sm text-neutral-700">
            {PREMIUM_FEATURES.map((feature) => (
              <li key={feature}>• {feature}</li>
            ))}
          </ul>
        </CardContent>
        <CardFooter>
          {subscription?.plan === "PREMIUM" ? (
            <Badge tone="success">You're on Premium</Badge>
          ) : (
            <Button onClick={handleUpgrade} isLoading={upgrading}>
              Upgrade to Premium
            </Button>
          )}
        </CardFooter>
      </Card>

      <Alert tone="info">
        No real payment gateway is connected yet — upgrading here uses a mock provider for
        development. A production integration (UPI, cards, net banking) would replace this flow
        with a redirect to the provider's checkout.
      </Alert>
    </main>
  );
}
