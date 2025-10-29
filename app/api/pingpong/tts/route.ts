export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request): Promise<Response> {
  try {
    const { text } = (await req.json()) as { text?: string };
    const inputText = (text ?? "Hello!") || "Hello!";

    // 一部の SDK では format / response_format を受け付けません。
    // 型に存在するプロパティ（model, voice, input）のみ渡します。
    const speech = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: inputText,
    });

    // 音声バイナリを返す
    const ab = await speech.arrayBuffer();
    // mp3想定で返す（SDKのデフォルトが mp3 の場合が多い）
    return new Response(ab, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "TTS error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
