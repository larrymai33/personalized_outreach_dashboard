"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addReplyAndRespond,
  rateMessage,
  toggleFavorite,
  deleteMessage,
} from "@/lib/actions/generation";

type Message = {
  id: string;
  kind: "outbound" | "inbound";
  content: string;
  tone: string | null;
  model: string | null;
  rating: number | null;
  isFavorite: boolean;
  createdAt: Date;
};

type Props = {
  conversationId: string;
  initialMessages: Message[];
};

function StarRating({
  messageId,
  initialRating,
  disabled,
}: {
  messageId: string;
  initialRating: number | null;
  disabled: boolean;
}) {
  const [rating, setRating] = useState(initialRating ?? 0);
  const [inFlight, setInFlight] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRate(stars: number) {
    if (inFlight || disabled) return;
    const prev = rating;
    setRating(stars);
    setInFlight(true);
    setError(null);
    try {
      await rateMessage({ id: messageId, rating: stars });
    } catch (e) {
      setRating(prev);
      setError(e instanceof Error ? e.message : "Failed to save rating.");
    } finally {
      setInFlight(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleRate(star)}
            disabled={inFlight || disabled}
            title={`Rate ${star} star${star !== 1 ? "s" : ""}`}
            className={`text-lg leading-none transition-colors disabled:opacity-50 ${
              star <= rating
                ? "text-amber-400 hover:text-amber-500"
                : "text-zinc-300 hover:text-amber-300"
            }`}
          >
            ★
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-1 text-xs text-zinc-400">{rating}/5</span>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function MessageBubble({
  message,
  onDelete,
  anyInFlight,
}: {
  message: Message;
  onDelete: (id: string) => void;
  anyInFlight: boolean;
}) {
  const isOutbound = message.kind === "outbound";
  const [copied, setCopied] = useState(false);
  const [favInFlight, setFavInFlight] = useState(false);
  const [isFavorite, setIsFavorite] = useState(message.isFavorite);
  const [deleteInFlight, setDeleteInFlight] = useState(false);
  const [favError, setFavError] = useState<string | null>(null);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silently fail
    }
  }

  async function handleToggleFavorite() {
    if (favInFlight || anyInFlight) return;
    const prev = isFavorite;
    setIsFavorite(!isFavorite);
    setFavInFlight(true);
    setFavError(null);
    try {
      await toggleFavorite({ id: message.id });
    } catch (e) {
      setIsFavorite(prev);
      setFavError(e instanceof Error ? e.message : "Failed to toggle favorite.");
    } finally {
      setFavInFlight(false);
    }
  }

  async function handleDelete() {
    if (deleteInFlight || anyInFlight) return;
    setDeleteInFlight(true);
    try {
      await deleteMessage(message.id);
      onDelete(message.id);
    } catch {
      setDeleteInFlight(false);
    }
  }

  if (isOutbound) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-zinc-900 px-4 py-3 shadow-sm">
          <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
        {/* Actions row */}
        <div className="flex flex-wrap items-center gap-2 pr-1">
          <StarRating
            messageId={message.id}
            initialRating={message.rating}
            disabled={anyInFlight}
          />
          <button
            onClick={handleCopy}
            className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={handleToggleFavorite}
            disabled={favInFlight || anyInFlight}
            className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
              isFavorite
                ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {favInFlight ? "…" : isFavorite ? "★ Saved" : "☆ Save"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteInFlight || anyInFlight}
            className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {deleteInFlight ? "Deleting…" : "Delete"}
          </button>
        </div>
        {favError && <p className="text-xs text-red-600 pr-1">{favError}</p>}
      </div>
    );
  }

  // Inbound (prospect reply)
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-zinc-100 border border-zinc-200 px-4 py-3 shadow-sm">
        <p className="text-xs font-medium text-zinc-400 mb-1">Prospect reply</p>
        <p className="text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
      </div>
    </div>
  );
}

export default function ConversationClient({
  conversationId,
  initialMessages,
}: Props) {
  const router = useRouter();
  // Track locally deleted messages so they disappear immediately without waiting
  // for a server round-trip. router.refresh() updates initialMessages from the
  // server, so we derive the rendered list from props + this overlay — no effect needed.
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const messages = initialMessages.filter((m) => !deletedIds.has(m.id));
  const [replyText, setReplyText] = useState("");
  const [tone, setTone] = useState("");
  const [sending, startSending] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDeleteMessage(id: string) {
    setDeletedIds((prev) => new Set(prev).add(id));
  }

  async function handleSendReply() {
    const trimmed = replyText.trim();
    if (!trimmed || sending) return;
    setError(null);

    startSending(async () => {
      try {
        await addReplyAndRespond({
          conversationId,
          replyText: trimmed,
          tone: tone.trim() || undefined,
        });
        setReplyText("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to send reply.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Thread */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        {messages.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-zinc-400">No messages yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 px-6 py-6">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onDelete={handleDeleteMessage}
                anyInFlight={sending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Reply composer */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-zinc-900">Add prospect reply</h2>

        {/* Reply textarea */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="reply-text"
            className="text-sm font-medium text-zinc-700"
          >
            Paste the prospect&apos;s reply
          </label>
          <textarea
            id="reply-text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            disabled={sending}
            rows={5}
            placeholder="Paste the prospect's reply here…"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 resize-y focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent disabled:opacity-60"
          />
        </div>

        {/* Tone input */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="reply-tone"
            className="text-sm font-medium text-zinc-700"
          >
            Tone / angle{" "}
            <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <input
            id="reply-tone"
            type="text"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            disabled={sending}
            placeholder='e.g. "more empathetic", "address their concern directly"'
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent disabled:opacity-60"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start justify-between gap-3">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 shrink-0 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Send button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSendReply}
            disabled={!replyText.trim() || sending}
            className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? "Generating reply…" : "Send & generate reply"}
          </button>
          {sending && (
            <p className="text-sm text-zinc-500 animate-pulse">
              This may take a few seconds…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
