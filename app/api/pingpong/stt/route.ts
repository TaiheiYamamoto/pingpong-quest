export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request): Promise<Response> {
  // ① ArrayBuffer を直接 File に
  const ab: ArrayBuffer = await req.arrayBuffer();
  const file = new File([ab], "audio.webm", { type: "audio/webm" });

  // ② Whisper
  const tr = await client.audio.transcriptions.create({
    file,
    model: "gpt-4o-mini-transcribe",
    language: "en", // 英語のみ
  });

  const text: string = tr.text ?? "";
  return new Response(JSON.stringify({ text }), {
    headers: { "Content-Type": "application/json" },
  });
}
