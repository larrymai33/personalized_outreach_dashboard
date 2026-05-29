# Personalized Outreach Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a full-stack AI dashboard that generates hyper-personalized outreach messages from a user's offering + custom prompt + flexible prospect inputs, and handles threaded replies.

**Architecture:** Next.js App Router (TS) with Server Actions for mutations and Route Handlers for AI/file endpoints. Drizzle + Neon Postgres, Better Auth (email/password). One OpenRouter client for text + vision. A single `build-request` module composes every generation (system = user prompt + offering; user = compiled prospect context; replies replay the full thread). Scraping is in-app fetch + Readability with optional Firecrawl fallback; screenshots go to the vision model and only extracted text is stored.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind, Drizzle ORM, Neon serverless Postgres, Better Auth, OpenRouter (OpenAI-compatible API), @mozilla/readability + jsdom, Vitest, Vercel.

---

## Conventions

- Package manager: `npm`. Run `npm run typecheck` (alias for `tsc --noEmit`) and `npm run lint` before each commit phase boundary.
- Tests: **Vitest**. Test files live next to source as `*.test.ts`. Run a single test: `npx vitest run path/to/file.test.ts`.
- All app DB tables carry `userId`; every read/write query filters by the authenticated user's id obtained from the Better Auth session. Never trust a `userId` from the client.
- Commit after each task with the message shown in its final step.
- Env vars (`.env.local`): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `OPENROUTER_API_KEY`, optional `FIRECRAWL_API_KEY`, `OPENROUTER_MODEL` (default below), `OPENROUTER_VISION_MODEL` (default below).

## File Structure (locked decomposition)

```
src/
  app/
    layout.tsx                     # root layout, fonts, Tailwind
    page.tsx                       # redirect: signed-in -> /dashboard, else -> /sign-in
    globals.css
    (auth)/sign-in/page.tsx
    (auth)/sign-up/page.tsx
    api/auth/[...all]/route.ts     # Better Auth handler
    (app)/layout.tsx               # protected shell + nav; redirects if no session
    (app)/dashboard/page.tsx       # analytics
    (app)/offerings/page.tsx
    (app)/offerings/offerings-client.tsx
    (app)/prompts/page.tsx
    (app)/prompts/prompts-client.tsx
    (app)/prospects/page.tsx
    (app)/prospects/[id]/page.tsx
    (app)/prospects/prospects-client.tsx
    (app)/generate/page.tsx
    (app)/generate/generate-client.tsx
    (app)/conversations/[id]/page.tsx
    api/ai/explain/route.ts        # inline AI explainers (streaming optional)
  lib/
    db/
      index.ts                     # drizzle client (Neon)
      schema.ts                    # all tables
    auth/
      auth.ts                      # Better Auth server config
      auth-client.ts               # client hooks
      session.ts                   # requireUser() helper
    ai/
      openrouter.ts                # generateText(), generateFromImage()
      build-request.ts             # THE HEART: composes messages
      explainers.ts                # offering/prompt explainer prompts
    scrape.ts                      # fetchAndExtract()
    actions/
      offerings.ts                 # server actions
      prompts.ts
      prospects.ts
      generation.ts
      analytics.ts
  components/
    ui/*                           # small shared UI (Button, Card, Textarea, etc.)
    nav.tsx
drizzle/                           # migrations
drizzle.config.ts
vitest.config.ts
```

---

## Phase 0 — Scaffolding

### Task 1: Scaffold Next.js app

**Files:**
- Create: project files via CLI, `package.json`, `tsconfig.json`, `src/app/*`, `vitest.config.ts`

- [ ] **Step 1: Scaffold**

Run in the repo root (it already contains `.git`, `README.md`, `docs/`):
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```
If it refuses due to non-empty dir, scaffold in a temp dir and copy `src/`, configs over, preserving `docs/` and `.git`.

- [ ] **Step 2: Add deps**

```bash
npm i drizzle-orm @neondatabase/serverless better-auth @mozilla/readability jsdom
npm i -D drizzle-kit vitest @types/jsdom tsx
```

- [ ] **Step 3: Add scripts to package.json**

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:push": "drizzle-kit push"
}
```

- [ ] **Step 4: vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

- [ ] **Step 5: Verify build tooling**

