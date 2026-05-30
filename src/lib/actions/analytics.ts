"use server";
import { db } from "@/lib/db";
import { conversations, messages, prospects, offerings, prospectSources } from "@/lib/db/schema";
import { and, eq, count, countDistinct, desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";

type Analytics = {
  totalMessages: number;
  inboundMessages: number;
  conversationCount: number;
  prospectCount: number;
  conversationsWithReplies: number;
  replyRate: number;
  metricTrends: {
    prospects: TrendMetric;
    conversations: TrendMetric;
    conversationsWithReplies: TrendMetric;
    replyRate: TrendMetric;
  };
  favoriteCount: number;
  ratedCount: number;
  averageRating: number | null;
  averageOutboundPerProspect: number;
  offeringUsage: { offeringId: string; name: string; count: number }[];
  sourceBreakdown: { type: string; label: string; count: number }[];
  activityByDay: { date: string; label: string; outbound: number; inbound: number }[];
  ratingDistribution: { rating: number; count: number }[];
  toneUsage: { tone: string; count: number }[];
  topProspects: { prospectId: string; name: string; outbound: number; inbound: number }[];
};

type TrendMetric = {
  change: number | null;
  series: number[];
};

const SOURCE_LABELS: Record<string, string> = {
  linkedin_screenshot: "LinkedIn screenshots",
  github_url: "GitHub URLs",
  website_url: "Websites",
  company_url: "Company sites",
  other_url: "Other URLs",
  note: "Notes",
};

function dayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function normalizeTone(tone: string | null) {
  return tone?.trim().replace(/\s+/g, " ").slice(0, 40);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfLocalDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function countDatesInRange(dates: Date[], start: Date, end: Date) {
  return dates.filter((date) => date >= start && date < end).length;
}

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

  // 2. Count inbound messages in the user's conversations
  const [inboundRow] = await db
    .select({ value: count() })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(
      and(
        eq(conversations.userId, u.id),
        eq(messages.kind, "inbound"),
      ),
    );
  const inboundMessages = Number(inboundRow?.value ?? 0);

  // 3. Count the user's prospects
  const [prospectRow] = await db
    .select({ value: count() })
    .from(prospects)
    .where(eq(prospects.userId, u.id));
  const prospectCount = Number(prospectRow?.value ?? 0);

  // 4. Count the user's conversations
  const [conversationRow] = await db
    .select({ value: count() })
    .from(conversations)
    .where(eq(conversations.userId, u.id));
  const conversationCount = Number(conversationRow?.value ?? 0);

  // 5. Count distinct conversations that have >= 1 inbound message
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
  const replyRate = conversationCount > 0
    ? Math.round((conversationsWithReplies / conversationCount) * 100)
    : 0;

  // 6. Outbound messages per offering (left join so zero-usage offerings appear)
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

  const messageRows = await db
    .select({
      id: messages.id,
      kind: messages.kind,
      tone: messages.tone,
      rating: messages.rating,
      isFavorite: messages.isFavorite,
      createdAt: messages.createdAt,
      prospectId: prospects.id,
      prospectName: prospects.name,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .innerJoin(prospects, eq(conversations.prospectId, prospects.id))
    .where(eq(conversations.userId, u.id));

  const sourceRows = await db
    .select({
      type: prospectSources.type,
      count: count(prospectSources.id),
    })
    .from(prospectSources)
    .innerJoin(prospects, eq(prospectSources.prospectId, prospects.id))
    .where(eq(prospects.userId, u.id))
    .groupBy(prospectSources.type);

  const prospectRows = await db
    .select({ createdAt: prospects.createdAt })
    .from(prospects)
    .where(eq(prospects.userId, u.id));

  const conversationRows = await db
    .select({
      id: conversations.id,
      createdAt: conversations.createdAt,
    })
    .from(conversations)
    .where(eq(conversations.userId, u.id));

  const favoriteCount = messageRows.filter((m) => m.isFavorite).length;
  const ratings = messageRows
    .map((m) => m.rating)
    .filter((rating): rating is number => typeof rating === "number");
  const ratedCount = ratings.length;
  const averageRating = ratedCount > 0
    ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratedCount) * 10) / 10
    : null;
  const averageOutboundPerProspect = prospectCount > 0
    ? Math.round((totalMessages / prospectCount) * 10) / 10
    : 0;

  const today = startOfLocalDay(new Date());
  const currentStart = addDays(today, -13);
  const currentEnd = addDays(today, 1);
  const previousStart = addDays(currentStart, -14);
  const previousEnd = currentStart;

  const activityByDay = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (13 - index));
    return {
      date: dayKey(date),
      label: dayLabel(date),
      outbound: 0,
      inbound: 0,
    };
  });
  const activityIndex = new Map(activityByDay.map((day, index) => [day.date, index]));

  const ratingDistribution = [1, 2, 3, 4, 5].map((rating) => ({ rating, count: 0 }));
  const toneCounts = new Map<string, number>();
  const prospectCounts = new Map<string, { prospectId: string; name: string; outbound: number; inbound: number }>();

  for (const message of messageRows) {
    const key = dayKey(message.createdAt);
    const index = activityIndex.get(key);
    if (index !== undefined) {
      if (message.kind === "outbound") activityByDay[index].outbound += 1;
      if (message.kind === "inbound") activityByDay[index].inbound += 1;
    }

    if (typeof message.rating === "number" && message.rating >= 1 && message.rating <= 5) {
      ratingDistribution[message.rating - 1].count += 1;
    }

    const currentProspect = prospectCounts.get(message.prospectId) ?? {
      prospectId: message.prospectId,
      name: message.prospectName,
      outbound: 0,
      inbound: 0,
    };
    if (message.kind === "outbound") currentProspect.outbound += 1;
    if (message.kind === "inbound") currentProspect.inbound += 1;
    prospectCounts.set(message.prospectId, currentProspect);

    const tone = normalizeTone(message.tone);
    if (message.kind === "outbound" && tone) {
      toneCounts.set(tone, (toneCounts.get(tone) ?? 0) + 1);
    }
  }

  // Use the first inbound message date per conversation so one long thread counts as one replied conversation.
  const replyRows = await db
    .select({
      conversationId: messages.conversationId,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(and(eq(conversations.userId, u.id), eq(messages.kind, "inbound")));

  const firstReplyDates = new Map<string, Date>();
  for (const row of replyRows) {
    const existing = firstReplyDates.get(row.conversationId);
    if (!existing || row.createdAt < existing) {
      firstReplyDates.set(row.conversationId, row.createdAt);
    }
  }

  const prospectDates = prospectRows.map((row) => row.createdAt);
  const conversationDates = conversationRows.map((row) => row.createdAt);
  const replyDates = [...firstReplyDates.values()];

  const currentProspects = countDatesInRange(prospectDates, currentStart, currentEnd);
  const previousProspects = countDatesInRange(prospectDates, previousStart, previousEnd);
  const currentConversations = countDatesInRange(conversationDates, currentStart, currentEnd);
  const previousConversations = countDatesInRange(conversationDates, previousStart, previousEnd);
  const currentReplies = countDatesInRange(replyDates, currentStart, currentEnd);
  const previousReplies = countDatesInRange(replyDates, previousStart, previousEnd);
  const currentReplyRate = currentConversations > 0 ? (currentReplies / currentConversations) * 100 : 0;
  const previousReplyRate = previousConversations > 0 ? (previousReplies / previousConversations) * 100 : 0;

  const prospectSeries = activityByDay.map((day) =>
    prospectDates.filter((date) => dayKey(date) === day.date).length,
  );
  const conversationSeries = activityByDay.map((day) =>
    conversationDates.filter((date) => dayKey(date) === day.date).length,
  );
  const replySeries = activityByDay.map((day) =>
    replyDates.filter((date) => dayKey(date) === day.date).length,
  );
  const replyRateSeries = activityByDay.map((day, index) => {
    const conversationsForDay = conversationSeries[index];
    return conversationsForDay > 0 ? Math.round((replySeries[index] / conversationsForDay) * 100) : 0;
  });

  const metricTrends = {
    prospects: {
      change: percentChange(currentProspects, previousProspects),
      series: prospectSeries,
    },
    conversations: {
      change: percentChange(currentConversations, previousConversations),
      series: conversationSeries,
    },
    conversationsWithReplies: {
      change: percentChange(currentReplies, previousReplies),
      series: replySeries,
    },
    replyRate: {
      change: percentChange(currentReplyRate, previousReplyRate),
      series: replyRateSeries,
    },
  };

  const sourceBreakdown = sourceRows
    .map((row) => ({
      type: row.type,
      label: SOURCE_LABELS[row.type] ?? row.type,
      count: Number(row.count),
    }))
    .sort((a, b) => b.count - a.count);

  const toneUsage = [...toneCounts.entries()]
    .map(([tone, count]) => ({ tone, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topProspects = [...prospectCounts.values()]
    .sort((a, b) => (b.outbound + b.inbound) - (a.outbound + a.inbound))
    .slice(0, 5);

  return {
    totalMessages,
    inboundMessages,
    conversationCount,
    prospectCount,
    conversationsWithReplies,
    replyRate,
    metricTrends,
    favoriteCount,
    ratedCount,
    averageRating,
    averageOutboundPerProspect,
    offeringUsage,
    sourceBreakdown,
    activityByDay,
    ratingDistribution,
    toneUsage,
    topProspects,
  };
}
