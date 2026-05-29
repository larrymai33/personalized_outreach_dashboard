"use server";
import { db } from "@/lib/db";
import { prospects, prospectSources } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { fetchAndExtract } from "@/lib/scrape";
import { generateText, generateFromImage } from "@/lib/ai/openrouter";
import { revalidatePath } from "next/cache";

const VISION_INSTRUCTION =
  "This is a screenshot of a person's profile (likely LinkedIn). Extract everything useful for " +
  "personalized outreach: name, role, company, seniority, location, summary/about, recent posts or " +
  "activity, skills, and anything notable. Output concise plain text, no preamble.";

// ---- Internal helper ----

async function recompileContext(prospectId: string): Promise<void> {
  const sources = await db
    .select()
    .from(prospectSources)
    .where(eq(prospectSources.prospectId, prospectId))
    .orderBy(prospectSources.createdAt);

  if (sources.length === 0) {
    await db
      .update(prospects)
      .set({ compiledContext: "", updatedAt: new Date() })
      .where(eq(prospects.id, prospectId));
    return;
  }

  const blob = sources
    .map((s) => `[${s.type}${s.value ? ` ${s.value}` : ""}]\n${s.extractedText}`)
    .join("\n\n");

  const compiled = await generateText({
    temperature: 0.3,
    messages: [
      {
        role: "user",
        content:
          `Merge these raw notes about ONE prospect into a single tight profile for personalized outreach. ` +
          `Keep concrete facts (role, company, what they care about, recent activity, technical background). ` +
          `Remove navigation/boilerplate. Plain prose, no preamble.\n\n${blob}`,
      },
    ],
  });

  await db
    .update(prospects)
    .set({ compiledContext: compiled, updatedAt: new Date() })
    .where(eq(prospects.id, prospectId));
}

// ---- Ownership helper ----

async function verifyProspectOwnership(prospectId: string, userId: string) {
  const [prospect] = await db
    .select()
    .from(prospects)
    .where(and(eq(prospects.id, prospectId), eq(prospects.userId, userId)));
  if (!prospect) throw new Error("Prospect not found or access denied.");
  return prospect;
}

// ---- Exported actions ----

export async function listProspects() {
  const u = await requireUser();
  return db
    .select()
    .from(prospects)
    .where(eq(prospects.userId, u.id))
    .orderBy(desc(prospects.createdAt));
}

export async function getProspect(id: string) {
  const u = await requireUser();
  const prospect = await verifyProspectOwnership(id, u.id);
  const sources = await db
    .select()
    .from(prospectSources)
    .where(eq(prospectSources.prospectId, id))
    .orderBy(prospectSources.createdAt);
  return { prospect, sources };
}

export async function createProspect(input: { name: string }) {
  const u = await requireUser();
  const [row] = await db
    .insert(prospects)
    .values({ userId: u.id, name: input.name })
    .returning();
  revalidatePath("/prospects");
  return row;
}

export async function deleteProspect(id: string) {
  const u = await requireUser();
  await db.delete(prospects).where(and(eq(prospects.id, id), eq(prospects.userId, u.id)));
  revalidatePath("/prospects");
}

export async function addUrlSource(input: {
  prospectId: string;
  type: "github_url" | "website_url" | "company_url" | "other_url";
  url: string;
}) {
  const u = await requireUser();
  await verifyProspectOwnership(input.prospectId, u.id);
  const extracted = await fetchAndExtract(input.url);
  const [source] = await db
    .insert(prospectSources)
    .values({
      prospectId: input.prospectId,
      type: input.type,
      value: input.url,
      extractedText: extracted,
    })
    .returning();
  await recompileContext(input.prospectId);
  revalidatePath(`/prospects/${input.prospectId}`);
  return source;
}

export async function addNoteSource(input: { prospectId: string; text: string }) {
  const u = await requireUser();
  await verifyProspectOwnership(input.prospectId, u.id);
  const [source] = await db
    .insert(prospectSources)
    .values({
      prospectId: input.prospectId,
      type: "note",
      value: input.text,
      extractedText: input.text,
    })
    .returning();
  await recompileContext(input.prospectId);
  revalidatePath(`/prospects/${input.prospectId}`);
  return source;
}

export async function addScreenshotSource(input: { prospectId: string; dataUrl: string }) {
  const u = await requireUser();
  await verifyProspectOwnership(input.prospectId, u.id);
  const extracted = await generateFromImage({
    instruction: VISION_INSTRUCTION,
    dataUrl: input.dataUrl,
  });
  const [source] = await db
    .insert(prospectSources)
    .values({
      prospectId: input.prospectId,
      type: "linkedin_screenshot",
      value: "",
      extractedText: extracted,
    })
    .returning();
  await recompileContext(input.prospectId);
  revalidatePath(`/prospects/${input.prospectId}`);
  return source;
}

export async function removeSource(input: { sourceId: string }) {
  const u = await requireUser();
  const [source] = await db
    .select()
    .from(prospectSources)
    .where(eq(prospectSources.id, input.sourceId));
  if (!source) throw new Error("Source not found.");
  await verifyProspectOwnership(source.prospectId, u.id);
  await db.delete(prospectSources).where(eq(prospectSources.id, input.sourceId));
  await recompileContext(source.prospectId);
  revalidatePath(`/prospects/${source.prospectId}`);
}
