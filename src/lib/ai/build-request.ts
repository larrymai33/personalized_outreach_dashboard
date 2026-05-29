import type { ChatMessage } from "./openrouter";

type Offering = { content: string };
type Prompt = { content: string };
type Prospect = { compiledContext: string };
export type ThreadMsg = { kind: "outbound" | "inbound"; content: string };

function systemMessage(prompt: Prompt, offering: Offering, prospect?: Prospect): ChatMessage {
  const prospectSection = prospect
    ? `\n\n## Prospect\n${prospect.compiledContext.trim() || "(no prospect details provided)"}`
    : "";
  return {
    role: "system",
    content:
      `${prompt.content.trim()}\n\n` +
      `## Your Offering\n${offering.content.trim() || "(no offering details provided)"}` +
      `${prospectSection}\n\n` +
      `Write as a real human reaching out 1:1. Never sound like a template or mass email. ` +
      `Ground the message in the specific prospect details. Output only the message text.`,
  };
}

export function buildInitialMessages(input: {
  prompt: Prompt;
  offering: Offering;
  prospect: Prospect;
  tone?: string;
}): ChatMessage[] {
  const { prompt, offering, prospect, tone } = input;
  const userContent =
    `## Prospect\n${prospect.compiledContext.trim() || "(no prospect details provided)"}\n\n` +
    (tone ? `Tone/angle for this message: ${tone}\n\n` : "") +
    `Write the outreach message now.`;
  return [systemMessage(prompt, offering), { role: "user", content: userContent }];
}

export function buildReplyMessages(input: {
  prompt: Prompt;
  offering: Offering;
  prospect: Prospect;
  thread: ThreadMsg[];
  tone?: string;
}): ChatMessage[] {
  const { prompt, offering, prospect, thread, tone } = input;
  const msgs: ChatMessage[] = [systemMessage(prompt, offering, prospect)];
  for (const m of thread) {
    msgs.push({ role: m.kind === "outbound" ? "assistant" : "user", content: m.content });
  }
  msgs.push({
    role: "user",
    content:
      (tone ? `Tone/angle: ${tone}. ` : "") +
      `Write the next reply, continuing this conversation naturally. ` +
      `Address their latest message directly, keep the same voice. Output only the message text.`,
  });
  return msgs;
}