Run: `npm run typecheck` → Expected: PASS (no errors). Run: `npx vitest run` → Expected: "No test files found" (exit 0 or message; acceptable).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js app with Tailwind, Drizzle, Vitest deps"
```

### Task 2: Database client + Drizzle config

**Files:**
- Create: `src/lib/db/index.ts`, `drizzle.config.ts`, `.env.example`

- [ ] **Step 1: .env.example**

```
DATABASE_URL=postgres://...neon...
BETTER_AUTH_SECRET=generate-with-openssl-rand-base64-32
BETTER_AUTH_URL=http://localhost:3000
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=anthropic/claude-3.7-sonnet
OPENROUTER_VISION_MODEL=openai/gpt-4o
FIRECRAWL_API_KEY=
```
> Verify current OpenRouter model IDs at https://openrouter.ai/models during Task 5; update defaults if these slugs are stale.

- [ ] **Step 2: drizzle.config.ts**

```ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

- [ ] **Step 3: db client**

`src/lib/db/index.ts`:
```ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

- [ ] **Step 4: Create a Neon project + set DATABASE_URL**

Create a free Neon Postgres DB, copy the pooled connection string into `.env.local`. (No code; documents the manual step. If unavailable, a local Postgres URL works for dev.)

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add Drizzle client and config"
```

### Task 3: Schema — auth + all app tables

**Files:**
- Create: `src/lib/db/schema.ts`
- Create: migration via `db:generate`

- [ ] **Step 1: Write schema.ts**

```ts
import { pgTable, text, timestamp, boolean, integer, pgEnum, uuid } from "drizzle-orm/pg-core";

// ---- Better Auth tables (names/columns per Better Auth Drizzle adapter) ----
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});
export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---- App tables ----
export const sourceType = pgEnum("source_type", [
  "linkedin_screenshot", "github_url", "website_url", "company_url", "other_url", "note",
]);
export const messageKind = pgEnum("message_kind", ["outbound", "inbound"]);

export const offerings = pgTable("offerings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sourceUrl: text("source_url"),
  content: text("content").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const prompts = pgTable("prompts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  content: text("content").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const prospects = pgTable("prospects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  compiledContext: text("compiled_context").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const prospectSources = pgTable("prospect_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  prospectId: uuid("prospect_id").notNull().references(() => prospects.id, { onDelete: "cascade" }),
  type: sourceType("type").notNull(),
  value: text("value").notNull().default(""),
  extractedText: text("extracted_text").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  prospectId: uuid("prospect_id").notNull().references(() => prospects.id, { onDelete: "cascade" }),
  offeringId: uuid("offering_id").notNull().references(() => offerings.id, { onDelete: "cascade" }),
  promptId: uuid("prompt_id").notNull().references(() => prompts.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Conversation"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  kind: messageKind("kind").notNull(),
  content: text("content").notNull(),
  tone: text("tone"),
  model: text("model"),
  rating: integer("rating"),
  isFavorite: boolean("is_favorite").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

- [ ] **Step 2: Generate + apply migration**

Run: `npm run db:generate` → Expected: a SQL file appears under `drizzle/`. Then `npm run db:push` → Expected: tables created on Neon (no errors).

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add full database schema (auth + app tables)"
```

### Task 4: Better Auth setup

**Files:**
- Create: `src/lib/auth/auth.ts`, `src/lib/auth/auth-client.ts`, `src/lib/auth/session.ts`, `src/app/api/auth/[...all]/route.ts`

> Before writing, fetch current Better Auth docs (context7: `better-auth`) to confirm the Drizzle adapter import path and `nextCookies` plugin usage. The code below reflects the stable API; reconcile if changed.

- [ ] **Step 1: auth.ts**

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true },
  plugins: [nextCookies()],
});
```

- [ ] **Step 2: route handler**

`src/app/api/auth/[...all]/route.ts`:
```ts
import { auth } from "@/lib/auth/auth";
import { toNextJsHandler } from "better-auth/next-js";
export const { GET, POST } = toNextJsHandler(auth);
```

- [ ] **Step 3: auth-client.ts**

```ts
"use client";
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient();
export const { signIn, signUp, signOut, useSession } = authClient;
```

- [ ] **Step 4: session helper**

`src/lib/auth/session.ts`:
```ts
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function getUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}
export async function requireUser() {
  const u = await getUser();
  if (!u) redirect("/sign-in");
  return u;
}
```

- [ ] **Step 5: Verify**

Run: `npm run typecheck` → Expected: PASS. Run `npm run dev`, GET `http://localhost:3000/api/auth/ok` style endpoint not required; just confirm dev server boots without errors.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: configure Better Auth with Drizzle adapter"
```

### Task 5: Auth UI + protected shell

**Files:**
- Create: `src/app/(auth)/sign-in/page.tsx`, `src/app/(auth)/sign-up/page.tsx`, `src/app/(app)/layout.tsx`, `src/components/nav.tsx`, `src/app/page.tsx`

- [ ] **Step 1: Root redirect** — `src/app/page.tsx`: server component; `const u = await getUser(); redirect(u ? "/dashboard" : "/sign-in")`.

- [ ] **Step 2: Sign-up page** — client component form (name, email, password) calling `signUp.email({ email, password, name })`; on success `router.push("/dashboard")`; show error text on failure. Link to sign-in.

- [ ] **Step 3: Sign-in page** — client form (email, password) calling `signIn.email(...)`; same success/error handling. Link to sign-up.

- [ ] **Step 4: Protected layout** — `src/app/(app)/layout.tsx` server component: `await requireUser()` then render `<Nav/>` + `{children}`.

- [ ] **Step 5: Nav** — links: Dashboard, Offerings, Prompts, Prospects, Generate; a Sign out button calling `signOut()` then redirect to `/sign-in`.

- [ ] **Step 6: Verify manually** — sign up, land on dashboard placeholder, sign out, sign in. Confirm visiting `/dashboard` while signed out redirects to `/sign-in`.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: auth pages and protected app shell"
```

