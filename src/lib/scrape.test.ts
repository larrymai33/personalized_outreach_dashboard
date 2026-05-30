import { describe, it, expect } from "vitest";
import { extractReadableText, isPrivateAddress } from "./scrape";
import { readFileSync } from "node:fs";
import path from "node:path";

it("extracts main text and drops scripts/nav noise", () => {
  const html = readFileSync(path.join(__dirname, "__fixtures__/sample.html"), "utf8");
  const text = extractReadableText(html);
  expect(text).toContain("Acme helps sales teams");
  expect(text).not.toContain("var x=1");
});

describe("isPrivateAddress (SSRF guard)", () => {
  it("blocks loopback, private, link-local, cloud-metadata and IPv6 internal", () => {
    for (const ip of [
      "127.0.0.1", "0.0.0.0", "10.1.2.3", "172.16.5.5", "172.31.255.255",
      "192.168.0.1", "169.254.169.254", "100.64.0.1", "::1", "::",
      "fe80::1", "fd00::1", "fc00::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1",
    ]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
  });
  it("allows ordinary public addresses", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "104.16.0.1", "2606:4700:4700::1111"]) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
  });
});
