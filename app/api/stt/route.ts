// app/api/stt/route.ts
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WhisperResp = { text?: string; language?: string };

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    // 「file」でも「audio」でも対応
    const file = (form.get("file") || form.get("audio")) as File | null;
    if (!file) return Response.json({ error: "no file" }, { status: 400 });

    const outbound = new FormData();
    outbound.append("file", file, "input.webm");
    outbound.append("model", "whisper-1");
    outbound.append("response_format", "json");
    // ★ 英語に固定
    outbound.append("language", "en");
    outbound.append(
      "prompt",
      "Transcribe ONLY the spoken English. Return plain English text."
    );
    // 必要なら：outbound.append("temperature", "0");

    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: outbound,
    });

    if (!r.ok) {
      const err = await r.text().catch(() => "stt failed");
      return Response.json({ error: err }, { status: 500 });
    }

    const data = (await r.json()) as WhisperResp;
    return Response.json({ text: data.text ?? "" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "stt error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