---

## Phase 1 — AI + scraping core (the heart)

### Task 6: OpenRouter client

**Files:**
- Create: `src/lib/ai/openrouter.ts`, `src/lib/ai/openrouter.test.ts`

> Fetch OpenRouter docs first (web or context7) to confirm: base URL `https://openrouter.ai/api/v1/chat/completions`, `Authorization: Bearer`, and the multimodal `content` array shape (`{type:"text"}` and `{type:"image_url", image_url:{url}}` where url may be a `data:` URI). Reconcile code if the shape differs.

- [ ] **Step 1: Write the failing test** (`openrouter.test.ts`)

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateText } from "./openrouter";

describe("generateText", () => {
  beforeEach(() => { process.env.OPENROUTER_API_KEY = "test-key"; });
  it("posts messages and returns assistant content", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "hello world" } }] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const out = await generateText({
      messages: [{ role: "user", content: "hi" }],
    });
    expect(out).toBe("hello world");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages[0]).toEqual({ role: "user", content: "hi" });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer test-key");
  });
  it("throws a clear error when key missing", async () => {
    delete process.env.OPENROUTER_API_KEY;
    await expect(generateText({ messages: [{ role: "user", content: "hi" }] }))
      .rejects.toThrow(/OPENROUTER_API_KEY/);
  });
});
```

- [ ] **Step 2: Run → FAIL** (`npx vitest run src/lib/ai/openrouter.test.ts`), module not found.

- [ ] **Step 3: Implement**

```ts
const BASE = "https://openrouter.ai/api/v1/chat/completions";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  >;
};

async function call(messages: ChatMessage[], model: string, temperature = 0.8) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set. Add it to your environment.");
  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, temperature }),
  });
  if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export function generateText(opts: { messages: ChatMessage[]; model?: string; temperature?: number }) {
  return call(opts.messages, opts.model ?? process.env.OPENROUTER_MODEL ?? "anthropic/claude-3.7-sonnet", opts.temperature);
}

export function generateFromImage(opts: { instruction: string; dataUrl: string; model?: string }) {
  const messages: ChatMessage[] = [{
    role: "user",
    content: [
      { type: "text", text: opts.instruction },
      { type: "image_url", image_url: { url: opts.dataUrl } },
    ],
  }];
  return call(messages, opts.model ?? process.env.OPENROUTER_VISION_MODEL ?? "openai/gpt-4o", 0.4);
}
```

- [ ] **Step 4: Run → PASS**.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: OpenRouter client (text + vision)"
```

### Task 7: Scraper module

**Files:**
- Create: `src/lib/scrape.ts`, `src/lib/scrape.test.ts`, `src/lib/__fixtures__/sample.html`

- [ ] **Step 1: Save a fixture** — `sample.html` containing `<html><body><nav>Menu</nav><main><h1>Acme CRM</h1><p>Acme helps sales teams automate follow-ups for mid-market B2B.</p></main><script>var x=1</script></body></html>`.

- [ ] **Step 2: Write failing test**

```ts
import { describe, it, expect } from "vitest";
import { extractReadableText } from "./scrape";
import { readFileSync } from "node:fs";
import path from "node:path";

it("extracts main text and drops scripts/nav noise", () => {
  const html = readFileSync(path.join(__dirname, "__fixtures__/sample.html"), "utf8");
  const text = extractReadableText(html, "https://acme.test");
  expect(text).toContain("Acme helps sales teams");
  expect(text).not.toContain("var x=1");
});
```

- [ ] **Step 3: Run → FAIL**.

- [ ] **Step 4: Implement** `src/lib/scrape.ts`

