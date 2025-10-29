// app/api/pingpong/tts/route.ts
import OpenAI from "openai";
export const runtime = "nodejs"; // EdgeだとStreaming不可な場合があるのでnodeを推奨

export async function POST(req: Request) {
  try {
    const { text, voice = "alloy" } = await req.json();
    if (!text) return new Response("Missing text", { status: 400 });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    // TTS（mp3 を返す）
    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",   // もしくは "tts-1"
      voice,
      input: text,
      format: "mp3",
    });

    const buf = Buffer.from(await speech.arrayBuffer());
    return new Response(buf, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (e:any) {
    console.error("TTS error", e);
    return new Response("TTS failed", { status: 500 });
  }
}
