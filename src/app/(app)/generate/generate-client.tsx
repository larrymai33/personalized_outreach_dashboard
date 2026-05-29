"use client";

import { useState } from "react";
import Link from "next/link";
import {
  generateMessage,
  regenerate,
  rateMessage,
  toggleFavorite,
  deleteMessage,
} from "@/lib/actions/generation";
import { listOfferings } from "@/lib/actions/offerings";
import { listPrompts } from "@/lib/actions/prompts";
import { listProspects } from "@/lib/actions/prospects";

type Offering = Awaited<ReturnType<typeof listOfferings>>[number];
type Prompt = Awaited<ReturnType<typeof listPrompts>>[number];
type Prospect = Awaited<ReturnType<typeof listProspects>>[number];
type Message = Awaited<ReturnType<typeof generateMessage>>["message"];

type Props = {
  offerings: Offering[];
  prompts: Prompt[];
  prospects: Prospect[];
};

export default function GenerateClient({ offerings, prompts, prospects }: Props) {
  // Determine default prompt
  const defaultPrompt = prompts.find((p) => p.isDefault) ?? prompts[0] ?? null;

  const [offeringId, setOfferingId] = useState(offerings[0]?.id ?? "");
  const [promptId, setPromptId] = useState(defaultPrompt?.id ?? "");
  const [prospectId, setProspectId] = useState(prospects[0]?.id ?? "");
  const [tone, setTone] = useState("");

  // Result state
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  // In-flight states
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [ratingInFlight, setRatingInFlight] = useState(false);
  const [favoriteInFlight, setFavoriteInFlight] = useState(false);
  const [deleteInFlight, setDeleteInFlight] = useState(false);
  const [copied, setCopied] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Derive rating from message (single source of truth — no effect needed)
  const rating = message?.rating ?? 0;

  const canGenerate = !!offeringId && !!promptId && !!prospectId;
  const anyInFlight = generating || regenerating || ratingInFlight || favoriteInFlight || deleteInFlight;

  // Empty state check
  const missingOfferings = offerings.length === 0;
  const missingPrompts = prompts.length === 0;
  const missingProspects = prospects.length === 0;
  const hasMissing = missingOfferings || missingPrompts || missingProspects;

  async function handleGenerate() {
    if (!canGenerate || generating) return;
    setGenerating(true);
    setError(null);
    setMessage(null);
    setConversationId(null);
    try {
      const result = await generateMessage({ offeringId, promptId, prospectId, tone: tone.trim() || undefined });
      setConversationId(result.conversationId);
      setMessage(result.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRegenerate(useTone: boolean) {
    if (!conversationId || regenerating) return;
    setRegenerating(true);
    setError(null);
    try {
      const newMsg = await regenerate({
        conversationId,
        tone: useTone && tone.trim() ? tone.trim() : undefined,
      });
      setMessage(newMsg);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Regeneration failed. Please try again.");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleRate(stars: number) {
    if (!message || ratingInFlight) return;
    setRatingInFlight(true);
    const prevRating = message.rating;
    setMessage((m) => m ? { ...m, rating: stars } : m);
    try {
      await rateMessage({ id: message.id, rating: stars });
    } catch (e) {
      setMessage((m) => m ? { ...m, rating: prevRating } : m);
      setError(e instanceof Error ? e.message : "Failed to save rating.");
    } finally {
      setRatingInFlight(false);
    }
  }

  async function handleToggleFavorite() {
    if (!message || favoriteInFlight) return;
    setFavoriteInFlight(true);
    const prevFav = message.isFavorite;
    setMessage((m) => m ? { ...m, isFavorite: !m.isFavorite } : m);
    try {
      await toggleFavorite({ id: message.id });
    } catch (e) {
      setMessage((m) => m ? { ...m, isFavorite: prevFav } : m);
      setError(e instanceof Error ? e.message : "Failed to toggle favorite.");
    } finally {
      setFavoriteInFlight(false);
    }
  }

  async function handleDelete() {
    if (!message || deleteInFlight) return;
    setDeleteInFlight(true);
    setError(null);
    try {
      await deleteMessage(message.id);
      setMessage(null);
      setConversationId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete message.");
    } finally {
      setDeleteInFlight(false);
    }
  }

  async function handleCopy() {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  // Empty-state UI
  if (hasMissing) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-zinc-900">Before you generate</h2>
        <p className="text-sm text-zinc-500">
          You need at least one of each of the following to generate a message. Set up whichever are missing:
        </p>
        <ul className="space-y-2">
          {missingOfferings && (
            <li className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <span className="text-sm font-medium text-amber-800">No offerings yet.</span>
              <Link href="/offerings" className="ml-auto text-sm font-medium text-amber-700 underline hover:text-amber-900">
                Add an offering →
              </Link>
            </li>
          )}
          {missingPrompts && (
            <li className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <span className="text-sm font-medium text-amber-800">No prompt templates yet.</span>
              <Link href="/prompts" className="ml-auto text-sm font-medium text-amber-700 underline hover:text-amber-900">
                Add a prompt →
              </Link>
            </li>
          )}
          {missingProspects && (
            <li className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <span className="text-sm font-medium text-amber-800">No prospects yet.</span>
              <Link href="/prospects" className="ml-auto text-sm font-medium text-amber-700 underline hover:text-amber-900">
                Add a prospect →
              </Link>
            </li>
          )}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selectors panel */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-5">
        <h2 className="text-base font-semibold text-zinc-900">Configuration</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Offering */}
          <div className="flex flex-col gap-1">
            <label htmlFor="offering-select" className="text-sm font-medium text-zinc-700">
              Offering
            </label>
            <select
              id="offering-select"
              value={offeringId}
              onChange={(e) => setOfferingId(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            >
              {offerings.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          {/* Prompt */}
          <div className="flex flex-col gap-1">
            <label htmlFor="prompt-select" className="text-sm font-medium text-zinc-700">
              Prompt template
            </label>
            <select
              id="prompt-select"
              value={promptId}
              onChange={(e) => setPromptId(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            >
              {prompts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.isDefault ? " (default)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Prospect */}
          <div className="flex flex-col gap-1">
            <label htmlFor="prospect-select" className="text-sm font-medium text-zinc-700">
              Prospect
            </label>
            <select
              id="prospect-select"
              value={prospectId}
              onChange={(e) => setProspectId(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            >
              {prospects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tone */}
        <div className="flex flex-col gap-1">
          <label htmlFor="tone-input" className="text-sm font-medium text-zinc-700">
            Tone / angle <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <input
            id="tone-input"
            type="text"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            placeholder='e.g. "warmer", "more direct", "mention our pricing"'
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          />
        </div>

        {/* Generate button */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || anyInFlight}
            className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? "Generating…" : "Generate message"}
          </button>
          {generating && (
            <p className="text-sm text-zinc-500 animate-pulse">This may take a few seconds…</p>
          )}
        </div>
      </div>

      {/* Error banner */}
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

      {/* Result card */}
      {message && conversationId && (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          {/* Card header */}
          <div className="border-b border-zinc-100 px-6 py-4 flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-zinc-900">Generated message</h2>
            <div className="flex items-center gap-2 shrink-0">
              {/* Favorite toggle */}
              <button
                onClick={handleToggleFavorite}
                disabled={favoriteInFlight || anyInFlight}
                title={message.isFavorite ? "Remove from favorites" : "Save to favorites"}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                  message.isFavorite
                    ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                    : "border-zinc-300 text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {favoriteInFlight ? "…" : message.isFavorite ? "★ Favorited" : "☆ Favorite"}
              </button>

              {/* Copy */}
              <button
                onClick={handleCopy}
                disabled={anyInFlight}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
              >
                {copied ? "Copied!" : "Copy"}
              </button>

              {/* Delete */}
              <button
                onClick={handleDelete}
                disabled={deleteInFlight || anyInFlight}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {deleteInFlight ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>

          {/* Message body */}
          <div className="px-6 py-5">
            <p className="text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>

          {/* Rating + actions footer */}
          <div className="border-t border-zinc-100 px-6 py-4 space-y-4">
            {/* Star rating */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-zinc-500">Rate this message:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRate(star)}
                    disabled={ratingInFlight || anyInFlight}
                    title={`Rate ${star} star${star !== 1 ? "s" : ""}`}
                    className={`text-xl leading-none transition-colors disabled:opacity-50 ${
                      star <= rating
                        ? "text-amber-400 hover:text-amber-500"
                        : "text-zinc-300 hover:text-amber-300"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <span className="text-xs text-zinc-400">{rating}/5</span>
              )}
            </div>

            {/* Regenerate actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleRegenerate(false)}
                disabled={regenerating || generating}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {regenerating ? "Regenerating…" : "Regenerate"}
              </button>
              <button
                onClick={() => handleRegenerate(true)}
                disabled={regenerating || generating || !tone.trim()}
                title={!tone.trim() ? "Enter a tone/angle above to use this" : ""}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {regenerating ? "Regenerating…" : "Regenerate with tone"}
              </button>
              {regenerating && (
                <p className="text-xs text-zinc-400 animate-pulse">Working…</p>
              )}
            </div>

            {/* Open conversation link */}
            <div className="pt-1">
              <Link
                href={`/conversations/${conversationId}`}
                className="text-sm font-medium text-zinc-500 hover:text-zinc-900 underline transition-colors"
              >
                Open conversation →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
