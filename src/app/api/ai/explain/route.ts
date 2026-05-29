import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth/session";
import { generateText } from "@/lib/ai/openrouter";
import { EXPLAINERS, improveInstruction } from "@/lib/ai/explainers";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { kind, mode, current } = await req.json();
  if (kind !== "offering" && kind !== "prompt") {
    return NextResponse.json({ error: "bad kind" }, { status: 400 });
  }
  const safeKind = kind as "offering" | "prompt";
  const instruction = mode === "improve" ? improveInstruction(safeKind, current ?? "") : EXPLAINERS[safeKind];
  try {
    const text = await generateText({ messages: [{ role: "user", content: instruction }], temperature: 0.5 });
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI error" }, { status: 500 });
  }
}
