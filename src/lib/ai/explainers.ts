export const EXPLAINERS = {
  offering: "Explain in 2-3 plain sentences what an 'offering' is for cold outreach: the core value the sender brings to a prospect, what makes outreach relevant. Then give one short tip to improve it.",
  prompt: "Explain in 2-3 plain sentences what the generation 'prompt' is: the instructions given to the AI before it writes (tone, length, what to emphasize/avoid). Then give one short tip.",
} as const;

export function improveInstruction(kind: "offering" | "prompt", current: string) {
  return `Here is a user's current ${kind}:\n\n${current}\n\n` +
    `Rewrite it to be sharper and more useful for generating personalized outreach. ` +
    `Keep their intent. Output only the improved ${kind} text.`;
}
