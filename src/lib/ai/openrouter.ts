const BASE = "https://openrouter.ai/api/v1/chat/completions";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  >;
};

async function call(messages: ChatMessage[], model: string, temperature = 0.8) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set. Add it to your environment.");
  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, temperature }),
  });
  if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export function generateText(opts: { messages: ChatMessage[]; model?: string; temperature?: number }) {
  return call(opts.messages, opts.model ?? process.env.OPENROUTER_MODEL ?? "anthropic/claude-3.7-sonnet", opts.temperature);
}

export function generateFromImage(opts: { instruction: string; dataUrl: string; model?: string }) {
  const messages: ChatMessage[] = [{
    role: "user",
    content: [
      { type: "text", text: opts.instruction },
      { type: "image_url", image_url: { url: opts.dataUrl } },
    ],
  }];
  return call(messages, opts.model ?? process.env.OPENROUTER_VISION_MODEL ?? "openai/gpt-4o", 0.4);
}
