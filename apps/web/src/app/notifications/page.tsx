"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { api, ApiError } from "@/lib/api-client";
import type { AppNotification, NotificationType } from "@/types/profile";

const LABELS: Record<NotificationType, string> = {
  INTEREST_RECEIVED: "You received a new interest",
  INTEREST_ACCEPTED: "Your interest was accepted — you're matched!",
  NEW_MESSAGE: "You have a new message",
  PROFILE_VIEWED: "Someone viewed your profile",
  PHOTO_REQUEST: "Someone requested access to your private photos",
  VERIFICATION_COMPLETED: "Your verification is complete",
  SUBSCRIPTION_ACTIVATED: "Your subscription is now active",
  SECURITY_ALERT: "Security alert on your account",
};

// Where tapping each notification type should take the user. Falls back to
// staying on this page for types with no dedicated destination yet.
function linkFor(notification: AppNotification): string | null {
  switch (notification.type) {
    case "INTEREST_RECEIVED":
    case "INTEREST_ACCEPTED":
      return "/interests";
    case "NEW_MESSAGE":
      return typeof notification.payload?.conversationId === "string"
        ? `/messages/${notification.payload.conversationId}`
        : "/matches";
    default:
      return null;
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  async function load() {
    try {
      const data = await api.get<{ notifications: AppNotification[] }>("/notifications");
      setNotifications(data.notifications);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load notifications.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleOpen(notification: AppNotification) {
    if (!notification.readAt) {
      await api.post(`/notifications/${notification.id}/read`).catch(() => undefined);
    }
    const href = linkFor(notification);
    if (href) router.push(href);
    else load();
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      await api.post("/notifications/read-all");
      await load();
    } finally {
      setMarkingAll(false);
    }
  }

  const unreadCount = notifications?.filter((n) => !n.readAt).length ?? 0;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl">Notifications</h1>
          <p className="text-sm text-neutral-500">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" isLoading={markingAll} onClick={handleMarkAllRead}>
            Mark all read
          </Button>
        )}
      </div>

      {!notifications && !error && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}

      {error && <ErrorState title="Couldn't load notifications" description={error} />}

      {notifications && notifications.length === 0 && !error && (
        <EmptyState title="No notifications yet" description="Activity on your account will show up here." />
      )}

      {notifications && notifications.length > 0 && (
        <div className="flex flex-col gap-2">
          {notifications.map((notification) => (
            <button key={notification.id} onClick={() => handleOpen(notification)} className="text-left">
              <Card className={notification.readAt ? "opacity-70" : ""}>
                <CardContent className="flex items-center justify-between gap-3">
                  <span className="text-sm text-neutral-800">{LABELS[notification.type]}</span>
                  <div className="flex items-center gap-2">
                    {!notification.readAt && <Badge tone="primary">New</Badge>}
                    <span className="text-xs text-neutral-400">{new Date(notification.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
