// app/api/stt/route.ts
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  const form = await _req.formData();
  const file = form.get("audio") as File | null;
  if (!file) return new Response(JSON.stringify({ error: "no file" }), { status: 400 });

  const outbound = new FormData();
  outbound.append("file", file, "input.webm");
  outbound.append("model", "whisper-1");
  outbound.append("response_format", "json");

  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: outbound,
  });

  if (!r.ok) return new Response(await r.text(), { status: 500 });
  const data = (await r.json()) as { text?: string };
  return new Response(JSON.stringify({ text: data.text ?? "" }), {
    headers: { "Content-Type": "application/json" },
  });
}