```ts
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export function extractReadableText(html: string, url: string): string {
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  const text = (article?.textContent ?? dom.window.document.body?.textContent ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 12000);
}

export async function fetchAndExtract(url: string): Promise<string> {
  if (process.env.FIRECRAWL_API_KEY) {
    try {
      const r = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url, formats: ["markdown"] }),
      });
      if (r.ok) {
        const j = await r.json();
        const md = j?.data?.markdown;
        if (md && md.length > 200) return md.slice(0, 12000);
      }
    } catch { /* fall through to fetch */ }
  }
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; OutreachBot/1.0)" } });
  if (!res.ok) throw new Error(`Could not fetch ${url} (${res.status})`);
  return extractReadableText(await res.text(), url);
}
```

- [ ] **Step 5: Run → PASS**.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: scraper with Readability extraction and Firecrawl fallback"
```

### Task 8: build-request — the generation composer (CORE)

**Files:**
- Create: `src/lib/ai/build-request.ts`, `src/lib/ai/build-request.test.ts`

- [ ] **Step 1: Write failing tests** (these encode the pass/fail property)

```ts
import { describe, it, expect } from "vitest";
import { buildInitialMessages, buildReplyMessages } from "./build-request";

const offering = { content: "Kakiyo runs LinkedIn conversations for SDRs." };
const prompt = { content: "Conversational, under 100 words, end with a soft question." };
const prospect = { compiledContext: "Sarah, sales engineer, posted about outreach volume." };

it("puts the user prompt verbatim and offering into the system message", () => {
  const msgs = buildInitialMessages({ prompt, offering, prospect });
  const sys = msgs.find((m) => m.role === "system")!;
  expect(sys.content).toContain("under 100 words");
  expect(sys.content).toContain("## Your Offering");
  expect(sys.content).toContain("Kakiyo runs LinkedIn");
});

it("puts prospect context and optional tone in the user message", () => {
  const msgs = buildInitialMessages({ prompt, offering, prospect, tone: "warmer" });
  const user = msgs.find((m) => m.role === "user")!;
  expect(user.content).toContain("Sarah, sales engineer");
  expect(user.content).toContain("warmer");
});

it("replays the full thread for replies as alternating roles", () => {
  const msgs = buildReplyMessages({
    prompt, offering, prospect,
    thread: [
      { kind: "outbound", content: "Hey Sarah..." },
      { kind: "inbound", content: "How does it work?" },
    ],
  });
  expect(msgs[0].role).toBe("system");
  expect(msgs[1]).toMatchObject({ role: "assistant", content: "Hey Sarah..." });
  expect(msgs[2]).toMatchObject({ role: "user", content: "How does it work?" });
  expect(msgs[msgs.length - 1].role).toBe("user"); // final instruction
});
```

- [ ] **Step 2: Run → FAIL**.

- [ ] **Step 3: Implement**

```ts
import type { ChatMessage } from "./openrouter";

type Offering = { content: string };
type Prompt = { content: string };
type Prospect = { compiledContext: string };
type ThreadMsg = { kind: "outbound" | "inbound"; content: string };

function systemMessage(prompt: Prompt, offering: Offering): ChatMessage {
  return {
    role: "system",
    content:
      `${prompt.content.trim()}\n\n` +
      `## Your Offering\n${offering.content.trim() || "(no offering details provided)"}\n\n` +
      `Write as a real human reaching out 1:1. Never sound like a template or mass email. ` +
      `Ground the message in the specific prospect details. Output only the message text.`,
  };
}

export function buildInitialMessages(input: {
  prompt: Prompt; offering: Offering; prospect: Prospect; tone?: string;
}): ChatMessage[] {
  const { prompt, offering, prospect, tone } = input;
  const userContent =
    `## Prospect\n${prospect.compiledContext.trim() || "(no prospect details provided)"}\n\n` +
    (tone ? `Tone/angle for this message: ${tone}\n\n` : "") +
    `Write the outreach message now.`;
  return [systemMessage(prompt, offering), { role: "user", content: userContent }];
}

export function buildReplyMessages(input: {
  prompt: Prompt; offering: Offering; prospect: Prospect; thread: ThreadMsg[]; tone?: string;
}): ChatMessage[] {
  const { prompt, offering, prospect, thread, tone } = input;
  const msgs: ChatMessage[] = [systemMessage(prompt, offering)];
  msgs.push({
    role: "user",
    content: `## Prospect\n${prospect.compiledContext.trim()}\n\n(The conversation so far follows.)`,
  });
  for (const m of thread) {
    msgs.push({ role: m.kind === "outbound" ? "assistant" : "user", content: m.content });
  }
  msgs.push({
    role: "user",
    content:
      (tone ? `Tone/angle: ${tone}. ` : "") +
      `Write the next reply, continuing this conversation naturally. ` +
      `Address their latest message directly, keep the same voice. Output only the message text.`,
  });
  return msgs;
}
```

- [ ] **Step 4: Run → PASS**.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: build-request generation composer (the heart) + tests"
```

