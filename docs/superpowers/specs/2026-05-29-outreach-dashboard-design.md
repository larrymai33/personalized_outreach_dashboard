# Personalized Outreach Dashboard — Design Spec

**Date:** 2026-05-29
**Status:** Approved (design), pending implementation plan

## 1. Summary

A full-stack dashboard that helps a user generate hyper-personalized cold-outreach
messages for prospects, manage the resulting conversations, and craft contextual
replies — all powered by AI. The user signs in, defines an **offering**, customizes a
**prompt**, saves a **prospect** (from URLs and/or a LinkedIn screenshot), and generates
a message that reads like a human wrote it for that specific person. When the prospect
replies, the user pastes the reply and gets a natural threaded continuation.

The single most important success criterion is **output quality**: graders will read
every generated message. Plumbing that works but produces generic messages is a fail.
The prompt and offering customization must *visibly* change the output.

## 2. Decisions (locked)

| Area | Decision |
|------|----------|
| Framework | Next.js (App Router) + TypeScript |
| DB | Postgres on Neon, Drizzle ORM |
| Auth | Better Auth (email/password), schema via its CLI generator |
| AI | OpenRouter — one client module for both text + vision |
| Scraping | In-app `fetch` + Mozilla Readability → text; optional `FIRECRAWL_API_KEY` fallback for JS-only SPAs |
| Screenshots | Sent straight to vision model; only extracted **text** persisted (Vercel has no persistent FS) |
| Deploy | Vercel |
| Sequencing | MVP core flow first, then analytics + polish — but all 7 brief pieces are in scope |

Verified during design: `kakiyo.com` server-renders its content (bare fetch returns
~143KB of real text), so the headline demo works with the default fetch scraper.

## 3. Architecture

- **Next.js App Router**, single app. Mutations via **Server Actions**; AI/streaming and
  file-upload endpoints via **Route Handlers** where a request/response shape is cleaner.
- **Drizzle + Neon** for persistence. **Better Auth** for sessions; every app table is
  scoped by `userId` and every query filters by the authenticated user.
- **One OpenRouter client** (`lib/ai/openrouter.ts`) exposing `generateText()` and
  `generateFromImage()` (vision). Model IDs and the multimodal message shape are pulled
  from current OpenRouter docs at build time, not reconstructed from memory.
- **Scraper module** (`lib/scrape.ts`): `fetch` → Readability → cleaned text; if
  `FIRECRAWL_API_KEY` is set, prefer Firecrawl for sites that return a thin/empty shell.
- **No object storage** for MVP: screenshot bytes go to the vision model and we keep the
  extracted text. (Can add Vercel Blob later if image re-display is wanted.)

### 3.1 The heart — prompt assembly (`lib/ai/build-request.ts`)

A single module composes every generation call explicitly so the behavior is auditable
and testable. This is the core of the product, not a detail.

**Initial generation**
- **system** = the user's custom prompt **verbatim**, followed by the selected offering
  injected under a clear delimiter:
  ```
  {user prompt content}

  ## Your Offering
  {offering.content}
  ```
- **user** = the prospect's compiled context + optional tone/angle override for this run:
  ```
  ## Prospect
  {prospect.compiledContext}

  {if tone override}Tone/angle for this message: {tone}{/if}

  Write the outreach message now.
  ```

**Reply handling**
- Replays the **entire prior thread** as alternating chat messages: outbound → `assistant`,
  prospect reply → `user`. The same system message (prompt + offering) is reused, then a
  final `user` instruction: "Write the next reply, continuing this conversation naturally."
- This is a continuation, not a fresh one-shot. It keeps tone and full context.

**Testable property:** same prospect, two different prompts/offerings ⇒ visibly different
messages. We will spot-check this manually as the acceptance test for quality.

## 4. Data model (Drizzle / Postgres)

**Better Auth tables** (generated): `user`, `session`, `account`, `verification`.

**App tables** (all carry `userId`, `createdAt`, `updatedAt` unless noted):

- **offerings**: `id, userId, name, sourceUrl?, content (editable text)`.
  - `content` is the single source of truth used in generation. Scraping fills/augments it;
    the user can freely edit on top. Scrape + manual + edit all compose into one field.
