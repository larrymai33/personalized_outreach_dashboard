"use server";
import { db } from "@/lib/db";
import { conversations, messages, offerings, prompts, prospects } from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import {
  buildInitialMessages,
  buildReplyMessages,
  type ThreadMsg,
} from "@/lib/ai/build-request";
import { generateText } from "@/lib/ai/openrouter";

// ---------------------------------------------------------------------------
// Internal shared loader — exported so Task 18 (reply flow) can reuse it.
// ---------------------------------------------------------------------------
export async function loadConversationBundle(conversationId: string, userId: string) {
  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));
  if (!conv) throw new Error("Conversation not found");

  const [offering] = await db
    .select()
    .from(offerings)
    .where(eq(offerings.id, conv.offeringId));
  if (!offering) throw new Error("Offering not found");

  const [prompt] = await db
    .select()
    .from(prompts)
    .where(eq(prompts.id, conv.promptId));
  if (!prompt) throw new Error("Prompt not found");

  const [prospect] = await db
    .select()
    .from(prospects)
    .where(eq(prospects.id, conv.prospectId));
  if (!prospect) throw new Error("Prospect not found");

  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  const thread: ThreadMsg[] = rows.map((m) => ({ kind: m.kind, content: m.content }));

  return { conversation: conv, offering, prompt, prospect, thread };
}

// ---------------------------------------------------------------------------
// Generate the first message for a new conversation.
// ---------------------------------------------------------------------------
export async function generateMessage(input: {
  prospectId: string;
  offeringId: string;
  promptId: string;
  tone?: string;
}) {
  const u = await requireUser();

  // Verify ownership of all three entities.
  const [offering] = await db
    .select()
    .from(offerings)
    .where(and(eq(offerings.id, input.offeringId), eq(offerings.userId, u.id)));
  if (!offering) throw new Error("Offering not found");

  const [prompt] = await db
    .select()
    .from(prompts)
    .where(and(eq(prompts.id, input.promptId), eq(prompts.userId, u.id)));
  if (!prompt) throw new Error("Prompt not found");

  const [prospect] = await db
    .select()
    .from(prospects)
    .where(and(eq(prospects.id, input.prospectId), eq(prospects.userId, u.id)));
  if (!prospect) throw new Error("Prospect not found");

  // Generate the outreach message.
  const text = await generateText({
    messages: buildInitialMessages({ prompt, offering, prospect, tone: input.tone }),
  });

  // Insert the conversation row.
  const [conv] = await db
    .insert(conversations)
    .values({
      userId: u.id,
      prospectId: input.prospectId,
      offeringId: input.offeringId,
      promptId: input.promptId,
      title: prospect.name,
    })
    .returning();

  // Insert the first outbound message.
  const [msg] = await db
    .insert(messages)
    .values({
      conversationId: conv.id,
      kind: "outbound",
      content: text,
      tone: input.tone ?? null,
      model: process.env.OPENROUTER_MODEL ?? null,
    })
    .returning();

  revalidatePath("/generate");
  return { conversationId: conv.id, message: msg };
}

// ---------------------------------------------------------------------------
// Regenerate (append a new outbound message, keep history).
// ---------------------------------------------------------------------------
export async function regenerate(input: { conversationId: string; tone?: string }) {
  const u = await requireUser();
  const { offering, prompt, prospect, thread, conversation } =
    await loadConversationBundle(input.conversationId, u.id);

  // Branch: if there are inbound messages in the thread, continue the conversation;
  // otherwise rebuild a fresh initial message.
  const hasInbound = thread.some((m) => m.kind === "inbound");

  const aiMessages = hasInbound
    ? buildReplyMessages({ prompt, offering, prospect, thread, tone: input.tone })
    : buildInitialMessages({ prompt, offering, prospect, tone: input.tone });

  const text = await generateText({ messages: aiMessages });

  const [msg] = await db
    .insert(messages)
    .values({
      conversationId: conversation.id,
      kind: "outbound",
      content: text,
      tone: input.tone ?? null,
      model: process.env.OPENROUTER_MODEL ?? null,
    })
    .returning();

  revalidatePath(`/conversations/${input.conversationId}`);
  revalidatePath("/generate");
  return msg;
}

// ---------------------------------------------------------------------------
// Ownership helper for message mutations.
// ---------------------------------------------------------------------------
async function getMessageWithOwnerCheck(messageId: string, userId: string) {
  const [msg] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId));
  if (!msg) throw new Error("Not found");

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, msg.conversationId));
  if (!conv || conv.userId !== userId) throw new Error("Not found");

  return { msg, conv };
}

// ---------------------------------------------------------------------------
// Rate a message (1–5 stars or similar).
// ---------------------------------------------------------------------------
export async function rateMessage(input: { id: string; rating: number }) {
  const u = await requireUser();
  const { conv } = await getMessageWithOwnerCheck(input.id, u.id);

  await db
    .update(messages)
    .set({ rating: input.rating })
    .where(eq(messages.id, input.id));

  revalidatePath(`/conversations/${conv.id}`);
}

// ---------------------------------------------------------------------------
// Toggle favorite flag on a message.
// ---------------------------------------------------------------------------
export async function toggleFavorite(input: { id: string }) {
  const u = await requireUser();
  const { msg, conv } = await getMessageWithOwnerCheck(input.id, u.id);

  await db
    .update(messages)
    .set({ isFavorite: !msg.isFavorite })
    .where(eq(messages.id, input.id));

  revalidatePath(`/conversations/${conv.id}`);
}

// ---------------------------------------------------------------------------
// Delete a message.
// ---------------------------------------------------------------------------
export async function deleteMessage(id: string) {
  const u = await requireUser();
  const { conv } = await getMessageWithOwnerCheck(id, u.id);

  await db.delete(messages).where(eq(messages.id, id));

  revalidatePath(`/conversations/${conv.id}`);
}

// ---------------------------------------------------------------------------
// Add a prospect reply then generate the next outbound message.
// ---------------------------------------------------------------------------
export async function addReplyAndRespond(input: {
  conversationId: string;
  replyText: string;
  tone?: string;
}) {
  const u = await requireUser();
  const { offering, prompt, prospect, thread } = await loadConversationBundle(
    input.conversationId,
    u.id,
  );

  // Persist the prospect's pasted reply (inbound).
  await db.insert(messages).values({
    conversationId: input.conversationId,
    kind: "inbound",
    content: input.replyText,
  });

  // Build the continuation from the FULL thread including the new reply.
  const fullThread: ThreadMsg[] = [
    ...thread,
    { kind: "inbound", content: input.replyText },
  ];

  const text = await generateText({
    messages: buildReplyMessages({
      prompt,
      offering,
      prospect,
      thread: fullThread,
      tone: input.tone,
    }),
  });

  const [msg] = await db
    .insert(messages)
    .values({
      conversationId: input.conversationId,
      kind: "outbound",
      content: text,
      tone: input.tone ?? null,
      model: process.env.OPENROUTER_MODEL ?? null,
    })
    .returning();

  revalidatePath(`/conversations/${input.conversationId}`);
  return msg;
}

// ---------------------------------------------------------------------------
// Load a conversation with full message rows for the thread view.
// ---------------------------------------------------------------------------
export async function getConversationView(conversationId: string) {
  const u = await requireUser();

  const [conv] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, u.id),
      ),
    );
  if (!conv) throw new Error("Not found");

  const [prospect] = await db
    .select()
    .from(prospects)
    .where(eq(prospects.id, conv.prospectId));

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  return { conversation: conv, prospect, messages: msgs };
}
