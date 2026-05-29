"use server";
import { db } from "@/lib/db";
import { conversations, messages, prospects, offerings } from "@/lib/db/schema";
import { and, eq, count, countDistinct, desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";

type Analytics = {
  totalMessages: number;
  prospectCount: number;
  conversationsWithReplies: number;
  offeringUsage: { offeringId: string; name: string; count: number }[];
};

export async function getAnalytics(): Promise<Analytics> {
  const u = await requireUser();

  // 1. Count outbound messages in the user's conversations
  const [totalRow] = await db
    .select({ value: count() })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(
      and(
        eq(conversations.userId, u.id),
        eq(messages.kind, "outbound"),
      ),
    );
  const totalMessages = Number(totalRow?.value ?? 0);

  // 2. Count the user's prospects
  const [prospectRow] = await db
    .select({ value: count() })
    .from(prospects)
    .where(eq(prospects.userId, u.id));
  const prospectCount = Number(prospectRow?.value ?? 0);

  // 3. Count distinct conversations that have >= 1 inbound message
  const [repliesRow] = await db
    .select({ value: countDistinct(messages.conversationId) })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(
      and(
        eq(conversations.userId, u.id),
        eq(messages.kind, "inbound"),
      ),
    );
  const conversationsWithReplies = Number(repliesRow?.value ?? 0);

  // 4. Outbound messages per offering (left join so zero-usage offerings appear)
  const usageRows = await db
    .select({
      offeringId: offerings.id,
      name: offerings.name,
      count: count(messages.id),
    })
    .from(offerings)
    .leftJoin(conversations, eq(conversations.offeringId, offerings.id))
    .leftJoin(
      messages,
      and(
        eq(messages.conversationId, conversations.id),
        eq(messages.kind, "outbound"),
      ),
    )
    .where(eq(offerings.userId, u.id))
    .groupBy(offerings.id, offerings.name)
    .orderBy(desc(count(messages.id)));

  const offeringUsage = usageRows.map((r) => ({
    offeringId: r.offeringId,
    name: r.name,
    count: Number(r.count),
  }));

  return { totalMessages, prospectCount, conversationsWithReplies, offeringUsage };
}
