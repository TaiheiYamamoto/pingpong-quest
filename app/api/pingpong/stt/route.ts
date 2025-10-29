// app/api/pingpong/stt/route.ts
import OpenAI from "openai";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const buf = Buffer.from(await req.arrayBuffer());
  // ブラウザ録音(webm/opus)想定
  const file = new File([buf], "input.webm", { type: "audio/webm" });

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const res = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file,
    language: "en", // 固定したい場合だけ
  });

  return Response.json({ text: (res as any).text ?? "" });
}
