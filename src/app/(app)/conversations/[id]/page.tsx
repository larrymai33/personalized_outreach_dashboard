import Link from "next/link";
import { getConversationView } from "@/lib/actions/generation";
import ConversationClient from "./conversation-client";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { conversation, prospect, messages } = await getConversationView(id);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            {conversation.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Conversation with{" "}
            <Link
              href={`/prospects/${prospect?.id}`}
              className="font-medium text-zinc-700 hover:underline"
            >
              {prospect?.name ?? "Unknown prospect"}
            </Link>
          </p>
        </div>
        <Link
          href="/generate"
          className="shrink-0 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          ← Generate
        </Link>
      </div>

      <ConversationClient conversationId={id} initialMessages={messages} />
    </div>
  );
}
