export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type TtsBody = { text?: string };

export async function POST(req: Request): Promise<Response> {
  const body: TtsBody = await req.json();
  const inputText: string = (body.text ?? "Hello!").slice(0, 500);

  const speech = await client.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    format: "mp3",
    input: inputText,
  });

  const mp3 = Buffer.from(await speech.arrayBuffer());
  return new Response(mp3, { headers: { "Content-Type": "audio/mpeg" } });
}
