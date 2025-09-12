// app/api/stt/route.ts
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    // フロントと合わせて "file" を読む
    const file = form.get("file") as File | null;
    if (!file) {
      return new Response(JSON.stringify({ error: "no file" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const outbound = new FormData();
    // webm でも m4a でもファイルの中身が使われます（拡張子は任意）
    outbound.append("file", file, file.name || "input.webm");
    outbound.append("model", "whisper-1");            // 必要に応じて gpt-4o-mini-transcribe でも可
    outbound.append("response_format", "json");

    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: outbound,
    });

    if (!r.ok) {
      const text = await r.text();
      return new Response(JSON.stringify({ error: text }), { status: 500 });
    }

    const data = (await r.json()) as { text?: string };
    return new Response(JSON.stringify({ text: data.text ?? "" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "stt failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
