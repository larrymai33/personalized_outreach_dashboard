import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export function extractReadableText(html: string, url: string): string {
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  if (article?.textContent && article.textContent.trim().length > 0) {
    return article.textContent.replace(/\s+/g, " ").trim().slice(0, 12000);
  }
  // Fallback: remove script/style elements first, then read body text
  const doc = dom.window.document;
  doc.querySelectorAll("script, style").forEach((el) => el.remove());
  const text = (doc.body?.textContent ?? "").replace(/\s+/g, " ").trim();
  return text.slice(0, 12000);
}

export async function fetchAndExtract(url: string): Promise<string> {
  if (process.env.FIRECRAWL_API_KEY) {
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
    } catch { /* fall through to fetch */ }
  }
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; OutreachBot/1.0)" } });
  if (!res.ok) throw new Error(`Could not fetch ${url} (${res.status})`);
  return extractReadableText(await res.text(), url);
}
