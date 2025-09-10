// app/api/curriculum/route.ts
export const runtime = "edge";

const SYSTEM = `
You are a curriculum designer for workplace English (CEFR A2→B1).
Return ONLY JSON (no code fences, no explanations).
Schema:
{
  "track": string,
  "weekly": [{"week": number, "goal": string, "microLessons": any[]}],  // length 8
  "todaySession": {"durationMin": number, "flow": any[]},
  "kpis": string[]
}
All text in Japanese. If uncertain, fill with reasonable defaults.
`;

type Demand = {
  profile?: { industry?: string };
  constraints?: { minutesPerDay?: number; scenes?: string[]; deadlineWeeks?: number };
  level?: { cefr?: string };
};

// --- ① 最終保険：安全なデフォルトJSONを生成 ---
function defaultPlan(demand: Demand = {}) {
  const scenes = demand?.constraints?.scenes?.length ? demand.constraints!.scenes! : ["menu","allergy","payment","directions"];
  const minutes = demand?.constraints?.minutesPerDay ?? 20;
  const industry = demand?.profile?.industry ?? "food_service";
  const label = industry === "hotel" ? "ホテル" : industry === "retail" ? "小売" : industry === "transport" ? "交通" : "飲食";

  const weekly = Array.from({ length: 8 }).map((_, i) => ({
    week: i + 1,
    goal: i === 0 ? "基礎フレーズと丁寧表現を定着" : `現場ロールプレイ強化（${scenes[i % scenes.length]}）`,
    microLessons: [
      { type: "phrasepack", title: "定型フレーズ10" },
      { type: "roleplay", scene: scenes[i % scenes.length] },
      { type: "listening", focus: "numbers & prices" },
    ],
  }));

  return {
    track: `${label} | A2→B1 Fast-Track (8 weeks)`,
    weekly,
    todaySession: {
      durationMin: minutes,
      flow: [
        { step: "diagnostic_mini_test" },
        { step: "listen_and_repeat" },
        { step: "roleplay_ai", scene: scenes[0] },
        { step: "feedback" },
      ],
    },
    kpis: ["weekly_completion_rate","WPM","mispronunciation_rate","dialog_success_rate"],
  };
}

// --- ② 文字列クレンジング（壊れJSON対策） ---
function sanitizeToJson(text: string) {
  let s = String(text);
  // コードフェンス除去
  s = s.replace(/^```(json)?/i, "").replace(/```$/, "");
  // スマートクォートを通常の二重引用符へ
  s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  // 制御文字の除去
  s = s.replace(/[\u0000-\u001F\u007F]/g, " ");
  // 先頭の最初の { から末尾の最後の } を抽出
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first >= 0 && last > first) s = s.slice(first, last + 1);
  // 末尾の余計なカンマを削る
  s = s.replace(/,\s*([}\]])/g, "$1");
  return s;
}

export async function POST(request: Request) {
  const demand: Demand = await request.json().catch(() => ({}));

  // ③ OpenAI呼び出し
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 700,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `ユーザー条件: ${JSON.stringify(demand)}\n8週間ぶん必ず作成。` },
      ],
    }),
  });

  // ④ API自体が失敗ならデフォルト返す
  if (!r.ok) {
    return new Response(JSON.stringify(defaultPlan(demand)), { headers: { "Content-Type": "application/json" } });
  }

  // ⑤ JSON保証：壊れていたら修復→失敗ならデフォルト
  try {
    const data = await r.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    try {
      // まずは素直にパース
      return new Response(JSON.stringify(JSON.parse(raw)), { headers: { "Content-Type": "application/json" } });
    } catch {
      // 修復して再パース
      const cleaned = sanitizeToJson(raw);
      const parsed = JSON.parse(cleaned);
      return new Response(JSON.stringify(parsed), { headers: { "Content-Type": "application/json" } });
    }
  } catch {
    // 返りが期待どおりでない時も保険
    return new Response(JSON.stringify(defaultPlan(demand)), { headers: { "Content-Type": "application/json" } });
  }
}
