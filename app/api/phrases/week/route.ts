/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/phrases/week/route.ts
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ===== Types ===== */
type CEFR = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
type Genre = "restaurant" | "hotel" | "retail" | "guide";
type Phrase = { en: string; ja: string };
type DayPlan = { phrases: Phrase[]; scene: string; tips: string[] };
type WeekPlan = {
  weekStartISO: string;
  genre: Genre;
  level: CEFR;
  perDay: number;
  days: DayPlan[]; // length = numDays
};

/* ===== Helpers ===== */
const sceneForGenre = (g: Genre) =>
  g === "restaurant" ? "menu" :
  g === "hotel"      ? "check_in" :
  g === "retail"     ? "payment" :
                       "directions";

/* ===== Route ===== */
export async function POST(req: NextRequest) {
  try {
    // 1) 入力取得（文字/数値の揺れを吸収）
    const body = (await req.json()) as {
      genre: Genre;
      level: CEFR;
      perDay?: number | string;
      days?: number | string;
      seed?: string | number;
    };

    const genre  = body.genre;
    const level  = body.level;
    const perDay = Number(body.perDay ?? 10);
    const numDays = Number(body.days ?? 7);
    const _seed = Number(body.seed ?? Date.now()); // 使わないなら削除可

    if (!genre || !level || Number.isNaN(numDays) || numDays <= 0) {
      return new Response(JSON.stringify({ error: "invalid genre/level/days" }), { status: 400 });
    }

    const system =
`You are an English tutor for Japanese service staff.
Return ONLY valid JSON: {"phrases":[{"en":"","ja":""},...]}.
Rules:
- Generate short, useful, natural English phrases for the given SCENE and CEFR level.
- Provide accurate Japanese translations.
- Do NOT repeat any phrase listed in EXCLUDE.
- Exactly N items.`;

    // 2) 重複除去のためのセット（英語文ベース）
    const all = new Set<string>();

    // 3) 返却用の配列（← これが以前は未定義/誤使用だった）
    const outDays: DayPlan[] = [];

    // 4) 日数分ループ
    for (let d = 0; d < numDays; d++) {
      const scene = sceneForGenre(genre);
      const excludeList = [...all].slice(0, 200); // プロンプト暴走抑止

      const user =
`SCENE: ${scene}
LEVEL: ${level}
N: ${perDay}
EXCLUDE: ${excludeList.join(" | ")}`;

      // 5) OpenAI 呼び出し（fetch 版）
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });

      if (!r.ok) {
        const txt = await r.text();
        return new Response(JSON.stringify({ error: txt }), { status: 500 });
      }

      const data = await r.json();
      const raw = (data?.choices?.[0]?.message?.content as string) ?? "{}";

      // 6) JSONパース（壊れた場合の保険あり）
      let j: { phrases?: Phrase[] } = {};
      try {
        j = JSON.parse(raw) as { phrases?: Phrase[] };
      } catch {
        const m = raw.match(/\{[\s\S]*\}$/);
        if (m) {
          try { j = JSON.parse(m[0]) as { phrases?: Phrase[] }; } catch {}
        }
      }

      const list = (j.phrases ?? []).filter(
        (p): p is Phrase => !!p?.en && !!p?.ja
      );

      // 7) 最終の重複除去
      const unique: Phrase[] = [];
      for (const p of list) {
        const key = p.en.trim().toLowerCase();
        if (key && !all.has(key)) {
          all.add(key);
          unique.push({ en: p.en.trim(), ja: p.ja.trim() });
        }
      }

      // 8) outDays に積む（← 以前は numDays.push の誤り）
      outDays.push({
        phrases: unique.slice(0, perDay),
        scene,
        tips: [
          "短く・はっきり・笑顔で伝える",
          "言い換えを1つ用意する",
          "相手の理解サイン（OK/Thanks）を待つ",
        ],
      });
    }

    // 9) 返却
    const weekStartISO = new Date(new Date().toDateString()).toISOString();
    const plan: WeekPlan = {
      weekStartISO,
      genre,
      level,
      perDay,
      days: outDays,
    };

    return new Response(JSON.stringify(plan), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "server error";
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
