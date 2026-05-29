import { describe, it, expect } from "vitest";
import { extractReadableText } from "./scrape";
import { readFileSync } from "node:fs";
import path from "node:path";

it("extracts main text and drops scripts/nav noise", () => {
  const html = readFileSync(path.join(__dirname, "__fixtures__/sample.html"), "utf8");
  const text = extractReadableText(html, "https://acme.test");
  expect(text).toContain("Acme helps sales teams");
  expect(text).not.toContain("var x=1");
});
