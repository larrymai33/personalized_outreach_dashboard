import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/session";

const workflow = [
  {
    label: "1",
    title: "Define the offer",
    body: "Paste a URL, write it manually, or combine both so the AI understands what you sell and why it matters.",
  },
  {
    label: "2",
    title: "Add prospect context",
    body: "Bring GitHub profiles, websites, company pages, notes, and LinkedIn screenshots into one reusable prospect profile.",
  },
  {
    label: "3",
    title: "Generate and continue",
    body: "Create the first message, rate variants, then paste replies back in for a natural threaded follow-up.",
  },
];

const features = [
  "Prompt customization that changes tone, length, angle, openings, and calls to action.",
  "Offering-aware generation, so the message changes when the product or audience changes.",
  "Reply handling that replays the full thread instead of starting from scratch.",
  "Live analytics for source mix, replies, ratings, favorites, and offering usage.",
];

export default async function RootPage() {
  const user = await getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section
        className="relative min-h-[86vh] overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: "url('/landing/outreach-dashboard-hero.png')" }}
      >
        <div className="absolute inset-0 bg-zinc-950/70" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,9,11,0.96)_0%,rgba(9,9,11,0.78)_42%,rgba(9,9,11,0.28)_100%)]" />

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3 text-sm font-semibold tracking-tight text-white">
            <Image
              src="/outreach-transparent.png"
              alt=""
              width={42}
              height={42}
              className="h-10 w-10 scale-125 object-contain"
            />
            <span>Outreach</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/10 hover:text-white active:scale-[0.96]"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex min-h-10 items-center rounded-lg bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition-shadow hover:shadow-md active:scale-[0.96]"
            >
              Start free
            </Link>
          </nav>
        </header>

        <div className="relative z-10 mx-auto flex max-w-7xl px-6 pb-24 pt-20 md:pt-28">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
              AI outreach workspace
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Personalized outreach that sounds researched.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-200">
              Turn an offering, a custom prompt, and messy prospect context into cold messages
              and replies that feel specific, natural, and ready to send.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-emerald-400 px-5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-950/20 transition-shadow hover:shadow-xl active:scale-[0.96]"
              >
                Build my first message
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-white/10 px-5 text-sm font-semibold text-white ring-1 ring-white/15 transition-colors hover:bg-white/15 active:scale-[0.96]"
              >
                Open dashboard
              </Link>
            </div>
          </div>
        </div>

      </section>

      <section className="bg-white px-6 py-20 text-zinc-950">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Built around output quality, not just plumbing.
            </h2>
            <p className="mt-4 text-base leading-7 text-zinc-600">
              Your offer, writing style, and prospect research stay easy to edit, so every
              message can reflect what you sell, who you are reaching out to, and how you want
              it to sound.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {workflow.map((step) => (
              <article key={step.title} className="rounded-lg bg-zinc-50 p-6 shadow-sm ring-1 ring-zinc-200">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-950 text-sm font-semibold tabular-nums text-white">
                  {step.label}
                </span>
                <h3 className="mt-5 text-lg font-semibold text-zinc-950">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-600">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-zinc-100 px-6 py-20 text-zinc-950">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Customization you can actually test.
            </h2>
            <p className="mt-4 text-base leading-7 text-zinc-600">
              Try the same prospect with a different prompt or offer, and the message adapts
              without losing the facts that make it relevant.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature} className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-zinc-200">
                <p className="text-sm leading-6 text-zinc-700">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-zinc-950 px-6 py-16 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Ready to try the full flow?</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Sign up, create an offering, add a prospect, generate, then test a reply.
            </p>
          </div>
          <Link
            href="/sign-up"
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-zinc-950 transition-shadow hover:shadow-lg active:scale-[0.96]"
          >
            Create account
          </Link>
        </div>
      </section>
    </main>
  );
}
