// app/api/roleplay/model/route.ts
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CEFR = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export async function POST(req: NextRequest) {
  try {
    const { scene, level, question } = (await req.json()) as {
      scene: string;
      level: CEFR;
      question?: string;
    };

    const system =
      "Provide a MODEL ANSWER in English (1–2 sentences) that a polite staff member could say in the given scene and level. Keep it natural and simple. Output only the answer.";

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `Scene: ${scene}\nLevel: ${level}\nCustomer asked: ${question ?? ""}`,
          },
        ],
      }),
    });

    if (!r.ok) {
      return new Response(JSON.stringify({ error: await r.text() }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await r.json();
    const answer = (data?.choices?.[0]?.message?.content as string | undefined)?.trim() || "";
    // フロントが期待しているキー名で返す
    return new Response(JSON.stringify({ ideal: answer }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "model failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