### Task 9: Inline AI explainers

**Files:**
- Create: `src/lib/ai/explainers.ts`, `src/app/api/ai/explain/route.ts`

- [ ] **Step 1: explainers.ts**

```ts
export const EXPLAINERS = {
  offering: "Explain in 2-3 plain sentences what an 'offering' is for cold outreach: the core value the sender brings to a prospect, what makes outreach relevant. Then give one short tip to improve it.",
  prompt: "Explain in 2-3 plain sentences what the generation 'prompt' is: the instructions given to the AI before it writes (tone, length, what to emphasize/avoid). Then give one short tip.",
} as const;

export function improveInstruction(kind: "offering" | "prompt", current: string) {
  return `Here is a user's current ${kind}:\n\n${current}\n\n` +
    `Rewrite it to be sharper and more useful for generating personalized outreach. ` +
    `Keep their intent. Output only the improved ${kind} text.`;
}
```

- [ ] **Step 2: route** `src/app/api/ai/explain/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { generateText } from "@/lib/ai/openrouter";
import { EXPLAINERS, improveInstruction } from "@/lib/ai/explainers";

export async function POST(req: NextRequest) {
  await requireUser();
  const { kind, mode, current } = await req.json();
  if (kind !== "offering" && kind !== "prompt") return NextResponse.json({ error: "bad kind" }, { status: 400 });
  const instruction = mode === "improve" ? improveInstruction(kind, current ?? "") : EXPLAINERS[kind];
  const text = await generateText({ messages: [{ role: "user", content: instruction }], temperature: 0.5 });
  return NextResponse.json({ text });
}
```

- [ ] **Step 3: Verify** — `npm run typecheck` PASS. Commit:

```bash
git add -A && git commit -m "feat: inline AI explainer endpoint"
```

---

## Phase 2 — Offerings

### Task 10: Offerings server actions

**Files:**
- Create: `src/lib/actions/offerings.ts`

- [ ] **Step 1: Implement actions** (all use `requireUser()` and scope by `userId`)

```ts
"use server";
import { db } from "@/lib/db";
import { offerings } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { fetchAndExtract } from "@/lib/scrape";
import { generateText } from "@/lib/ai/openrouter";
import { revalidatePath } from "next/cache";

export async function listOfferings() {
  const u = await requireUser();
  return db.select().from(offerings).where(eq(offerings.userId, u.id)).orderBy(desc(offerings.updatedAt));
}

export async function createOffering(input: { name: string; content?: string; sourceUrl?: string }) {
  const u = await requireUser();
  const [row] = await db.insert(offerings).values({
    userId: u.id, name: input.name, content: input.content ?? "", sourceUrl: input.sourceUrl,
  }).returning();
  revalidatePath("/offerings");
  return row;
}

export async function updateOffering(input: { id: string; name?: string; content?: string; sourceUrl?: string }) {
  const u = await requireUser();
  await db.update(offerings).set({
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.content !== undefined ? { content: input.content } : {}),
    ...(input.sourceUrl !== undefined ? { sourceUrl: input.sourceUrl } : {}),
    updatedAt: new Date(),
  }).where(and(eq(offerings.id, input.id), eq(offerings.userId, u.id)));
  revalidatePath("/offerings");
}

export async function deleteOffering(id: string) {
  const u = await requireUser();
  await db.delete(offerings).where(and(eq(offerings.id, id), eq(offerings.userId, u.id)));
  revalidatePath("/offerings");
}

