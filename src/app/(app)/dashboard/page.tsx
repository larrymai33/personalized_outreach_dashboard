import Link from "next/link";
import {
  CalendarDays,
  Tag,
  TrendingUp,
} from "lucide-react";
import { getAnalytics } from "@/lib/actions/analytics";

type RankedItem = {
  id: string;
  label: string;
  value: number;
  detail?: string;
};

const donutColors = ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5"];
const avatarColors = [
  "bg-violet-100 text-violet-700",
  "bg-cyan-100 text-cyan-700",
  "bg-amber-100 text-amber-700",
  "bg-indigo-100 text-indigo-700",
  "bg-rose-100 text-rose-700",
];

function formatNumber(value: number) {
  return value.toLocaleString();
}

function formatPercent(value: number) {
  return `${value}%`;
}

function formatChange(value: number | null) {
  if (value === null) return "new";
  if (value === 0) return "0%";
  return `${value > 0 ? "+" : ""}${value}%`;
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200/80 ${className}`}>
      {children}
    </section>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const width = 220;
  const height = 54;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 10) - 5;
    return `${x},${y}`;
  });
  const area = `0,${height} ${points.join(" ")} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-6 h-14 w-full overflow-visible">
      <defs>
        <linearGradient id={`spark-fill-${values.join("-")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#spark-fill-${values.join("-")})`} />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="#10b981"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}

