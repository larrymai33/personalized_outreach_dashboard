import Link from "next/link";
import { getAnalytics } from "@/lib/actions/analytics";

export default async function DashboardPage() {
  const a = await getAnalytics();

  const stats = [
    { label: "Messages generated", value: a.totalMessages },
    { label: "Prospects saved", value: a.prospectCount },
    { label: "Conversations with replies", value: a.conversationsWithReplies },
  ];

  const maxCount = a.offeringUsage.reduce((m, o) => Math.max(m, o.count), 1);

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          A live snapshot of your outreach activity.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm text-zinc-500">{s.label}</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-900">
              {s.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Offering usage */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-zinc-900">Outbound messages by offering</h2>

        {a.offeringUsage.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-zinc-500">
              No messages yet &mdash; generate your first message.
            </p>
            <Link
              href="/generate"
              className="mt-3 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
            >
              Generate a message
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {a.offeringUsage.map((o) => (
              <li key={o.offeringId}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-zinc-700 truncate max-w-xs">
                    {o.name}
                  </span>
                  <span className="ml-4 text-sm text-zinc-500 shrink-0">
                    {o.count.toLocaleString()} {o.count === 1 ? "message" : "messages"}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-100">
                  <div
                    className="h-2 rounded-full bg-zinc-900 transition-all"
                    style={{ width: `${Math.round((o.count / maxCount) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
