import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const form = await req.formData();
    // フロントは "file" キーで送信
    const part = form.get("file");
    const file = part instanceof File ? part : null;

    if (!file) {
      return new Response(JSON.stringify({ error: "no file" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const outbound = new FormData();
    outbound.append("file", file, file.name || "input.webm");
    outbound.append("model", "whisper-1");
    outbound.append("response_format", "json");

    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: outbound,
    });

    if (!r.ok) {
      const text = await r.text();
      return new Response(JSON.stringify({ error: text }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = (await r.json()) as { text?: string };
    return new Response(JSON.stringify({ text: data.text ?? "" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "stt failed";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
