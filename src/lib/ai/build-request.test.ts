import { it, expect } from "vitest";
import { buildInitialMessages, buildReplyMessages } from "./build-request";

const offering = { content: "Kakiyo runs LinkedIn conversations for SDRs." };
const prompt = { content: "Conversational, under 100 words, end with a soft question." };
const prospect = { compiledContext: "Sarah, sales engineer, posted about outreach volume." };

it("puts the user prompt verbatim and offering into the system message", () => {
  const msgs = buildInitialMessages({ prompt, offering, prospect });
  const sys = msgs.find((m) => m.role === "system")!;
  expect(sys.content).toContain("under 100 words");
  expect(sys.content).toContain("## Your Offering");
  expect(sys.content).toContain("Kakiyo runs LinkedIn");
});

it("puts prospect context and optional tone in the user message", () => {
  const msgs = buildInitialMessages({ prompt, offering, prospect, tone: "warmer" });
  const user = msgs.find((m) => m.role === "user")!;
  expect(user.content).toContain("Sarah, sales engineer");
  expect(user.content).toContain("warmer");
});

it("replays the full thread for replies as alternating roles", () => {
  const msgs = buildReplyMessages({
    prompt, offering, prospect,
    thread: [
      { kind: "outbound", content: "Hey Sarah..." },
      { kind: "inbound", content: "How does it work?" },
    ],
  });
  expect(msgs[0].role).toBe("system");
  expect(msgs[1]).toMatchObject({ role: "assistant", content: "Hey Sarah..." });
  expect(msgs[2]).toMatchObject({ role: "user", content: "How does it work?" });
  expect(msgs[msgs.length - 1].role).toBe("user"); // final instruction
});
