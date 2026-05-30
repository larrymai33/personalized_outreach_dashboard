import { listOfferings } from "@/lib/actions/offerings";
import { listPrompts } from "@/lib/actions/prompts";
import { listProspects } from "@/lib/actions/prospects";
import GenerateClient from "./generate-client";

// Message generation/regeneration calls the LLM; allow up to 60s for this route's server actions.
export const maxDuration = 60;

export default async function GeneratePage() {
  const [offerings, prompts, prospects] = await Promise.all([
    listOfferings(),
    listPrompts(),
    listProspects(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Generate</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Select an offering, a prompt template, and a prospect — then generate a personalised outreach message in seconds.
        </p>
      </div>
      <GenerateClient offerings={offerings} prompts={prompts} prospects={prospects} />
    </div>
  );
}
