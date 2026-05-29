"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createPrompt,
  updatePrompt,
  deletePrompt,
  setDefaultPrompt,
  listPrompts,
} from "@/lib/actions/prompts";

type Prompt = Awaited<ReturnType<typeof listPrompts>>[number];

type PromptsClientProps = {
  initial: Prompt[];
};

export default function PromptsClient({ initial }: PromptsClientProps) {
  const router = useRouter();

  // Per-card in-flight tracking
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [settingDefaultIds, setSettingDefaultIds] = useState<Set<string>>(new Set());

  // Editor state
  const [editing, setEditing] = useState<Prompt | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Editor field values
  const [name, setName] = useState("");
  const [content, setContent] = useState("");

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
    setSaveError(null);
    setExplanation(null);
    setExplainError(null);
    setSuggestion(null);
    setImproveError(null);
  }

  function openEdit(p: Prompt) {
    setEditing(p);
    setIsNew(false);
    setName(p.name);
    setContent(p.content);
    setSaveError(null);
    setExplanation(null);
    setExplainError(null);
    setSuggestion(null);
    setImproveError(null);
  }

  function closeEditor() {
    setEditing(null);
    setIsNew(false);
    setSaveError(null);
    setExplanation(null);
    setExplainError(null);
    setSuggestion(null);
    setImproveError(null);
  }

  async function handleDelete(id: string) {
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await deletePrompt(id);
      router.refresh();
    } catch {
      alert("Failed to delete prompt. Please try again.");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleSetDefault(id: string) {
    setSettingDefaultIds((prev) => new Set(prev).add(id));
    try {
      await setDefaultPrompt(id);
      router.refresh();
    } catch {
      alert("Failed to set default prompt. Please try again.");
    } finally {
      setSettingDefaultIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
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
        await updatePrompt({
          id: editing.id,
          name: name.trim(),
          content,
        });
      } else {
        await createPrompt({
          name: name.trim(),
          content,
        });
      }
      router.refresh();
      closeEditor();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save prompt.");
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
        body: JSON.stringify({ kind: "prompt" }),
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
        body: JSON.stringify({ kind: "prompt", mode: "improve", current: content }),
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
          {initial.length === 0
            ? "No prompts yet."
            : `${initial.length} prompt${initial.length !== 1 ? "s" : ""}`}
        </p>
        {!editorOpen && (
          <button
            onClick={openNew}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
          >
            + New prompt
          </button>
        )}
      </div>

      {/* Prompt cards */}
      {initial.length > 0 && (
        <ul className="space-y-3">
          {initial.map((p) => {
            const isDeleting = deletingIds.has(p.id);
            const isSettingDefault = settingDefaultIds.has(p.id);
            const snippet = p.content.slice(0, 140);
            return (
              <li
                key={p.id}
                className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-zinc-900 truncate">{p.name}</h3>
                      {p.isDefault && (
                        <span className="shrink-0 rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">
                          Default
                        </span>
                      )}
                    </div>
                    {snippet && (
                      <p className="mt-1 text-sm text-zinc-500 line-clamp-2">
                        {snippet}{p.content.length > 140 ? "…" : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!p.isDefault && (
                      <button
                        onClick={() => handleSetDefault(p.id)}
                        disabled={isSettingDefault || isDeleting}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
                      >
                        {isSettingDefault ? "Setting…" : "Set default"}
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(p)}
                      disabled={isDeleting || isSettingDefault}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={isDeleting || isSettingDefault}
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
              {isNew ? "New prompt" : "Edit prompt"}
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
            <label htmlFor="prompt-name" className="text-sm font-medium text-zinc-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="prompt-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Concise cold email"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            />
          </div>

          {/* Content */}
          <div className="flex flex-col gap-1">
            <label htmlFor="prompt-content" className="text-sm font-medium text-zinc-700">
              Content
            </label>
            <textarea
              id="prompt-content"
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your system prompt here — tone, length constraints, structure, what to emphasize…"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-y"
            />

            {/* AI help buttons */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <button
                onClick={handleExplain}
                disabled={explaining || improving}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
              >
                {explaining ? "Loading…" : "What's a prompt?"}
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
              {saving ? "Saving…" : "Save prompt"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
