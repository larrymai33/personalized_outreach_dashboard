import { parse } from "node-html-parser";
import dns from "node:dns/promises";

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 12000;
const MAX_BYTES = 2_500_000;

// Pure-JS HTML → text. We deliberately avoid jsdom/Readability: jsdom pulls in
// native/ESM-only deps that fail to load in serverless (Vercel) functions. The AI
// extraction step handles any remaining boilerplate, so a clean text dump is enough.
export function extractReadableText(html: string): string {
  const root = parse(html, { comment: false });
  root
    .querySelectorAll("script, style, noscript, nav, header, footer, svg, iframe, form")
    .forEach((el) => el.remove());
  const text = (root.querySelector("main")?.structuredText || root.structuredText || "")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text.slice(0, 12000);
}

/**
 * SSRF guard: returns true for addresses that must never be fetched server-side
 * (loopback, private, link-local, unique-local, unspecified). Covers IPv4, IPv6,
 * and IPv4-mapped IPv6 (::ffff:a.b.c.d).
 */
export function isPrivateAddress(ip: string): boolean {
  let addr = ip.toLowerCase().trim();
  // Strip IPv6 zone id and brackets
  addr = addr.replace(/^\[|\]$/g, "").split("%")[0];

  // IPv4-mapped IPv6 -> treat as the embedded IPv4
  const mapped = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) addr = mapped[1];

  if (addr.includes(".") && !addr.includes(":")) {
    const parts = addr.split(".").map((p) => Number(p));
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
    const [a, b] = parts;
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 127) return true; // loopback
    if (a === 10) return true; // private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 169 && b === 254) return true; // link-local
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
    if (a >= 224) return true; // multicast / reserved
    return false;
  }

  // IPv6
  if (addr === "::" || addr === "::1") return true; // unspecified / loopback
  if (addr.startsWith("fe80")) return true; // link-local
  if (addr.startsWith("fc") || addr.startsWith("fd")) return true; // unique-local fc00::/7
  if (addr.startsWith("ff")) return true; // multicast
  return false;
}

/** Parse + DNS-resolve a URL and reject non-http(s) schemes or private targets. */
async function assertPublicUrl(raw: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Invalid URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http and https URLs are supported.");
  }
  let resolved: { address: string }[];
  try {
    resolved = await dns.lookup(parsed.hostname, { all: true });
  } catch {
    throw new Error(`Could not resolve host: ${parsed.hostname}`);
  }
  if (resolved.length === 0 || resolved.some((r) => isPrivateAddress(r.address))) {
    throw new Error("Refusing to fetch a private or internal address.");
  }
  return parsed;
}

/** Read a Response body but stop after MAX_BYTES to avoid unbounded downloads. */
async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return (await res.text()).slice(0, MAX_BYTES);
  const decoder = new TextDecoder();
  let out = "";
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    out += decoder.decode(value, { stream: true });
    if (total >= MAX_BYTES) {
      await reader.cancel();
      break;
    }
  }
  return out;
}

/**
 * Fetch a public URL with SSRF protections: scheme allow-list, DNS-based private
 * IP blocking, manual redirect handling that re-validates every hop, a timeout,
 * and a response-size cap. Returns the raw HTML/text body.
 */
async function safeFetch(initialUrl: string): Promise<{ body: string; finalUrl: string }> {
  let current = initialUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const parsed = await assertPublicUrl(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(parsed, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; OutreachBot/1.0)" },
      });
    } finally {
      clearTimeout(timer);
    }
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error("Redirect response missing Location header.");
      current = new URL(location, parsed).toString(); // re-validated on next loop
      continue;
    }
    if (!res.ok) throw new Error(`Could not fetch ${initialUrl} (${res.status})`);
    return { body: await readCapped(res), finalUrl: parsed.toString() };
  }
  throw new Error("Too many redirects.");
}

export async function fetchAndExtract(url: string): Promise<string> {
  // Validate up front so obviously bad/internal URLs fail fast on every path.
  await assertPublicUrl(url);

  if (process.env.FIRECRAWL_API_KEY) {
    // Firecrawl fetches the URL on its own infrastructure (no SSRF from our server).
    try {
      const r = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url, formats: ["markdown"] }),
      });
      if (r.ok) {
        const j = await r.json();
        const md = j?.data?.markdown;
        if (md && md.length > 200) return md.slice(0, 12000);
      }
    } catch {
      /* fall through to direct fetch */
    }
  }

  const { body } = await safeFetch(url);
  return extractReadableText(body);
}