function MetricCard({
  title,
  value,
  change,
  values,
}: {
  title: string;
  value: string;
  change: number | null;
  values: number[];
}) {
  const isPositive = change === null || change > 0;
  const isNegative = typeof change === "number" && change < 0;

  return (
    <Card>
      <p className="text-sm font-medium text-zinc-950">{title}</p>
      <div className="mt-4 flex items-center gap-3">
        <p className="text-3xl font-semibold tracking-tight tabular-nums text-zinc-950">{value}</p>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
            isNegative
              ? "bg-red-50 text-red-600"
              : isPositive
                ? "bg-emerald-100 text-emerald-700"
                : "bg-zinc-100 text-zinc-500"
          }`}
        >
          <TrendingUp className="h-3 w-3" />
          {formatChange(change)}
        </span>
      </div>
      <Sparkline values={values} />
    </Card>
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
  const startedPercent = prospectCount > 0 ? Math.round((conversationCount / prospectCount) * 100) : 0;
  const replyPercent = conversationCount > 0
    ? Math.round((conversationsWithReplies / conversationCount) * 100)
    : 0;

  const rows = [
    { label: "Prospects saved", value: prospectCount, detail: "" },
    { label: "Conversations started", value: conversationCount, detail: `${startedPercent}%` },
    { label: "Conversations with replies", value: conversationsWithReplies, detail: `${replyPercent}%` },
  ];

  return (
    <Card className="xl:col-span-5">
      <h2 className="text-lg font-semibold text-zinc-950">Outreach funnel</h2>
      <div className="mt-7 grid gap-7 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="flex flex-col items-center gap-1">
          {rows.map((row, index) => (
            <div
              key={row.label}
              className="h-16 rounded-lg bg-emerald-500 shadow-sm"
              style={{
                width: `${Math.max(36, Math.round((row.value / max) * 100))}%`,
                opacity: 1 - index * 0.18,
                clipPath: "polygon(5% 0, 95% 0, 82% 100%, 18% 100%)",
              }}
            />
          ))}
        </div>
        <div className="divide-y divide-zinc-200">
          {rows.map((row) => (
            <div key={row.label} className="grid grid-cols-[110px_1fr_64px] items-center gap-5 py-4">
              <p className="text-2xl font-semibold tabular-nums text-zinc-950">{formatNumber(row.value)}</p>
              <p className="text-sm font-medium text-zinc-500">{row.label}</p>
              <p className="text-right text-sm tabular-nums text-zinc-500">{row.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function RankedBars({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: RankedItem[];
}) {
  const max = items.reduce((highest, item) => Math.max(highest, item.value), 1);

  return (
    <Card className="xl:col-span-5">
      <h2 className="text-lg font-semibold text-zinc-950">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-8 rounded-lg bg-zinc-50 p-5 text-sm text-zinc-500">{empty}</p>
      ) : (
        <ul className="mt-6 space-y-5">
          {items.map((item, index) => (
            <li key={item.id} className="grid grid-cols-[minmax(120px,1fr)_72px_minmax(120px,1fr)] items-center gap-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarColors[index % avatarColors.length]}`}>
                  {item.label.slice(0, 1).toUpperCase()}
                </span>
                <p className="truncate text-sm font-semibold text-zinc-950">{item.label}</p>
              </div>
              <p className="text-sm tabular-nums text-zinc-500">{formatNumber(item.value)} events</p>
              <div className="h-1.5 rounded-full bg-zinc-100">
                <div
                  className="h-1.5 rounded-full bg-emerald-500"
                  style={{ width: `${Math.max(8, Math.round((item.value / max) * 100))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function DonutChart({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: RankedItem[];
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let offset = 0;
  const gradient = total > 0
    ? items
        .map((item, index) => {
          const start = offset;
          const percent = (item.value / total) * 100;
          offset += percent;
          return `${donutColors[index % donutColors.length]} ${start}% ${offset}%`;
        })
        .join(", ")
    : "#f4f4f5 0% 100%";

  return (
    <Card>
      <h2 className="text-lg font-semibold text-zinc-950">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-8 rounded-lg bg-zinc-50 p-5 text-sm text-zinc-500">{empty}</p>
      ) : (
        <div className="mt-7 grid gap-7 sm:grid-cols-[150px_1fr] sm:items-center">
          <div
            className="h-36 w-36 rounded-full"
            style={{ background: `conic-gradient(${gradient})` }}
          >
            <div className="m-auto h-full w-full rounded-full p-8">
              <div className="h-full w-full rounded-full bg-white shadow-inner" />
            </div>
          </div>
          <ul className="space-y-3">
            {items.map((item, index) => {
              const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
              return (
                <li key={item.id} className="grid grid-cols-[1fr_44px_48px] items-center gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2 text-zinc-700">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: donutColors[index % donutColors.length] }}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="text-right font-medium tabular-nums text-zinc-950">{percent}%</span>
                  <span className="text-right tabular-nums text-zinc-500">{formatNumber(item.value)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}

function RatingDistribution({
  items,
}: {
  items: RankedItem[];
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const max = items.reduce((highest, item) => Math.max(highest, item.value), 1);

  return (
    <Card>
      <h2 className="text-lg font-semibold text-zinc-950">Rating distribution</h2>
      {items.length === 0 ? (
        <p className="mt-8 rounded-lg bg-zinc-50 p-5 text-sm text-zinc-500">
          No rated messages yet. Rate generated messages to track output quality.
        </p>
      ) : (
        <ul className="mt-8 space-y-5">
          {items.map((item) => {
            const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
            return (
              <li key={item.id} className="grid grid-cols-[58px_1fr_86px] items-center gap-4 text-sm">
                <span className="font-medium text-zinc-950">{item.label}</span>
                <div className="h-2 rounded-full bg-zinc-100">
                  <div
                    className="h-2 rounded-full bg-emerald-500"
                    style={{ width: `${Math.max(6, Math.round((item.value / max) * 100))}%` }}
                  />
                </div>
                <span className="text-right tabular-nums text-zinc-500">
                  {formatNumber(item.value)} ({percent}%)
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function ToneOverrides({ items }: { items: RankedItem[] }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold text-zinc-950">Most used tone overrides</h2>
      {items.length === 0 ? (
        <p className="mt-6 rounded-lg bg-zinc-50 p-5 text-sm text-zinc-500">
          No tone overrides yet. Regenerate with tone notes to compare output direction.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-200">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Tag className="h-4 w-4" />
                </span>
                <p className="line-clamp-2 text-sm font-medium leading-6 text-zinc-700">{item.label}</p>
              </div>
              <p className="mt-4 pl-10 text-sm tabular-nums text-zinc-500">
                {formatNumber(item.value)} uses
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default async function DashboardPage() {
  const a = await getAnalytics();
  const ratingItems = a.ratingDistribution
    .filter((rating) => rating.count > 0)
    .map((rating) => ({
      id: String(rating.rating),
      label: `${rating.rating} star${rating.rating === 1 ? "" : "s"}`,
      value: rating.count,
    }))
    .reverse();

  const offeringItems = a.offeringUsage
    .filter((offering) => offering.count > 0)
    .map((offering) => ({
      id: offering.offeringId,
      label: offering.name,
      value: offering.count,
    }));

  const sourceItems = a.sourceBreakdown.map((source) => ({
    id: source.type,
    label: source.label,
    value: source.count,
  }));

  const topProspects = a.topProspects.map((prospect) => ({
    id: prospect.prospectId,
    label: prospect.name,
    value: prospect.outbound + prospect.inbound,
  }));

  const toneItems = a.toneUsage.map((tone) => ({
    id: tone.tone,
    label: tone.tone,
    value: tone.count,
  }));

  return (
    <div className="mx-auto max-w-[1500px] space-y-7">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Dashboard</h1>
          <p className="mt-2 text-base text-zinc-500">Overview of your outreach performance</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm ring-1 ring-zinc-200 transition-shadow hover:shadow-md active:scale-[0.96]">
            <CalendarDays className="h-4 w-4" />
            Last 14 days
          </button>
          <Link
            href="/generate"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-sm transition-shadow hover:shadow-md active:scale-[0.96]"
          >
            Generate message
          </Link>
        </div>
      </header>

      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
        <MetricCard
          title="Prospects saved"
          value={formatNumber(a.prospectCount)}
          change={a.metricTrends.prospects.change}
          values={a.metricTrends.prospects.series}
        />
        <MetricCard
          title="Conversations started"
          value={formatNumber(a.conversationCount)}
          change={a.metricTrends.conversations.change}
          values={a.metricTrends.conversations.series}
        />
        <MetricCard
          title="Conversations with replies"
          value={formatNumber(a.conversationsWithReplies)}
          change={a.metricTrends.conversationsWithReplies.change}
          values={a.metricTrends.conversationsWithReplies.series}
        />
        <MetricCard
          title="Reply rate"
          value={formatPercent(a.replyRate)}
          change={a.metricTrends.replyRate.change}
          values={a.metricTrends.replyRate.series}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-10">
        <Funnel
          prospectCount={a.prospectCount}
          conversationCount={a.conversationCount}
          conversationsWithReplies={a.conversationsWithReplies}
        />
        <RankedBars
          title="Top prospects by activity"
          empty="No prospect activity yet. Add a prospect and generate a message to populate this."
          items={topProspects}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <DonutChart
          title="Outbound messages by offering"
          empty="No offering usage yet. Generate a message from an offering to see this chart."
          items={offeringItems}
        />
        <DonutChart
          title="Prospect source mix"
          empty="No prospect sources yet. Add URLs, notes, or screenshots to see coverage."
          items={sourceItems}
        />
        <RatingDistribution items={ratingItems} />
      </div>

      <ToneOverrides items={toneItems} />
    </div>
  );
}
