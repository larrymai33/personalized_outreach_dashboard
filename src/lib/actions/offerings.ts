"use server";
import { db } from "@/lib/db";
import { offerings } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { fetchAndExtract } from "@/lib/scrape";
import { generateText } from "@/lib/ai/openrouter";
import { revalidatePath } from "next/cache";

export async function listOfferings() {
  const u = await requireUser();
  return db.select().from(offerings).where(eq(offerings.userId, u.id)).orderBy(desc(offerings.updatedAt));
}

export async function createOffering(input: { name: string; content?: string; sourceUrl?: string }) {
  const u = await requireUser();
  const [row] = await db.insert(offerings).values({
    userId: u.id, name: input.name, content: input.content ?? "", sourceUrl: input.sourceUrl,
  }).returning();
  revalidatePath("/offerings");
  return row;
}

export async function updateOffering(input: { id: string; name?: string; content?: string; sourceUrl?: string }) {
  const u = await requireUser();
  await db.update(offerings).set({
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.content !== undefined ? { content: input.content } : {}),
    ...(input.sourceUrl !== undefined ? { sourceUrl: input.sourceUrl } : {}),
    updatedAt: new Date(),
  }).where(and(eq(offerings.id, input.id), eq(offerings.userId, u.id)));
  revalidatePath("/offerings");
}

export async function deleteOffering(id: string) {
  const u = await requireUser();
  await db.delete(offerings).where(and(eq(offerings.id, id), eq(offerings.userId, u.id)));
  revalidatePath("/offerings");
}

// Scrape a URL and turn raw text into a clean offering description.
export async function extractOfferingFromUrl(url: string): Promise<string> {
  await requireUser();
  const raw = await fetchAndExtract(url);
  return generateText({
    temperature: 0.4,
    messages: [{
      role: "user",
      content:
        `From this website content, write a concise 'offering' brief for cold outreach: ` +
        `what they do, who they sell to, the problem they solve, what makes them different, and any proof points. ` +
        `Write in plain prose, no preamble.\n\n---\n${raw}`,
    }],
  });
}