// Scrape a URL and turn raw text into a clean offering description.
export async function extractOfferingFromUrl(url: string): Promise<string> {
  await requireUser();
  const raw = await fetchAndExtract(url);
  return generateText({
    temperature: 0.4,
    messages: [{
      role: "user",
      content:
        `From this website content, write a concise 'offering' brief for cold outreach: ` +
        `what they do, who they sell to, the problem they solve, what makes them different, and any proof points. ` +
        `Write in plain prose, no preamble.\n\n---\n${raw}`,
    }],
  });
}
```

- [ ] **Step 2: Verify** `npm run typecheck` PASS. Commit:

```bash
git add -A && git commit -m "feat: offerings server actions with URL extraction"
```

### Task 11: Offerings UI

**Files:**
- Create: `src/app/(app)/offerings/page.tsx` (server: `listOfferings()` → pass to client), `src/app/(app)/offerings/offerings-client.tsx`

- [ ] **Step 1: Build client UI** with:
  - List of offering cards (name, snippet, Edit/Delete).
  - "New offering" editor: name field, a **URL field with a "Scrape & extract" button** that calls `extractOfferingFromUrl` and fills the content textarea (appending if content exists), a large editable **content textarea**, Save (calls create/update).
  - **"What's this? / Improve with AI"** controls that POST to `/api/ai/explain` with `{kind:"offering", mode}` and show the result (explanation inline; improve replaces textarea after confirm).
  - Loading states on scrape/AI buttons; error text on failure.

- [ ] **Step 2: Verify manually** — create an offering by scraping `https://kakiyo.com`; confirm extracted text appears and is editable; save; edit; delete. Try the Explain and Improve buttons.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: offerings UI with scrape, edit, and inline AI help"
```

---

## Phase 3 — Prompts

### Task 12: Prompts actions + default seeding

**Files:**
- Create: `src/lib/actions/prompts.ts`

- [ ] **Step 1: Implement** — `listPrompts`, `createPrompt`, `updatePrompt`, `deletePrompt`, `setDefaultPrompt` (clears other defaults for the user in a transaction), and `ensureDefaultPrompt(userId)` that inserts a starter prompt if the user has none:

```ts
const STARTER_PROMPT =
  "You are writing a short, personalized cold outreach message.\n" +
  "- Conversational and human, never salesy or templated.\n" +
  "- Under 100 words.\n" +
  "- Open with a specific, relevant observation about the prospect before mentioning the offering.\n" +
  "- End with a soft question, not a hard ask.";
```
Pattern mirrors `offerings.ts` (requireUser, scope by userId, revalidatePath("/prompts")). `setDefaultPrompt`: `update prompts set isDefault=false where userId=u.id`, then set the chosen one true.

- [ ] **Step 2: Verify + commit**

```bash
git add -A && git commit -m "feat: prompts actions with default management and starter seed"
```

### Task 13: Prompts UI

**Files:**
- Create: `src/app/(app)/prompts/page.tsx`, `src/app/(app)/prompts/prompts-client.tsx`

- [ ] **Step 1: Build UI** — list prompts (name, default badge, "Set default", Edit, Delete); editor with name + content textarea + Save; **Explain/Improve** buttons hitting `/api/ai/explain` with `kind:"prompt"`. On first load, call `ensureDefaultPrompt` (in the server page) so a new user always has one.

- [ ] **Step 2: Verify manually** — edit the starter prompt, create a second, switch default. Commit:

```bash
git add -A && git commit -m "feat: prompts UI with default switching and inline AI help"
```

---

## Phase 4 — Prospects

### Task 14: Prospects actions + context compilation

**Files:**
- Create: `src/lib/actions/prospects.ts`

- [ ] **Step 1: Implement** these actions (requireUser, scope by userId; sources joined via prospectId after ownership check):
  - `listProspects()`, `getProspect(id)` (with sources), `createProspect({name})`, `deleteProspect(id)`.
  - `addUrlSource({prospectId, type, url})`: validate ownership, `fetchAndExtract(url)`, insert `prospectSources` row with `extractedText`, then `recompileContext(prospectId)`.
  - `addNoteSource({prospectId, text})`: insert note source (extractedText = text), recompile.
  - `addScreenshotSource({prospectId, dataUrl})`: `generateFromImage({ instruction: VISION_INSTRUCTION, dataUrl })`, insert `linkedin_screenshot` source with the returned text, recompile.
  - `removeSource(id)`: ownership check via join, delete, recompile.
  - `recompileContext(prospectId)`: gather all sources' `extractedText`, ask the model to merge into one tight profile, save to `prospects.compiledContext`.

```ts
const VISION_INSTRUCTION =
  "This is a screenshot of a person's profile (likely LinkedIn). Extract everything useful for " +
  "personalized outreach: name, role, company, seniority, location, summary/about, recent posts or " +
  "activity, skills, and anything notable. Output concise plain text, no preamble.";