- **prompts**: `id, userId, name, content, isDefault (bool)`.
  - The user can keep multiple prompts; one default. `content` is sent verbatim as system.
- **prospects**: `id, userId, name, compiledContext (text)`.
  - `compiledContext` = AI-merged summary of all the prospect's sources, used at generation
    time. Recomputed whenever sources change.
- **prospect_sources**: `id, prospectId, type, value, extractedText, createdAt`.
  - `type ∈ {linkedin_screenshot, github_url, website_url, company_url, other_url, note}`.
  - `value` = the URL or note text; `extractedText` = scraped/vision/raw result.
  - Fully flexible — any combination of sources per prospect, no fixed format.
- **conversations**: `id, userId, prospectId, offeringId, promptId, title, createdAt`.
- **messages**: `id, conversationId, kind, content, tone?, model?, rating? (1-5), isFavorite (bool), createdAt`.
  - `kind ∈ {outbound, inbound}`. Outbound = AI-generated; inbound = pasted prospect reply.
  - Ratings, favorites, copy, delete, and regeneration variants all live here as history.

**Analytics** are live aggregate queries (no separate table):
- total messages generated = count of `messages.kind = outbound`
- prospects saved = count of `prospects`
- offering usage = messages/conversations grouped by `offeringId`
- conversations with replies = count of `conversations` having ≥1 `inbound` message

## 5. Feature breakdown (maps to the 7 brief pieces)

1. **Auth** — Better Auth email/password; sign up, sign in, sign out; per-user data scoping.
2. **Offerings** — create/edit/delete; build via (a) paste URL → scrape + AI-extract, (b)
   type manually, (c) both then edit. Inline AI **"Explain / Improve"** action that calls
   the model (real call, not static copy) to explain what an offering is or sharpen theirs.
   Multiple offerings; pick one at generation time.
3. **Prompts** — create/edit/delete; fully editable; default selectable. Inline AI **help**
   action explaining what a prompt is and how to write a good one.
4. **Prospects** — save/reuse across offerings. Add any mix of: LinkedIn screenshot
   (vision-read), GitHub URL, website/portfolio URL, company URL, other URL, freeform note.
   App scrapes URLs and reads screenshots, then compiles `compiledContext`.
5. **Generation** — pick offering + prompt + prospect → generate. Save to history. Rate,
   favorite, one-click copy, delete, and regenerate-with-different-tone without re-entering
   prospect details.
6. **Reply handling** — paste a prospect reply into a conversation → threaded contextual
   continuation; full thread visible (outbound/inbound alternating).
7. **Analytics dashboard** — the four numbers above, accurate and live.

## 6. Inline AI explainers

The brief explicitly asks for AI-powered inline help. These are real model calls
(short, cached prompts), surfaced as a small "Explain"/"Improve with AI" affordance on the
offering and prompt editors. Example seed copy the model expands on:
- Offering: "Your offering is the core value you bring to a prospect…"
- Prompt: "The prompt is the set of instructions you give the AI before it writes…"

## 7. Error handling & edge cases

- Scrape returns thin/empty content → fall back to Firecrawl if key present; otherwise
  surface a clear "couldn't read much from this URL — add detail manually" message and let
  the user edit `content` / add a note.
- Vision/text AI failure → user-visible error, no partial writes; generation is retryable.
- Missing offering/prompt at generation → guided empty states prompting the user to create
  them first.
- All AI keys read from env; app boots and renders without keys but AI actions return a
  clear "set OPENROUTER_API_KEY" error rather than crashing.

## 8. Testing strategy

- Unit-test `build-request.ts` composition (system/user shapes, thread replay ordering).
- Unit-test scraper text extraction against a saved HTML fixture.
- Manual quality acceptance: run the Ayush/Kakiyo/Sarah scenario from the brief end to end,
  and verify the prompt/offering-changes-output property.
- Typecheck + lint clean before deploy.

## 9. Out of scope (YAGNI for now)

- Team/multi-user orgs, sharing, roles.
- Persistent image storage / re-display of uploaded screenshots.
- Email sending / LinkedIn integration (messages are copied out manually).
- Background job queue for scraping (done inline on save).
