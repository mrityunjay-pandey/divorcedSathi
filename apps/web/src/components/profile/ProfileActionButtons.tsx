"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api-client";
import type { Interest } from "@/types/profile";

export function ProfileActionButtons({ targetUserId }: { targetUserId: string }) {
  const { show } = useToast();
  const [interestSent, setInterestSent] = useState(false);
  const [shortlisted, setShortlisted] = useState(false);
  const [sendingInterest, setSendingInterest] = useState(false);
  const [shortlisting, setShortlisting] = useState(false);

  async function handleSendInterest() {
    setSendingInterest(true);
    try {
      await api.post<{ interest: Interest }>("/interests", { recipientId: targetUserId });
      setInterestSent(true);
      show({ title: "Interest sent", tone: "success" });
    } catch (err) {
      const alreadySent = err instanceof ApiError && err.code === "INTEREST_ALREADY_SENT";
      show({
        title: alreadySent ? "Already sent" : "Couldn't send interest",
        description: err instanceof ApiError ? err.message : undefined,
        tone: alreadySent ? "neutral" : "danger",
      });
      if (alreadySent) setInterestSent(true);
    } finally {
      setSendingInterest(false);
    }
  }

  async function handleToggleShortlist() {
    setShortlisting(true);
    try {
      if (shortlisted) {
        await api.delete<null>(`/shortlist/${targetUserId}`);
        setShortlisted(false);
        show({ title: "Removed from shortlist" });
      } else {
        await api.post<{ entry: unknown }>("/shortlist", { targetUserId });
        setShortlisted(true);
        show({ title: "Added to shortlist", tone: "success" });
      }
    } catch (err) {
      const alreadyShortlisted = err instanceof ApiError && err.code === "ALREADY_SHORTLISTED";
      if (alreadyShortlisted) {
        setShortlisted(true);
      } else {
        show({
          title: "Couldn't update shortlist",
          description: err instanceof ApiError ? err.message : undefined,
          tone: "danger",
        });
      }
    } finally {
      setShortlisting(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        onClick={handleSendInterest}
        isLoading={sendingInterest}
        disabled={interestSent}
        variant={interestSent ? "outline" : "primary"}
      >
        {interestSent ? "Interest Sent" : "Send Interest"}
      </Button>
      <Button size="sm" variant="outline" onClick={handleToggleShortlist} isLoading={shortlisting}>
        {shortlisted ? "Shortlisted" : "Shortlist"}
      </Button>
    </>
  );
}
