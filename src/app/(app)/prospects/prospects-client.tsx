"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createProspect,
  deleteProspect,
  listProspects,
} from "@/lib/actions/prospects";

type Prospect = Awaited<ReturnType<typeof listProspects>>[number];

type ProspectsClientProps = {
  initial: Prospect[];
};

export default function ProspectsClient({ initial }: ProspectsClientProps) {
  const router = useRouter();

  // Per-card delete in-flight tracking
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Creator state
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleCreate() {
    if (!newName.trim()) {
      setCreateError("Name is required.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const row = await createProspect({ name: newName.trim() });
      router.push(`/prospects/${row.id}`);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create prospect.");
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await deleteProspect(id);
      router.refresh();
    } catch {
      alert("Failed to delete prospect. Please try again.");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Creator panel */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">New prospect</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setCreateError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !creating) handleCreate();
            }}
            placeholder="e.g. Jane Smith"
            disabled={creating}
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent disabled:opacity-50"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </div>
        {createError && (
          <p className="text-sm text-red-600">{createError}</p>
        )}
      </div>

      {/* Header count */}
      <p className="text-sm text-zinc-500">
        {initial.length === 0
          ? "No prospects yet."
          : `${initial.length} prospect${initial.length !== 1 ? "s" : ""}`}
      </p>

      {/* Prospect cards */}
      {initial.length > 0 && (
        <ul className="space-y-3">
          {initial.map((p) => {
            const isDeleting = deletingIds.has(p.id);
            return (
              <li
                key={p.id}
                className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/prospects/${p.id}`}
                      className="text-sm font-semibold text-zinc-900 hover:text-zinc-600 transition-colors truncate block"
                    >
                      {p.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      Added {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/prospects/${p.id}`}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleDelete(p.id)}
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
    </div>
  );
}
