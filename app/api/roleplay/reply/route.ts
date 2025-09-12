// app/api/roleplay/reply/route.ts
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CEFR = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export async function POST(req: NextRequest) {
  try {
    const { scene, level, user, lastAi } = (await req.json()) as {
      scene: string;
      level: CEFR;
      user: string;
      lastAi?: string;
    };

    // AI（お客さま役）が返す短い自然な英語１文。必要なら会話終了フラグ [DONE] を含める。
    const system =
      "You are a polite customer speaking English with a Japanese staff member. " +
      "Reply in one short, natural English sentence (<= 15 words). No explanations, no Japanese. " +
      "If the conversation is complete, append [DONE] at the end.";

    const userPrompt =
      `Scene: ${scene}\n` +
      `Level: ${level}\n` +
      (lastAi ? `Previous AI (customer): "${lastAi}"\n` : "") +
      `Staff said: "${user}"\n` +
      `Now reply as the customer.\n`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!r.ok) {
      const text = await r.text();
      return Response.json({ error: text || "OpenAI error" }, { status: 500 });
    }

    const data: {
      choices?: { message?: { content?: string } }[];
    } = await r.json();

    const raw = data?.choices?.[0]?.message?.content?.trim() || "";
    const done = /\[DONE\]/i.test(raw);
    const ai = raw.replace(/\[DONE\]/gi, "").trim();

    // つねに JSON を返す
    return Response.json(
      {
        ai,       // ← フロントが読むキー
        done,     // ← 完了フラグ（任意）
        // contextId は無くても動作させる（サーバレスで状態持たないため）
      },
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
