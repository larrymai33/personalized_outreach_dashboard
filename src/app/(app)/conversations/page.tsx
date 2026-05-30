import Link from "next/link";
import { getConversations } from "@/lib/actions/generation";

export default async function ConversationsPage() {
  const conversations = await getConversations();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Conversations</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Every message you generate is saved here as a thread, with replies and history.
        </p>
      </div>

      {conversations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-10 text-center">
          <p className="text-sm text-zinc-600">No conversations yet.</p>
          <Link
            href="/generate"
            className="mt-3 inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Generate your first message
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                href={`/conversations/${c.id}`}
                className="block rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900">{c.prospectName}</span>
                    {c.offeringName && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                        {c.offeringName}
                      </span>
                    )}
                    {c.hasReplies && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Replied
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {new Date(c.lastAt).toLocaleDateString()} · {c.messageCount} msg
                  </span>
                </div>
                {c.lastSnippet && (
                  <p className="mt-2 line-clamp-2 text-sm text-zinc-500">{c.lastSnippet}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
