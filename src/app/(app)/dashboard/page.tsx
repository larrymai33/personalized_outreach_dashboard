import Link from "next/link";
import { getAnalytics } from "@/lib/actions/analytics";

type BarItem = {
  id: string;
  label: string;
  value: number;
  detail?: string;
};

function formatNumber(value: number) {
  return value.toLocaleString();
}

function MetricCard({
  label,
  value,
  detail,
  href,
}: {
  label: string;
  value: string | number;
  detail: string;
  href?: string;
}) {
  const content = (
    <>
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-zinc-950">
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      <p className="mt-2 text-sm text-zinc-500">{detail}</p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group block rounded-lg bg-white p-5 shadow-sm ring-1 ring-zinc-200 transition-shadow hover:shadow-md active:scale-[0.96]"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-zinc-200">
      {content}
    </div>
  );
}

function BarList({
  title,
  empty,
  items,
  valueLabel,
}: {
  title: string;
  empty: string;
  items: BarItem[];
  valueLabel: (item: BarItem) => string;
}) {
  const max = items.reduce((highest, item) => Math.max(highest, item.value), 1);

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-zinc-200">
      <h2 className="text-base font-semibold text-zinc-950">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-5 rounded-lg bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
          {empty}
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {items.map((item) => (
            <li key={item.id}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-800">{item.label}</p>
                  {item.detail && (
                    <p className="mt-0.5 truncate text-xs text-zinc-500">{item.detail}</p>
                  )}
                </div>
                <span className="shrink-0 text-sm tabular-nums text-zinc-500">
                  {valueLabel(item)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-100">
                <div
                  className="h-2 rounded-full bg-zinc-900"
                  style={{ width: `${Math.max(4, Math.round((item.value / max) * 100))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ActivityChart({
  days,
}: {
  days: { date: string; label: string; outbound: number; inbound: number }[];
}) {
  const max = days.reduce((highest, day) => Math.max(highest, day.outbound + day.inbound), 1);

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-zinc-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-950">Activity over 14 days</h2>
          <p className="mt-1 text-sm text-zinc-500">Outbound messages and pasted replies.</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-zinc-900" />
            Generated
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
            Replies
          </span>
        </div>
      </div>
      <div className="mt-6 flex h-48 items-end gap-2">
        {days.map((day) => {
          const outboundHeight = Math.round((day.outbound / max) * 100);
          const inboundHeight = Math.round((day.inbound / max) * 100);
          const total = day.outbound + day.inbound;

          return (
            <div key={day.date} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex h-36 w-full max-w-8 items-end justify-center overflow-hidden rounded-t-md bg-zinc-50">
                {total === 0 ? (
                  <div className="h-1 w-full rounded-t-sm bg-zinc-200" />
                ) : (
                  <div className="flex w-full flex-col justify-end">
                    <div
                      className="w-full bg-emerald-500"
                      style={{ height: `${Math.max(inboundHeight, day.inbound > 0 ? 5 : 0)}%` }}
                      title={`${formatNumber(day.inbound)} replies`}
                    />
                    <div
                      className="w-full rounded-t-sm bg-zinc-900"
                      style={{ height: `${Math.max(outboundHeight, day.outbound > 0 ? 5 : 0)}%` }}
                      title={`${formatNumber(day.outbound)} generated`}
                    />
                  </div>
                )}
              </div>
              <span className="hidden text-[11px] text-zinc-400 sm:block">{day.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Funnel({
  prospectCount,
  conversationCount,
  conversationsWithReplies,
}: {
  prospectCount: number;
  conversationCount: number;
  conversationsWithReplies: number;
}) {
  const max = Math.max(prospectCount, conversationCount, conversationsWithReplies, 1);
  const steps = [
    { label: "Prospects saved", value: prospectCount },
    { label: "Conversations started", value: conversationCount },
    { label: "Conversations with replies", value: conversationsWithReplies },
  ];

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-zinc-200">
      <h2 className="text-base font-semibold text-zinc-950">Outreach funnel</h2>
      <div className="mt-5 space-y-3">
        {steps.map((step) => (
          <div key={step.label}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="text-sm text-zinc-600">{step.label}</span>
              <span className="text-sm tabular-nums text-zinc-500">{formatNumber(step.value)}</span>
            </div>
            <div className="h-8 rounded-lg bg-zinc-100">
              <div
                className="flex h-8 items-center justify-end rounded-lg bg-zinc-900 pr-3 text-xs font-medium tabular-nums text-white"
                style={{ width: `${Math.max(8, Math.round((step.value / max) * 100))}%` }}
              >
                {Math.round((step.value / max) * 100)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function DashboardPage() {
  const a = await getAnalytics();

  const isFirstVisit = a.totalMessages === 0 && a.prospectCount === 0;
  const offeringItems = a.offeringUsage.map((o) => ({
    id: o.offeringId,
    label: o.name,
    value: o.count,
  }));
  const sourceItems = a.sourceBreakdown.map((source) => ({
    id: source.type,
    label: source.label,
    value: source.count,
  }));
  const topProspectItems = a.topProspects.map((prospect) => ({
    id: prospect.prospectId,
    label: prospect.name,
    value: prospect.outbound + prospect.inbound,
    detail: `${formatNumber(prospect.outbound)} generated, ${formatNumber(prospect.inbound)} replies`,
  }));
  const ratingItems = a.ratingDistribution
    .filter((rating) => rating.count > 0)
    .map((rating) => ({
      id: String(rating.rating),
      label: `${rating.rating} star${rating.rating === 1 ? "" : "s"}`,
      value: rating.count,
    }));
  const toneItems = a.toneUsage.map((tone) => ({
    id: tone.tone,
    label: tone.tone,
    value: tone.count,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">
            A live read on output volume, reply quality, and prospect coverage.
          </p>
        </div>
        <Link
          href="/generate"
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-700 active:scale-[0.96]"
        >
          Generate message
        </Link>
      </div>

      {isFirstVisit && (
        <section className="rounded-lg bg-blue-50 p-5 shadow-sm ring-1 ring-blue-100">
          <h2 className="text-base font-semibold text-blue-950">Welcome - get started in 3 steps</h2>
          <ol className="mt-3 grid gap-3 text-sm text-blue-900 md:grid-cols-3">
            <li>
              <Link href="/offerings" className="font-medium underline underline-offset-2">
                Add an offering
              </Link>
              <span className="block text-blue-800">Describe what you sell.</span>
            </li>
            <li>
              <Link href="/prospects" className="font-medium underline underline-offset-2">
                Add a prospect
              </Link>
              <span className="block text-blue-800">Collect the useful context.</span>
            </li>
            <li>
              <Link href="/generate" className="font-medium underline underline-offset-2">
                Generate a message
              </Link>
              <span className="block text-blue-800">Check whether the output feels human.</span>
            </li>
          </ol>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Messages generated"
          value={a.totalMessages}
          detail={`${formatNumber(a.inboundMessages)} pasted replies`}
          href="/generate"
        />
        <MetricCard
          label="Reply rate"
          value={`${a.replyRate}%`}
          detail={`${formatNumber(a.conversationsWithReplies)} of ${formatNumber(a.conversationCount)} conversations`}
          href="/conversations"
        />
        <MetricCard
          label="Prospects saved"
          value={a.prospectCount}
          detail={`${a.averageOutboundPerProspect.toFixed(1)} generated per prospect`}
          href="/prospects"
        />
        <MetricCard
          label="Avg. rating"
          value={a.averageRating === null ? "-" : a.averageRating.toFixed(1)}
          detail={`${formatNumber(a.ratedCount)} rated, ${formatNumber(a.favoriteCount)} favorites`}
        />
      </div>

      <ActivityChart days={a.activityByDay} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Funnel
          prospectCount={a.prospectCount}
          conversationCount={a.conversationCount}
          conversationsWithReplies={a.conversationsWithReplies}
        />
        <BarList
          title="Top prospects by activity"
          empty="No prospect activity yet. Add a prospect and generate a message to populate this."
          items={topProspectItems}
          valueLabel={(item) => `${formatNumber(item.value)} events`}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <BarList
          title="Outbound messages by offering"
          empty="No offering usage yet. Generate a message from an offering to see this chart."
          items={offeringItems}
          valueLabel={(item) => `${formatNumber(item.value)} msg`}
        />
        <BarList
          title="Prospect source mix"
          empty="No prospect sources yet. Add URLs, notes, or screenshots to see coverage."
          items={sourceItems}
          valueLabel={(item) => formatNumber(item.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <BarList
          title="Rating distribution"
          empty="No rated messages yet. Rate generated messages to track output quality."
          items={ratingItems}
          valueLabel={(item) => formatNumber(item.value)}
        />
        <BarList
          title="Most used tone overrides"
          empty="No tone overrides yet. Regenerate with tone notes to compare output direction."
          items={toneItems}
          valueLabel={(item) => `${formatNumber(item.value)} uses`}
        />
      </div>
    </div>
  );
}
