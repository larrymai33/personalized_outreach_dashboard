"use server";
import { db } from "@/lib/db";
import { prompts } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

const STARTER_PROMPT =
  "You are writing a short, personalized cold outreach message.\n" +
  "- Conversational and human, never salesy or templated.\n" +
  "- Under 100 words.\n" +
  "- Open with a specific, relevant observation about the prospect before mentioning the offering.\n" +
  "- End with a soft question, not a hard ask.";

export async function listPrompts() {
  const u = await requireUser();
  return db
    .select()
    .from(prompts)
    .where(eq(prompts.userId, u.id))
    .orderBy(desc(prompts.isDefault), desc(prompts.updatedAt));
}

export async function createPrompt(input: { name: string; content: string; isDefault?: boolean }) {
  const u = await requireUser();
  if (input.isDefault) {
    await db
      .update(prompts)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(prompts.userId, u.id));
  }
  const [row] = await db
    .insert(prompts)
    .values({
      userId: u.id,
      name: input.name,
      content: input.content,
      isDefault: input.isDefault ?? false,
    })
    .returning();
  revalidatePath("/prompts");
  return row;
}

export async function updatePrompt(input: { id: string; name?: string; content?: string }) {
  const u = await requireUser();
  await db
    .update(prompts)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(prompts.id, input.id), eq(prompts.userId, u.id)));
  revalidatePath("/prompts");
}

export async function deletePrompt(id: string) {
  const u = await requireUser();
  await db.delete(prompts).where(and(eq(prompts.id, id), eq(prompts.userId, u.id)));
  // If there are remaining prompts but none is the default, promote the most
  // recently updated one. This handles the case where the deleted prompt was
  // the default. Sequential statements; no db.transaction (Neon HTTP).
  const remaining = await db
    .select()
    .from(prompts)
    .where(eq(prompts.userId, u.id))
    .orderBy(desc(prompts.updatedAt));
  if (remaining.length > 0 && !remaining.some((p) => p.isDefault)) {
    await db
      .update(prompts)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(and(eq(prompts.id, remaining[0].id), eq(prompts.userId, u.id)));
  }
  revalidatePath("/prompts");
}

export async function setDefaultPrompt(id: string) {
  const u = await requireUser();
  await db
    .update(prompts)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(eq(prompts.userId, u.id));
  await db
    .update(prompts)
    .set({ isDefault: true, updatedAt: new Date() })
    .where(and(eq(prompts.id, id), eq(prompts.userId, u.id)));
  revalidatePath("/prompts");
}

export async function ensureDefaultPrompt() {
  const u = await requireUser();
  const existing = await db
    .select()
    .from(prompts)
    .where(eq(prompts.userId, u.id))
    .orderBy(desc(prompts.isDefault), desc(prompts.updatedAt));

  if (existing.length === 0) {
    const [row] = await db
      .insert(prompts)
      .values({
        userId: u.id,
        name: "Default outreach prompt",
        content: STARTER_PROMPT,
        isDefault: true,
      })
      .returning();
    return row;
  }

  const defaultPrompt = existing.find((p) => p.isDefault);
  return defaultPrompt ?? existing[0];
}
