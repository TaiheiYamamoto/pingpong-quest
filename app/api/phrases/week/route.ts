// app/api/phrases/week/route.ts
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CEFR = "A1"|"A2"|"B1"|"B2"|"C1"|"C2";
type Genre = "restaurant" | "hotel" | "retail" | "guide";
type Phrase = { en: string; ja: string };
type DayPlan = { phrases: Phrase[]; scene: string; tips: string[] };
type WeekPlan = {
  weekStartISO: string;
  genre: Genre;
  level: CEFR;
  perDay: number;
  days: DayPlan[]; // length = 7
};

const sceneForGenre = (g: Genre) =>
  g === "restaurant" ? "menu" :
  g === "hotel" ? "check_in" :
  g === "retail" ? "payment" : "directions";

export async function POST(req: NextRequest) {
  try {
    const { genre, level, perDay = 10, days = 7, _seed } = (await req.json()) as {
      genre: Genre; level: CEFR; perDay?: number; days?: number; seed?: string;
    };

    if (!genre || !level) {
      return new Response(JSON.stringify({ error: "genre/level required" }), { status: 400 });
    }

    const system =
`You are an English tutor for Japanese service staff.
Return ONLY valid JSON: {"phrases":[{"en":"","ja":""},...]}.
Rules:
- Generate short, useful, natural English phrases for the given SCENE and CEFR level.
- Provide accurate Japanese translations.
- Do NOT repeat any phrase listed in EXCLUDE.
- Exactly N items.`;

    const all = new Set<string>(); // 重複除去（英語文ベース）
    const outDays: DayPlan[] = [];

    for (let d = 0; d < days; d++) {
      const scene = sceneForGenre(genre);
      const excludeList = [...all].slice(0, 200); // prompt暴走防止で上限
      const user =
`SCENE: ${scene}
LEVEL: ${level}
N: ${perDay}
EXCLUDE: ${excludeList.join(" | ")}`;

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

      let j: { phrases?: Phrase[] } = {};
      try { j = JSON.parse(raw) as { phrases?: Phrase[] }; }
      catch {
        const m = raw.match(/\{[\s\S]*\}$/);
        if (m) j = JSON.parse(m[0]) as { phrases?: Phrase[] };
      }

      const list = (j.phrases ?? []).filter((p): p is Phrase => !!p?.en && !!p?.ja);

      // 最終の重複除去（保険）
      const unique: Phrase[] = [];
      for (const p of list) {
        const key = p.en.trim().toLowerCase();
        if (key && !all.has(key)) {
          all.add(key);
          unique.push({ en: p.en.trim(), ja: p.ja.trim() });
        }
      }

      // 数が足りない場合はそのまま返す（UI側で保険）
      outDays.push({
        phrases: unique.slice(0, perDay),
        scene,
        tips: [
          "短く・はっきり・笑顔で伝える",
          "言い換え1つ用意しておく",
          "相手の理解サイン（OK/Thanks）を待つ",
        ],
      });
    }

    const weekStartISO = new Date(new Date().toDateString()).toISOString();
    const plan: WeekPlan = {
      weekStartISO,
      genre,
      level,
      perDay,
      days: outDays,
    };

    return new Response(JSON.stringify(plan), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "server error";
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
