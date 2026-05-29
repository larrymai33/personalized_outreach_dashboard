"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createOffering,
  updateOffering,
  deleteOffering,
  extractOfferingFromUrl,
  listOfferings,
} from "@/lib/actions/offerings";

type Offering = Awaited<ReturnType<typeof listOfferings>>[number];

type OfferingsClientProps = {
  initial: Offering[];
};

export default function OfferingsClient({ initial }: OfferingsClientProps) {
  const router = useRouter();

  // List state
  const [offerings, setOfferings] = useState<Offering[]>(initial);

  // Per-card delete in-flight tracking
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Editor state
  const [editing, setEditing] = useState<Offering | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Editor field values
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  // Scrape state
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // AI explain state
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);

  // AI improve state
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [improving, setImproving] = useState(false);
  const [improveError, setImproveError] = useState<string | null>(null);

  function openNew() {
    setEditing(null);
    setIsNew(true);
    setName("");
    setContent("");
    setSourceUrl("");
    setScrapeUrl("");
    setScrapeError(null);
    setSaveError(null);
    setExplanation(null);
    setExplainError(null);
    setSuggestion(null);
    setImproveError(null);
  }

  function openEdit(o: Offering) {
    setEditing(o);
    setIsNew(false);
    setName(o.name);
    setContent(o.content ?? "");
    setSourceUrl(o.sourceUrl ?? "");
    setScrapeUrl(o.sourceUrl ?? "");
    setScrapeError(null);
    setSaveError(null);
    setExplanation(null);
    setExplainError(null);
    setSuggestion(null);
    setImproveError(null);
  }

  function closeEditor() {
    setEditing(null);
    setIsNew(false);
    setScrapeError(null);
    setSaveError(null);
    setExplanation(null);
    setExplainError(null);
    setSuggestion(null);
    setImproveError(null);
  }

  async function handleDelete(id: string) {
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await deleteOffering(id);
      router.refresh();
      setOfferings((prev) => prev.filter((o) => o.id !== id));
    } catch {
      // surface error via alert as a fallback; could be improved
      alert("Failed to delete offering. Please try again.");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleScrape() {
    if (!scrapeUrl.trim()) return;
    setScraping(true);
    setScrapeError(null);
    try {
      const extracted = await extractOfferingFromUrl(scrapeUrl.trim());
      setContent((prev) =>
        prev.trim() ? prev.trim() + "\n\n" + extracted : extracted
      );
      setSourceUrl(scrapeUrl.trim());
    } catch (e) {
      setScrapeError(e instanceof Error ? e.message : "Failed to extract from URL.");
    } finally {
      setScraping(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      setSaveError("Name is required.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      if (editing && !isNew) {
        await updateOffering({
          id: editing.id,
          name: name.trim(),
          content,
          sourceUrl: sourceUrl.trim() || undefined,
        });
      } else {
        await createOffering({
          name: name.trim(),
          content,
          sourceUrl: sourceUrl.trim() || undefined,
        });
      }
      router.refresh();
      closeEditor();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save offering.");
    } finally {
      setSaving(false);
    }
  }

  async function handleExplain() {
    setExplaining(true);
    setExplainError(null);
    setExplanation(null);
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "offering" }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setExplainError(data.error ?? "AI request failed.");
        return;
      }
      setExplanation(data.text);
    } catch {
      setExplainError("Network error. Please try again.");
    } finally {
      setExplaining(false);
    }
  }

  async function handleImprove() {
    setImproving(true);
    setImproveError(null);
    setSuggestion(null);
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "offering", mode: "improve", current: content }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setImproveError(data.error ?? "AI request failed.");
        return;
      }
      setSuggestion(data.text);
    } catch {
      setImproveError("Network error. Please try again.");
    } finally {
      setImproving(false);
    }
  }

  function applySuggestion() {
    if (suggestion) {
      setContent(suggestion);
      setSuggestion(null);
    }
  }

  const editorOpen = isNew || editing !== null;

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {offerings.length === 0 ? "No offerings yet." : `${offerings.length} offering${offerings.length !== 1 ? "s" : ""}`}
        </p>
        {!editorOpen && (
          <button
            onClick={openNew}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
          >
            + New offering
          </button>
        )}
      </div>

      {/* Offering cards */}
      {offerings.length > 0 && (
        <ul className="space-y-3">
          {offerings.map((o) => {
            const isDeleting = deletingIds.has(o.id);
            const snippet = (o.content ?? "").slice(0, 140);
            return (
              <li
                key={o.id}
                className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-zinc-900 truncate">{o.name}</h3>
                    {snippet && (
                      <p className="mt-1 text-sm text-zinc-500 line-clamp-2">
                        {snippet}{(o.content ?? "").length > 140 ? "…" : ""}
                      </p>
                    )}
                    {o.sourceUrl && (
                      <p className="mt-1 text-xs text-zinc-400 truncate">{o.sourceUrl}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEdit(o)}
                      disabled={isDeleting}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(o.id)}
                      disabled={isDeleting}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {isDeleting ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Editor panel */}
      {editorOpen && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900">
              {isNew ? "New offering" : "Edit offering"}
            </h2>
            <button
              onClick={closeEditor}
              className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1">
            <label htmlFor="offering-name" className="text-sm font-medium text-zinc-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="offering-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Enterprise SaaS package"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            />
          </div>

          {/* Scrape URL */}
          <div className="flex flex-col gap-1">
            <label htmlFor="scrape-url" className="text-sm font-medium text-zinc-700">
              Import from URL
            </label>
            <div className="flex gap-2">
              <input
                id="scrape-url"
                type="url"
                value={scrapeUrl}
                onChange={(e) => setScrapeUrl(e.target.value)}
                placeholder="https://yourcompany.com/product"
                className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              />
              <button
                onClick={handleScrape}
                disabled={scraping || !scrapeUrl.trim()}
                className="shrink-0 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {scraping ? "Extracting…" : "Scrape & extract"}
              </button>
            </div>
            {scrapeError && (
              <p className="text-sm text-red-600">{scrapeError}</p>
            )}
          </div>

          {/* Content */}
          <div className="flex flex-col gap-1">
            <label htmlFor="offering-content" className="text-sm font-medium text-zinc-700">
              Content
            </label>
            <textarea
              id="offering-content"
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe your offering — what you do, who you sell to, the problem you solve, what makes you different…"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-y"
            />

            {/* AI help buttons */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <button
                onClick={handleExplain}
                disabled={explaining || improving}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
              >
                {explaining ? "Loading…" : "What's an offering?"}
              </button>
              <button
                onClick={handleImprove}
                disabled={improving || explaining || !content.trim()}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
              >
                {improving ? "Improving…" : "Improve with AI"}
              </button>
            </div>

            {/* Explanation box */}
            {explanation && (
              <div className="mt-3 rounded-lg bg-blue-50 border border-blue-100 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-blue-800 leading-relaxed">{explanation}</p>
                  <button
                    onClick={() => setExplanation(null)}
                    className="text-blue-400 hover:text-blue-600 shrink-0 text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
            {explainError && (
              <p className="text-sm text-red-600 mt-1">{explainError}</p>
            )}

            {/* Suggestion box */}
            {suggestion && (
              <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">AI suggestion</p>
                  <button
                    onClick={() => setSuggestion(null)}
                    className="text-amber-400 hover:text-amber-600 shrink-0 text-xs"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">{suggestion}</p>
                <button
                  onClick={applySuggestion}
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
                >
                  Apply suggestion
                </button>
              </div>
            )}
            {improveError && (
              <p className="text-sm text-red-600 mt-1">{improveError}</p>
            )}
          </div>

          {/* Save / error */}
          {saveError && (
            <p className="text-sm text-red-600">{saveError}</p>
          )}
          <div className="flex justify-end gap-3 pt-2 border-t border-zinc-100">
            <button
              onClick={closeEditor}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Save offering"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
