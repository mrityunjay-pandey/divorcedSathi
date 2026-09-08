"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";
import { cn } from "@/lib/cn";
import { api, ApiError, getCurrentUserId } from "@/lib/api-client";
import type { ChatMessage } from "@/types/profile";

export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const conversationId = params.id;
  const currentUserId = getCurrentUserId();

  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const data = await api.get<{ messages: ChatMessage[] }>(`/conversations/${conversationId}/messages`);
      setMessages(data.messages);
      await api.post(`/conversations/${conversationId}/read`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load this conversation.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    try {
      await api.post(`/conversations/${conversationId}/messages`, { content: draft });
      setDraft("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send that message.");
    } finally {
      setSending(false);
    }
  }

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <ErrorState title="Couldn't load this conversation" description={error} action={<Button onClick={() => router.push("/matches")}>Back to Matches</Button>} />
      </main>
    );
  }

  if (!messages) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-3 px-6 py-16">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-12 w-1/2 self-end" />
        <Skeleton className="h-12 w-2/3" />
      </main>
    );
  }

  return (
    <main className="mx-auto flex h-screen max-w-2xl flex-col px-6 py-8">
      <Alert tone="info" className="mb-4">
        Take your time getting to know each other. Never send money to someone you've met here.
      </Alert>

      <div className="flex-1 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-neutral-400">Say hello to start the conversation.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((message) => {
              const isMine = message.senderId === currentUserId;
              return (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                    isMine ? "self-end bg-primary-600 text-white" : "self-start bg-neutral-100 text-neutral-800",
                  )}
                >
                  {message.content}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="mt-4 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          maxLength={4000}
          className="h-11 flex-1 rounded-md border border-neutral-300 bg-white px-3 text-base text-neutral-800 placeholder:text-neutral-400 focus:border-primary-400"
        />
        <Button type="submit" isLoading={sending} disabled={!draft.trim()}>
          Send
        </Button>
      </form>
    </main>
  );
}
