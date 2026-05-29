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
