import Link from "next/link";
import { getAnalytics } from "@/lib/actions/analytics";

export default async function DashboardPage() {
  const a = await getAnalytics();

  const stats = [
    {
      label: "Messages generated",
      value: a.totalMessages,
      href: "/generate",
    },
    {
      label: "Prospects saved",
      value: a.prospectCount,
      href: "/prospects",
    },
    {
      label: "Conversations with replies",
      value: a.conversationsWithReplies,
      href: "/generate",
    },
  ];

  const maxCount = a.offeringUsage.reduce((m, o) => Math.max(m, o.count), 1);
  const isFirstVisit = a.totalMessages === 0 && a.prospectCount === 0;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">
            A live snapshot of your outreach activity.
          </p>
        </div>
        <Link
          href="/generate"
          className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
        >
          Generate message
        </Link>
      </div>

      {/* First-visit onboarding */}
      {isFirstVisit && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-6 space-y-3">
          <h2 className="text-base font-semibold text-blue-900">Welcome — get started in 3 steps</h2>
          <ol className="space-y-2 text-sm text-blue-800">
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-semibold text-blue-900">1</span>
              <span>
                <Link href="/offerings" className="font-medium underline hover:text-blue-900">Add an offering</Link>
                {" "}— describe what you sell.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-semibold text-blue-900">2</span>
              <span>
                <Link href="/prospects" className="font-medium underline hover:text-blue-900">Add a prospect</Link>
                {" "}— who you&apos;re reaching out to.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-semibold text-blue-900">3</span>
              <span>
                <Link href="/generate" className="font-medium underline hover:text-blue-900">Generate your first message</Link>
                {" "}— personalized and ready to send.
              </span>
            </li>
          </ol>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group rounded-xl border border-zinc-200 bg-white p-6 shadow-sm hover:border-zinc-300 hover:shadow transition-all"
          >
            <p className="text-sm text-zinc-500">{s.label}</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-900">
              {s.value.toLocaleString()}
            </p>
          </Link>
        ))}
      </div>

      {/* Offering usage */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-zinc-900">Outbound messages by offering</h2>
          {a.offeringUsage.length > 0 && (
            <Link
              href="/offerings"
              className="text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              Manage offerings →
            </Link>
          )}
        </div>

        {a.offeringUsage.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-zinc-500 mb-3">
              No messages yet. Generate your first personalized outreach message.
            </p>
            <Link
              href="/generate"
              className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
            >
              Generate a message
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {a.offeringUsage.map((o) => (
              <li key={o.offeringId}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-zinc-700 truncate max-w-xs">
                    {o.name}
                  </span>
                  <span className="ml-4 text-sm tabular-nums text-zinc-500 shrink-0">
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
