// app/api/roleplay/route.ts
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CEFR = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

type AskReq = { scene: string; lang?: "ja" | "en" }; // 初回の質問用
type ReplyReq = { scene: string; userUtterance: string; level: CEFR }; // 応答用

type AskResp = { question: string };
type ReplyResp = { reply: string; tips: string[]; score: number };

const MODEL = "gpt-4o-mini";

export async function POST(req: NextRequest) {
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not set" }), { status: 500 });
    }

    const body = await req.json();

    // ========== 1) 初回の質問モード ==========
    if (!body.userUtterance) {
      const b = body as AskReq;

      const system =
        "You are a friendly English speaking customer in a short roleplay for Japanese service staff. " +
        "Ask the FIRST question in simple, natural English, contextually appropriate for the given scene. " +
        "Return ONLY JSON with key 'question'.";

      const user =
        `Scene: ${b.scene}\n` +
        `Rules: One short question only. No extra words. Example style: 'Do you have any food allergies?'`;

      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          response_format: { type: "json_object" },
          temperature: 0.4,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });

      if (!r.ok) {
        const t = await r.text();
        return new Response(JSON.stringify({ error: t }), { status: 500 });
      }
      const data = await r.json();
      const raw = (data?.choices?.[0]?.message?.content as string) ?? "{}";

      let json: AskResp = { question: "" };
      try {
        json = JSON.parse(raw) as AskResp;
      } catch {
        const m = raw.match(/\{[\s\S]*\}$/);
        if (m) json = JSON.parse(m[0]) as AskResp;
      }

      if (!json.question) {
        // 念のためフォールバック
        json.question = "Do you have any food allergies?";
      }
      return Response.json(json);
    }

    // ========== 2) 応答モード（採点・Tipsつき） ==========
    const b = body as ReplyReq;

    const system =
      "You are an English conversation partner for Japanese service-industry staff. " +
      "Reply in simple, natural English. Also evaluate briefly. " +
      "Return ONLY JSON with keys: reply (EN), tips (JA array), score (0-100).";

    const user =
      `Scene: ${b.scene}\n` +
      `User level target: ${b.level}\n` +
      `User said: ${b.userUtterance}\n` +
      `評価: 100点満点で、返答の適切さ/丁寧さ/通じやすさを総合。tipsは2〜3個、日本語で短く。`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        temperature: 0.4,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: t }), { status: 500 });
    }

    const data = await r.json();
    const raw = (data?.choices?.[0]?.message?.content as string) ?? "{}";

    let json: ReplyResp = { reply: "", tips: [], score: 60 };
    try {
      json = JSON.parse(raw) as ReplyResp;
    } catch {
      const m = raw.match(/\{[\s\S]*\}$/);
      if (m) json = JSON.parse(m[0]) as ReplyResp;
    }

    // フォールバック
    if (!json.reply) json.reply = "Thank you. Could you please tell me more?";
    if (!Array.isArray(json.tips)) json.tips = ["短く、わかりやすく答えましょう。"];
    if (typeof json.score !== "number") json.score = 60;

    return Response.json(json);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
