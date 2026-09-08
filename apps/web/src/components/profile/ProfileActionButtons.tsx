"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Dropdown } from "@/components/ui/Dropdown";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api-client";
import { REPORT_REASON_OPTIONS, type Interest, type ReportReason } from "@/types/profile";

export function ProfileActionButtons({ targetUserId }: { targetUserId: string }) {
  const { show } = useToast();
  const [interestSent, setInterestSent] = useState(false);
  const [shortlisted, setShortlisted] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [sendingInterest, setSendingInterest] = useState(false);
  const [shortlisting, setShortlisting] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>("OTHER");
  const [reportDescription, setReportDescription] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

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

  async function handleBlock() {
    if (!window.confirm("Block this profile? They won't be able to contact you, and you won't see each other in search anymore.")) {
      return;
    }
    setBlocking(true);
    try {
      await api.post("/blocks", { targetUserId });
      setBlocked(true);
      show({ title: "Profile blocked" });
    } catch (err) {
      const already = err instanceof ApiError && err.code === "ALREADY_BLOCKED";
      if (already) {
        setBlocked(true);
      } else {
        show({ title: "Couldn't block this profile", description: err instanceof ApiError ? err.message : undefined, tone: "danger" });
      }
    } finally {
      setBlocking(false);
    }
  }

  async function handleSubmitReport() {
    setSubmittingReport(true);
    try {
      await api.post("/reports", { reportedUserId: targetUserId, reason: reportReason, description: reportDescription || undefined });
      show({ title: "Report submitted", description: "Our moderation team will review it.", tone: "success" });
      setReportModalOpen(false);
      setReportDescription("");
    } catch (err) {
      show({ title: "Couldn't submit report", description: err instanceof ApiError ? err.message : undefined, tone: "danger" });
    } finally {
      setSubmittingReport(false);
    }
  }

  if (blocked) {
    return <span className="text-sm text-neutral-400">Blocked</span>;
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
      <Button size="sm" variant="ghost" onClick={() => setReportModalOpen(true)}>
        Report
      </Button>
      <Button size="sm" variant="ghost" onClick={handleBlock} isLoading={blocking}>
        Block
      </Button>

      <Modal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title="Report this profile"
        description="Tell us what's wrong. Our moderation team reviews every report."
      >
        <div className="flex flex-col gap-4">
          <Dropdown
            label="Reason"
            items={REPORT_REASON_OPTIONS}
            value={reportReason}
            onChange={(v) => setReportReason(v as ReportReason)}
          />
          <textarea
            value={reportDescription}
            onChange={(e) => setReportDescription(e.target.value)}
            placeholder="Optional details"
            rows={3}
            maxLength={2000}
            className="rounded-md border border-neutral-300 bg-white p-3 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-400"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReportModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleSubmitReport} isLoading={submittingReport}>
              Submit report
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
