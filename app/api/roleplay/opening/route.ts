// app/api/roleplay/opening/route.ts
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CEFR = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
type OpeningReq = { scene: string; level: CEFR };
type OpeningResp = { question: string };

export async function POST(req: NextRequest) {
  const body = (await req.json()) as OpeningReq;
  const scene = body.scene || "menu";
  const level = body.level || "A2";

  const system =
    "You are an English conversation partner for Japanese service-industry staff. " +
    "Your job is to ASK the first question to start the conversation in a given scene. " +
    "Keep it short, friendly, and easy for the target level. Return JSON with key 'question' (English).";

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content:
            `Scene: ${scene}\nTarget level: ${level}\n` +
            "Ask the first question only. Example for menu: 'What would you like to drink?'",
        },
      ],
    }),
  });

  if (!r.ok) return new Response(await r.text(), { status: 500 });
  const data = await r.json();
  const raw = (data?.choices?.[0]?.message?.content as string) ?? "{}";

  let out: OpeningResp = { question: "" };
  try {
    out = JSON.parse(raw) as OpeningResp;
  } catch {
    const m = raw.match(/\{[\s\S]*\}$/);
    if (m) out = JSON.parse(m[0]) as OpeningResp;
  }
  return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json" } });
}
