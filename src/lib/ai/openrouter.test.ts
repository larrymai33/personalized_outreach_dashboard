import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateText } from "./openrouter";

describe("generateText", () => {
  beforeEach(() => { process.env.OPENROUTER_API_KEY = "test-key"; });
  it("posts messages and returns assistant content", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "hello world" } }] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const out = await generateText({
      messages: [{ role: "user", content: "hi" }],
    });
    expect(out).toBe("hello world");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages[0]).toEqual({ role: "user", content: "hi" });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer test-key");
  });
  it("throws a clear error when key missing", async () => {
    delete process.env.OPENROUTER_API_KEY;
    await expect(generateText({ messages: [{ role: "user", content: "hi" }] }))
      .rejects.toThrow(/OPENROUTER_API_KEY/);
  });
});
