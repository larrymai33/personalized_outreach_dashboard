import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Next.js loads .env.local at runtime; the drizzle-kit CLI does not, so load it here.
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
