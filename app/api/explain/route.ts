// app/api/explain/route.ts
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CEFR = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
type ExplainReq = { phrases: string[]; level: CEFR };
type ExplainResp = { points: string[] };

export async function POST(req: NextRequest) {
  try {
    const { phrases, level } = (await req.json()) as Partial<ExplainReq>;

    if (!Array.isArray(phrases) || phrases.length === 0 || !level) {
      return new Response(JSON.stringify({ error: "bad request" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const system =
      'You are a helpful English tutor for Japanese learners. Explain briefly in Japanese. Return ONLY JSON with key "points" (array of short JA strings).';

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
              `レベル: ${level}\n` +
              `以下の英語フレーズの使い方・丁寧表現・言い換え・日本人が間違えやすい点を、見出しなしの短い日本語の箇条書きで。\n` +
              phrases.map((p, i) => `${i + 1}. ${p}`).join("\n"),
          },
        ],
      }),
    });

    if (!r.ok) {
      return new Response(await r.text(), { status: 500 });
    }

    const data = await r.json();
    const raw = (data?.choices?.[0]?.message?.content as string) ?? "{}";

    let parsed: ExplainResp | null = null;
    try {
      parsed = JSON.parse(raw) as ExplainResp;
    } catch {
      const m = String(raw).match(/\{[\s\S]*\}$/);
      if (m) parsed = JSON.parse(m[0]) as ExplainResp;
    }

    const points =
      parsed?.points?.filter(Boolean) ??
      ["解説をうまく取得できませんでした。もう一度お試しください。"];

    return new Response(JSON.stringify({ points }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("explain route error:", err);
    return new Response(JSON.stringify({ error: "failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
