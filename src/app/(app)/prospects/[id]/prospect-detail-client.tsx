"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  addUrlSource,
  addNoteSource,
  addScreenshotSource,
  removeSource,
  getProspect,
} from "@/lib/actions/prospects";

type Source = Awaited<ReturnType<typeof getProspect>>["sources"][number];

type SourceType =
  | "github_url"
  | "website_url"
  | "company_url"
  | "other_url"
  | "note"
  | "linkedin_screenshot";

const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  github_url: "GitHub URL",
  website_url: "Website URL",
  company_url: "Company URL",
  other_url: "Other URL",
  note: "Note",
  linkedin_screenshot: "LinkedIn screenshot",
};

const URL_TYPES: SourceType[] = ["github_url", "website_url", "company_url", "other_url"];

function sourceTypeLabel(type: string): string {
  return SOURCE_TYPE_LABELS[type as SourceType] ?? type;
}

type ProspectDetailClientProps = {
  prospectId: string;
  initialSources: Source[];
};

export default function ProspectDetailClient({
  prospectId,
  initialSources,
}: ProspectDetailClientProps) {
  const router = useRouter();

  // Add source form state
  const [selectedType, setSelectedType] = useState<SourceType>("github_url");
  const [urlInput, setUrlInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // File input ref for screenshot
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Per-source remove in-flight tracking
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  // Expanded source text tracking
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleAdd() {
    setAddError(null);

    if (URL_TYPES.includes(selectedType)) {
      // URL source
      if (!urlInput.trim()) {
        setAddError("Please enter a URL.");
        return;
      }
      setAdding(true);
      try {
        await addUrlSource({
          prospectId,
          type: selectedType as "github_url" | "website_url" | "company_url" | "other_url",
          url: urlInput.trim(),
        });
        setUrlInput("");
        router.refresh();
      } catch (e) {
        setAddError(e instanceof Error ? e.message : "Failed to scrape URL. Please try again.");
      } finally {
        setAdding(false);
      }
    } else if (selectedType === "note") {
      // Note source
      if (!noteInput.trim()) {
        setAddError("Please enter a note.");
        return;
      }
      setAdding(true);
      try {
        await addNoteSource({ prospectId, text: noteInput.trim() });
        setNoteInput("");
        router.refresh();
      } catch (e) {
        setAddError(e instanceof Error ? e.message : "Failed to add note. Please try again.");
      } finally {
        setAdding(false);
      }
    } else if (selectedType === "linkedin_screenshot") {
      // Screenshot source — triggered via file input
      const file = fileInputRef.current?.files?.[0];
      if (!file) {
        setAddError("Please select an image file.");
        return;
      }
      if (!file.type.startsWith("image/")) {
        setAddError("File must be an image (PNG, JPG, etc.).");
        return;
      }
      const maxBytes = 4 * 1024 * 1024;
      if (file.size > maxBytes) {
        setAddError("Image must be under 4 MB.");
        return;
      }
      setAdding(true);
      try {
        // Read file to data URL in the browser
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        await addScreenshotSource({ prospectId, dataUrl });
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        router.refresh();
      } catch (e) {
        setAddError(e instanceof Error ? e.message : "Failed to process screenshot. Please try again.");
      } finally {
        setAdding(false);
      }
    }
  }

  async function handleRemove(sourceId: string) {
    setRemovingIds((prev) => new Set(prev).add(sourceId));
    try {
      await removeSource({ sourceId });
      router.refresh();
    } catch {
      alert("Failed to remove source. Please try again.");
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(sourceId);
        return next;
      });
    }
  }

  const isUrlType = URL_TYPES.includes(selectedType);
  const isNoteType = selectedType === "note";
  const isScreenshotType = selectedType === "linkedin_screenshot";

  return (
    <div className="space-y-6">
      {/* Add source panel */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900">Add source</h2>

        {/* Type selector */}
        <div className="flex flex-col gap-1">
          <label htmlFor="source-type" className="text-sm font-medium text-zinc-700">
            Source type
          </label>
          <select
            id="source-type"
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value as SourceType);
              setAddError(null);
            }}
            disabled={adding}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent disabled:opacity-50"
          >
            {(Object.keys(SOURCE_TYPE_LABELS) as SourceType[]).map((t) => (
              <option key={t} value={t}>
                {SOURCE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        {/* URL input */}
        {isUrlType && (
          <div className="flex flex-col gap-1">
            <label htmlFor="source-url" className="text-sm font-medium text-zinc-700">
              URL
            </label>
            <div className="flex gap-2">
              <input
                id="source-url"
                type="url"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setAddError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !adding) handleAdd();
                }}
                placeholder="https://github.com/username"
                disabled={adding}
                className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent disabled:opacity-50"
              />
              <button
                onClick={handleAdd}
                disabled={adding || !urlInput.trim()}
                className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? "Scraping…" : "Add & scrape"}
              </button>
            </div>
          </div>
        )}

        {/* Note input */}
        {isNoteType && (
          <div className="flex flex-col gap-1">
            <label htmlFor="source-note" className="text-sm font-medium text-zinc-700">
              Note
            </label>
            <textarea
              id="source-note"
              rows={4}
              value={noteInput}
              onChange={(e) => {
                setNoteInput(e.target.value);
                setAddError(null);
              }}
              placeholder="Add any context about this prospect — their interests, background, recent activity…"
              disabled={adding}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-y disabled:opacity-50"
            />
            <div className="flex justify-end">
              <button
                onClick={handleAdd}
                disabled={adding || !noteInput.trim()}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? "Adding…" : "Add note"}
              </button>
            </div>
          </div>
        )}

        {/* Screenshot input */}
        {isScreenshotType && (
          <div className="flex flex-col gap-1">
            <label htmlFor="source-screenshot" className="text-sm font-medium text-zinc-700">
              LinkedIn screenshot
            </label>
            <p className="text-xs text-zinc-400">
              Upload a screenshot of the prospect&apos;s LinkedIn profile. PNG or JPG, max 4 MB.
            </p>
            <input
              id="source-screenshot"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              disabled={adding}
              onChange={() => setAddError(null)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 disabled:opacity-50"
            />
            <div className="flex justify-end">
              <button
                onClick={handleAdd}
                disabled={adding}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? "Reading screenshot…" : "Upload & analyse"}
              </button>
            </div>
          </div>
        )}

        {/* Add error */}
        {addError && (
          <p className="text-sm text-red-600">{addError}</p>
        )}
      </div>

      {/* Existing sources list */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">
          {initialSources.length === 0
            ? "No sources yet"
            : `${initialSources.length} source${initialSources.length !== 1 ? "s" : ""}`}
        </h2>

        {initialSources.length > 0 && (
          <ul className="space-y-3">
            {initialSources.map((source) => {
              const isRemoving = removingIds.has(source.id);
              const isExpanded = expandedIds.has(source.id);
              const preview = source.extractedText?.slice(0, 200) ?? "";
              const hasMore = (source.extractedText?.length ?? 0) > 200;

              return (
                <li
                  key={source.id}
                  className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                          {sourceTypeLabel(source.type)}
                        </span>
                        {source.value && (
                          <span className="text-xs text-zinc-400 truncate max-w-xs">
                            {source.value}
                          </span>
                        )}
                      </div>

                      {preview && (
                        <div>
                          <p className="text-sm text-zinc-600 leading-relaxed">
                            {isExpanded ? source.extractedText : preview}
                            {!isExpanded && hasMore ? "…" : ""}
                          </p>
                          {hasMore && (
                            <button
                              onClick={() => toggleExpand(source.id)}
                              className="mt-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                            >
                              {isExpanded ? "Show less" : "Show more"}
                            </button>
                          )}
                        </div>
                      )}

                      {!preview && (
                        <p className="text-sm text-zinc-400 italic">No extracted text.</p>
                      )}
                    </div>

                    <button
                      onClick={() => handleRemove(source.id)}
                      disabled={isRemoving}
                      className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {isRemoving ? "Removing…" : "Remove"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
