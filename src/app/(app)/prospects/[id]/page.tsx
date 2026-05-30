import Link from "next/link";
import { getProspect } from "@/lib/actions/prospects";
import ProspectDetailClient from "./prospect-detail-client";

// Screenshot vision + context recompile chain two AI calls; allow up to 60s for this route's server actions.
export const maxDuration = 60;

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { prospect, sources } = await getProspect(id);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/prospects"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        ← All prospects
      </Link>

      {/* Prospect header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">{prospect.name}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Add sources below. The compiled context updates automatically after each change.
        </p>
      </div>

      {/* Compiled context panel */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-2">
        <h2 className="text-sm font-semibold text-zinc-700">Compiled context</h2>
        {prospect.compiledContext ? (
          <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
            {prospect.compiledContext}
          </p>
        ) : (
          <p className="text-sm text-zinc-400 italic">
            No context yet — add a source below to get started.
          </p>
        )}
      </div>

      {/* Source management (client) */}
      <ProspectDetailClient prospectId={id} initialSources={sources} />
    </div>
  );
}
