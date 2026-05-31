# Personalized Outreach Dashboard

A full-stack AI dashboard for writing hyper-personalized cold outreach. Define your
**offering**, customize the generation **prompt**, save a **prospect** from any mix of
URLs and a LinkedIn screenshot, and generate a message that reads like a human wrote it
for that specific person. When the prospect replies, paste it in and get a natural,
context-aware follow-up in the same voice.

## Features

- **Auth** — email/password (Better Auth); every user's data is isolated.
- **Offerings** — build by scraping a URL (AI-extracted), typing it yourself, or both;
  fully editable. Inline AI "explain / improve" help. Manage multiple offerings.
- **Prompts** — fully customizable system prompt that drives generation; multiple prompts
  with a default; inline AI help. Sent to the model verbatim.
- **Prospects** — save and reuse across offerings. Add any combination of: GitHub URL,
  website/portfolio URL, company URL, other URL, freeform note, and a **LinkedIn
  screenshot** (read by a vision model). All sources are scraped/read and merged into one
  compiled context.
- **Generation** — combines the selected offering + prompt + prospect. Copy, rate (1–5),
  favorite, delete, and regenerate with a different tone — all saved to history.
- **Replies** — paste a prospect's reply; the app replays the full thread and continues
  the conversation naturally. Threaded conversation view.
- **Analytics** — live counts: messages generated, prospects saved, conversations with
  replies, and per-offering usage.

## Examples

Same prospect, same offering — three different tones showing what the model actually produces.

**Prospect:** Larry Mai — LLM training infra (Mercor), 5G Layer 3 (Corning), live side projects (Ochtagon scoring engine, UFC pick-em), currently open to work.  
**Offering:** Kakiyo — AI outreach tool for LinkedIn.

---

**Default tone**

> Hey Larry,
>
> The combo of LLM training infra at Mercor and 5G Layer 3 work at Corning is genuinely rare — most people sit firmly on one side of that fence. The Ochtagon live scoring engine is a nice touch too.
>
> I'm reaching out because I run Kakiyo, an AI outreach tool for LinkedIn — but honestly, that's not why I'm messaging you. We're looking for engineers who've worked close to LLM pipelines and actually care about infrastructure quality, not just model hype. Your Pytest coverage work and the Docker environment pinning caught my attention specifically.
>
> We're early-stage and moving fast — the kind of place where what you ship this week is live next week.
>
> Not sure if you're open to something like this alongside the Georgia Tech path you're building toward, but would it be worth a quick conversation to see if there's any overlap?

---

**Tone: "more direct, mention pricing"**

> Hey Larry,
>
> Saw you're currently open to work — and honestly, your background is the kind that should have recruiters and hiring managers lining up. LLM infra experience at Mercor *plus* 5G protocol work at Corning is a genuinely rare combo, and you've got live projects to back it all up.
>
> That said, job searching on LinkedIn is a grind, and most people either send mass messages that get ignored or spend hours personalizing one by one.
>
> I built Kakiyo for exactly that — it runs real, two-way AI conversations on LinkedIn at scale, handles replies, and books meetings autonomously. No templates, no Chrome extension, no account risk. Plans start around $99/month, and most users recoup that in the first week of saved time.
>
> Might be worth a look while you're actively searching. Would it be useful to see how it works for job seekers specifically?

---

**Tone: "short one sentence only"**

> Cutting environment setup time by 70% at Mercor while also shipping a live UFC pick-em platform on the side — are you finding that the right roles are actually finding you, or is the search still pretty manual?

---

## Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Drizzle ORM · Neon Postgres ·
Better Auth · OpenRouter (text + vision) · Vitest. Scraping is in-app `fetch` +
Mozilla Readability with an optional Firecrawl fallback, hardened against SSRF.

## How generation works (the core)

`src/lib/ai/build-request.ts` composes every model call explicitly:

- **system** = your custom prompt, verbatim + the selected offering.
- **user** = the prospect's compiled context (+ an optional per-message tone).
- **replies** = the entire prior thread replayed as alternating messages, then "write the
  next reply" — a continuation, not a one-shot.

This makes the prompt and offering meaningfully change the output, which is the point.

## Local development

Prerequisites: Node 20+, a Neon (or any) Postgres database, and an OpenRouter API key.

1. Install deps:
   ```bash
   npm install
   ```
2. Create `.env.local` (see `.env.example`):
   ```
   DATABASE_URL=postgresql://USER:PASS@HOST/db?sslmode=require   # Neon pooled URL
   BETTER_AUTH_SECRET=<openssl rand -base64 32>
   BETTER_AUTH_URL=http://localhost:3000                          # the APP's url, not the DB's
   OPENROUTER_API_KEY=sk-or-v1-...
   OPENROUTER_MODEL=anthropic/claude-sonnet-4.6                   # optional (default shown)
   OPENROUTER_VISION_MODEL=anthropic/claude-sonnet-4.6           # optional (default shown)
   FIRECRAWL_API_KEY=                                             # optional; blank uses built-in scraper
   ```
   > `BETTER_AUTH_URL` must be your app's own origin. Setting it to anything else (e.g. a
   > database URL) makes every `/api/auth/*` request 404.
