import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CEFR = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export async function POST(req: NextRequest) {
  try {
    const { phrases, level } = (await req.json()) as { phrases: string[]; level: CEFR };
    const system =
      "You are a helpful English tutor for Japanese learners. Explain briefly in Japanese. Return ONLY JSON: {\"points\": string[]}.";

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
              `以下の英語フレーズの使い方・丁寧表現・言い換え・日本人が間違えやすい点を、見出し無し・短い日本語箇条書きで。\n` +
              phrases.map((p, i) => `${i + 1}. ${p}`).join("\n"),
          },
        ],
      }),
    });

    if (!r.ok) return new Response(await r.text(), { status: 500 });
    const data = await r.json();
    const raw = (data?.choices?.[0]?.message?.content as string) ?? "{}";

    let json: { points?: string[] } = {};
    try {
      json = JSON.parse(raw) as { points?: string[] };
    } catch {
      const m = raw.match(/\{[\s\S]*\}$/);
      if (m) json = JSON.parse(m[0]) as { points?: string[] };
    }

    if (!json.points) json.points = ["解説をうまく取得できませんでした。もう一度お試しください。"];
    return new Response(JSON.stringify(json), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: "bad request" }), { status: 400 });
  }
}
