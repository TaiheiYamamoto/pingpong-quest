// app/api/roleplay/route.ts
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CEFR = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
type RoleReq = { scene: string; userUtterance: string; level: CEFR };
type RoleResp = { reply: string; tips: string[]; score: number };

export async function POST(req: NextRequest) {
  const body = (await req.json()) as RoleReq;

  const system =
    "You are an English conversation partner for Japanese service-industry staff. Reply in simple, natural English. Also evaluate briefly. Return ONLY JSON with keys: reply (EN), tips (JA array), score (0-100).";

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content:
            `Scene: ${body.scene}\n` +
            `User level target: ${body.level}\n` +
            `User said: ${body.userUtterance}\n` +
            `評価: 100点満点で、返答の適切さ/丁寧さ/通じやすさを総合。tipsは2〜3個、日本語で短く。`,
        },
      ],
    }),
  });

  if (!r.ok) return new Response(await r.text(), { status: 500 });
  const data = await r.json();
  const raw = (data?.choices?.[0]?.message?.content as string) ?? "{}";

  let json: RoleResp = { reply: "", tips: [], score: 60 };
  try {
    json = JSON.parse(raw) as RoleResp;
  } catch {
    const m = raw.match(/\{[\s\S]*\}$/);
    if (m) json = JSON.parse(m[0]) as RoleResp;
  }

  return new Response(JSON.stringify(json), { headers: { "Content-Type": "application/json" } });
}
