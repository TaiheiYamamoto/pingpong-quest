// app/api/tts/route.ts
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TtsReq = { text: string };

export async function POST(req: NextRequest) {
  const { text } = (await req.json()) as TtsReq;
  if (!text) return new Response("no text", { status: 400 });

  const r = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      voice: "alloy",
      input: text,
      format: "mp3",
    }),
  });

  if (!r.ok) return new Response(await r.text(), { status: 500 });
  const arrBuf = await r.arrayBuffer();
  return new Response(arrBuf, { headers: { "Content-Type": "audio/mpeg" } });
}