// recompileContext core:
async function compile(texts: { type: string; value: string; extractedText: string }[]) {
  const blob = texts.map((t) => `[${t.type}${t.value ? ` ${t.value}` : ""}]\n${t.extractedText}`).join("\n\n");
  return generateText({
    temperature: 0.3,
    messages: [{
      role: "user",
      content:
        `Merge these raw notes about ONE prospect into a single tight profile for personalized outreach. ` +
        `Keep concrete facts (role, company, what they care about, recent activity, technical background). ` +
        `Remove navigation/boilerplate. Plain prose, no preamble.\n\n${blob}`,
    }],
  });
}
```

- [ ] **Step 2: Verify + commit**

```bash
git add -A && git commit -m "feat: prospects actions with URL/note/screenshot ingestion and context compilation"
```

### Task 15: Prospects UI

**Files:**
- Create: `src/app/(app)/prospects/page.tsx`, `src/app/(app)/prospects/prospects-client.tsx`, `src/app/(app)/prospects/[id]/page.tsx`

- [ ] **Step 1: List + create** — prospects list (name, source count, link to detail); "New prospect" (name only) → go to detail.

- [ ] **Step 2: Detail page** — show compiled context (read-only, regenerates on source change) and a **flexible source adder**:
  - Type selector: GitHub URL / Website URL / Company URL / Other URL / Note / LinkedIn screenshot.
  - For URL types: url input + "Add & scrape" → `addUrlSource`.
  - For Note: textarea → `addNoteSource`.
  - For screenshot: file input; read file to a base64 `data:` URL in the browser, POST to `addScreenshotSource`. (Enforce ~5MB client-side; images only.)
  - List existing sources with extracted-text preview + remove button.

- [ ] **Step 3: Verify manually** — create "Sarah", add a GitHub URL, a company URL, a note, and a LinkedIn screenshot image; confirm each extracts and the compiled context updates and reads coherently.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: prospects UI with flexible mixed-source input and vision screenshots"
```

---

## Phase 5 — Generation

### Task 16: Generation actions

**Files:**
- Create: `src/lib/actions/generation.ts`

- [ ] **Step 1: Implement**
  - `generateMessage({ prospectId, offeringId, promptId, tone? })`: ownership-check all three; load offering, prompt, prospect; `buildInitialMessages(...)`; `generateText(...)`; create a `conversations` row + first `outbound` message; return `{ conversationId, message }`.
  - `regenerate({ conversationId, tone? })`: load conversation + its offering/prompt/prospect; if thread has only the first outbound (no inbound yet), rebuild with `buildInitialMessages` (new variant) else use reply path; insert a new `outbound` message (variant kept in history). Return message.
  - `rateMessage({ id, rating })`, `toggleFavorite({ id })`, `deleteMessage(id)` — ownership via join to conversation→user.
  - Helper `loadConversationBundle(conversationId, userId)` returning `{ conversation, offering, prompt, prospect, thread }` reused by generation + replies.

```ts
// generateMessage core (after loading offering, prompt, prospect):
const text = await generateText({ messages: buildInitialMessages({ prompt, offering, prospect, tone }) });
const [conv] = await db.insert(conversations).values({
  userId: u.id, prospectId, offeringId, promptId, title: prospect.name,
}).returning();
const [msg] = await db.insert(messages).values({
  conversationId: conv.id, kind: "outbound", content: text, tone, model: process.env.OPENROUTER_MODEL,
}).returning();
```

- [ ] **Step 2: Verify + commit**

```bash
git add -A && git commit -m "feat: message generation, regeneration, rating, favorite actions"
```

### Task 17: Generate UI

**Files:**
- Create: `src/app/(app)/generate/page.tsx`, `src/app/(app)/generate/generate-client.tsx`