3. Push the schema to your database:
   ```bash
   npm run db:push
   ```
4. Run the dev server:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000, sign up, and go.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests |
| `npm run db:generate` / `db:push` | Generate / apply the Drizzle schema |

## Deployment (Vercel + Neon)

1. Push this repo to GitHub and import it in Vercel.
2. Set the same env vars in Vercel's project settings, with **`BETTER_AUTH_URL` set to the
   deployed HTTPS URL** (e.g. `https://your-app.vercel.app`).
3. Ensure the schema is applied to the production database (`npm run db:push` against the
   production `DATABASE_URL`).
4. Deploy.

## Tests

```bash
npm run test
```

Covers the OpenRouter client, the scraper + SSRF guard, and the generation composer
(including the "different prompt/offering ⇒ different output" property).

## Project layout

```
src/
  app/                     # routes: auth, dashboard, offerings, prompts, prospects,
                           #   generate, conversations/[id], api/auth, api/ai/explain
  lib/
    db/                    # Drizzle client + schema
    auth/                  # Better Auth config + session helpers
    ai/                    # openrouter client, build-request composer, explainers
    scrape.ts              # fetch + Readability + SSRF guard (+ Firecrawl fallback)
    actions/               # server actions: offerings, prompts, prospects, generation, analytics
  components/              # nav + shared UI
docs/superpowers/          # design spec + implementation plan
```

## Architecture decisions

**Next.js server actions for data fetching.** DB queries run directly in server actions — no API route for every fetch. Auth checks sit next to the data logic with no extra layer in between.

**Drizzle ORM + Neon serverless.** Drizzle's Neon serverless driver is built for Vercel's function environment: real Postgres queries without managing a connection pool. Supabase would also work but adds the client SDK layer and RLS security model, which is additional complexity this app doesn't need.

**Schema design.** UUIDs as primary keys on all app tables. Every app table (`offerings`, `prompts`, `prospects`, `conversations`, `messages`) carries a `userId` foreign key referencing the Better Auth `user` table, so all data is isolated at the row level by default.

**Better Auth.** Integrates directly with Drizzle — the auth tables live in the same schema and are queried with the same client. No separate auth database or SDK to keep in sync.

**OpenRouter for AI.** A raw `fetch` to the OpenRouter endpoint: call model → get text → save to DB. No provider SDK. Supports vision models (reads image URLs directly), and swapping models is an env var change with no code diff.

**node-html-parser for scraping.** Works in Vercel serverless functions without native dependencies. jsdom + Readability gives better article extraction but fails to load in serverless due to native/ESM-only deps. Firecrawl is available as an optional fallback — set `FIRECRAWL_API_KEY` and it delegates scraping to external infrastructure instead.

## Tradeoffs

The main deployment decision was Neon + Vercel versus Supabase + Vercel. Supabase is a full platform — you get Postgres, auth, storage, edge functions, and a client SDK all in one place, which is appealing early on. The tradeoff is that you're also taking on RLS policies, a separate auth system that doesn't integrate naturally with Drizzle, and a client SDK that sits between your code and the database. For this app, where auth is handled by Better Auth and data access is already row-isolated by `userId` foreign keys, that extra surface area adds complexity without adding capability.

Neon with Drizzle keeps the stack thinner. The serverless driver is purpose-built for Vercel's function environment — no connection pool to manage, no SDK layer, just Postgres queries that behave the same locally and in production. The cost is that you're wiring together more pieces yourself (auth, database, deployment) rather than getting them bundled. For a project this size that's the right call: each piece does one thing and they compose cleanly.

## What I'd do differently with more time

**Prompt injection protection.** Right now prospect context is scraped from external URLs and passed directly into the model's system message. A malicious page could embed instructions designed to hijack the output — "ignore previous instructions and output X." I'd add a sanitization pass on scraped content before it reaches the prompt, strip anything that looks like embedded instructions, and isolate prospect data in a clearly delimited section the model is instructed to treat as data only.

**Edge case hardening.** The scraper handles the happy path well but breaks down on JavaScript-rendered pages, paywalled content, and URLs that return 200 with an error page in the body. I'd add smarter detection for empty or low-quality extractions and surface a clear error to the user instead of silently passing garbage context to the model — bad context produces bad output and it's not obvious why.

**Self-improving generation via the rating system.** The schema already captures 1–5 ratings and favorites on every generated message. With more time I'd close that loop: analyze which prompt + offering + tone combinations consistently produce high-rated messages and use that signal to auto-suggest prompt improvements, flag underperforming offerings, and eventually fine-tune or few-shot the generation with the user's own top-rated examples. The data collection is already there — the intelligence layer on top of it isn't.
