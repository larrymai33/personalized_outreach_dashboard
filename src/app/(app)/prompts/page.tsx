import { ensureDefaultPrompt, listPrompts } from "@/lib/actions/prompts";
import PromptsClient from "./prompts-client";

export default async function PromptsPage() {
  await ensureDefaultPrompt();
  const prompts = await listPrompts();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Prompts</h1>
        <p className="mt-1 text-sm text-zinc-500">
          A prompt is the system instruction given to the AI when generating outreach — it controls tone, length, and style. One prompt is active as the default at a time.
        </p>
      </div>
      <PromptsClient initial={prompts} />
    </div>
  );
}
