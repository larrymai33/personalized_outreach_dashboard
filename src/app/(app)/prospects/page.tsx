import { listProspects } from "@/lib/actions/prospects";
import ProspectsClient from "./prospects-client";

export default async function ProspectsPage() {
  const prospects = await listProspects();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Prospects</h1>
        <p className="mt-1 text-sm text-zinc-500">
          A prospect is a person or company you want to reach out to. Add sources — URLs, notes, or LinkedIn screenshots — and the AI compiles a personalized context for outreach.
        </p>
      </div>
      <ProspectsClient initial={prospects} />
    </div>
  );
}