- [ ] **Step 1: Build UI** — three selectors (offering, prompt, prospect — loaded server-side; prompt defaults to user's default), optional **tone/angle** text input, Generate button → calls `generateMessage`, shows the message in a card with: **Copy** (one click), **rating** (1–5), **favorite** toggle, **Delete**, **Regenerate** (and "Regenerate with tone"), and a link "Open conversation" → `/conversations/[id]`. Empty states link to create an offering/prompt/prospect if none exist.

- [ ] **Step 2: Verify manually** — run the full Ayush/Kakiyo/Sarah scenario: generate, confirm it reads human and uses prospect specifics; copy; rate; favorite; regenerate with a different tone and confirm output changes.

- [ ] **Step 3: Quality property check** — generate for the same prospect with two different prompts (and two different offerings); confirm outputs differ meaningfully. This is the graded property.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: generate page with copy/rate/favorite/regenerate"
```

---

## Phase 6 — Replies / conversations

### Task 18: Reply action + conversation view

**Files:**
- Create: `src/lib/actions/generation.ts` (add `addReplyAndRespond`), `src/app/(app)/conversations/[id]/page.tsx`

- [ ] **Step 1: Implement `addReplyAndRespond({ conversationId, replyText, tone? })`**

```ts
// after loadConversationBundle -> { offering, prompt, prospect, thread }:
await db.insert(messages).values({ conversationId, kind: "inbound", content: replyText });
const fullThread = [...thread, { kind: "inbound" as const, content: replyText }];
const text = await generateText({
  messages: buildReplyMessages({ prompt, offering, prospect, thread: fullThread, tone }),
});
const [msg] = await db.insert(messages).values({
  conversationId, kind: "outbound", content: text, tone, model: process.env.OPENROUTER_MODEL,
}).returning();
revalidatePath(`/conversations/${conversationId}`);
return msg;
```

- [ ] **Step 2: Conversation page** — server-load the full thread ordered by `createdAt`; render as a chat (outbound = right/your-message styling, inbound = left/prospect), each outbound with copy/rate/favorite. A **"Paste prospect reply"** textarea + optional tone + Send → `addReplyAndRespond`, which appends the reply and the new follow-up. Full thread stays visible.

- [ ] **Step 3: Verify manually** — from a generated message, open the conversation, paste Sarah's reply ("Interesting, how does it actually work? Does it need access to my LinkedIn account?"), confirm the follow-up directly answers it and keeps the voice. Add a second reply to confirm multi-turn continuity.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: threaded reply handling and conversation view"
```

---

## Phase 7 — Analytics, polish, deploy

### Task 19: Analytics

**Files:**
- Create: `src/lib/actions/analytics.ts`, `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Implement queries** (all scoped to user):
  - `totalMessages` = count messages where kind=outbound (join conversations on userId).
  - `prospectCount` = count prospects.
  - `conversationsWithReplies` = count distinct conversationId having ≥1 inbound message.
  - `offeringUsage` = outbound message count grouped by offeringId (join conversations), with offering names, ordered desc.

```ts
// conversationsWithReplies example:
const rows = await db.select({ cid: messages.conversationId }).from(messages)
  .innerJoin(conversations, eq(messages.conversationId, conversations.id))
  .where(and(eq(conversations.userId, u.id), eq(messages.kind, "inbound")));
const withReplies = new Set(rows.map(r => r.cid)).size;
```

- [ ] **Step 2: Dashboard UI** — stat cards (Total messages, Prospects saved, Conversations with replies) + a small "Top offerings" list/bar. Numbers must be live and accurate.

- [ ] **Step 3: Verify manually** — confirm counts match what you created during testing.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: analytics dashboard with live aggregates"
```

### Task 20: Polish + error handling pass

**Files:** various pages, `src/components/ui/*`

- [ ] **Step 1:** Apply consistent styling (use the `frontend-design` skill for a clean, non-generic dashboard look), loading spinners on every async button, toast/inline errors for AI/scrape failures, and empty states with CTAs across Offerings/Prompts/Prospects/Generate.
- [ ] **Step 2:** Confirm an AI action with a bad/missing key surfaces a readable error (not a crash) end-to-end.
- [ ] **Step 3:** `npm run typecheck` PASS, `npm run lint` clean, `npm run test` PASS, `npm run build` succeeds.
- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "polish: styling, loading/error states, empty states"
```

### Task 21: Deploy to Vercel + Neon

**Files:** `README.md`

- [ ] **Step 1:** Push to GitHub `main`. Import into Vercel.
- [ ] **Step 2:** In Vercel project settings, add env vars: `DATABASE_URL` (Neon), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (the deployed https URL), `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_VISION_MODEL`, optional `FIRECRAWL_API_KEY`.
- [ ] **Step 3:** Run `npm run db:push` against the production `DATABASE_URL` (or run migrations) so tables exist.
- [ ] **Step 4:** Deploy. Then end-to-end on the live URL: sign up → create Kakiyo offering by scraping → customize prompt → add prospect with mixed sources + screenshot → generate → reply → check dashboard.
- [ ] **Step 5:** Write `README.md`: what it is, env vars, local dev (`npm i`, set `.env.local`, `npm run db:push`, `npm run dev`), and the live URL.
- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "docs: README with setup and live URL"
```

---

## Self-Review (completed)

**Spec coverage:** Auth (T4–5); Offerings incl. scrape+manual+edit+AI explain (T10–11); Prompts incl. edit+default+AI help (T12–13); Prospects flexible mixed sources + screenshot vision + compiled context (T14–15); Generation + history/rate/favorite/copy/delete/regenerate-with-tone (T16–17); Reply threading as continuation (T18); Analytics — all four numbers (T19); Deploy (T21). Prompt-assembly core with the testable property (T8) and quality check (T17 Step 3). All spec sections map to a task.

**Placeholder scan:** Concrete code for all non-UI logic (schema, AI client, scraper, build-request, actions). UI tasks specify exact components/behavior + the non-trivial code; styling delegated to the frontend-design skill at execution — intentional, not a placeholder.

**Type consistency:** `ChatMessage` shared by `openrouter.ts` and `build-request.ts`. `messageKind`/`sourceType` enums match strings used in actions (`outbound`/`inbound`, `linkedin_screenshot`, etc.). `buildInitialMessages`/`buildReplyMessages` signatures match their callers in `generation.ts`. `requireUser()` returns the user with `.id` used everywhere.

**Risks flagged for execution:** verify OpenRouter base URL/model IDs/multimodal shape (T6) and Better Auth Drizzle adapter API (T4) against live docs before relying on them.
```