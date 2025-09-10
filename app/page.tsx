"use client";

import React, { useState } from "react";

/** ---------- domain types ---------- */
type CEFR = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

type Demand = {
  profile: {
    ageRange: "10s" | "20s" | "30s" | "40s" | "50s+";
    gender: "male" | "female" | "other" | "prefer_not_to_say";
    role: string;
    industry: "food_service" | "hotel" | "retail" | "transport" | "other";
    useCase: "inbound_service" | "business" | "study_abroad" | "daily_life";
  };
  level: { selfReport: string; cefr: CEFR; knownIssues: string[] };
  constraints: { minutesPerDay: number; deadlineWeeks: number; scenes: string[] };
  prefs: { lang: "ja" | "en"; mode: "ai_only" | "ai_plus_coach" | "ai_plus_books" | "full_mix" };
};

type Step =
  | { step: "diagnostic_mini_test" }
  | { step: "listen_and_repeat" }
  | { step: "roleplay_ai"; scene: string }
  | { step: "feedback" };

type MicroLesson =
  | { type: "phrasepack"; title: string }
  | { type: "roleplay"; scene: string }
  | { type: "listening"; focus: string };

type WeekItem = {
  week: number;
  goal: string;
  microLessons: MicroLesson[];
};

type Plan = {
  track: string;
  weekly: WeekItem[];
  todaySession: { durationMin: number; flow: Step[] };
  kpis: string[];
};

/** ---------- helpers ---------- */
function labelStep(step: Step["step"]) {
  switch (step) {
    case "diagnostic_mini_test":
      return "診断ミニテスト";
    case "listen_and_repeat":
      return "音読＆リピート";
    case "roleplay_ai":
      return "AIロールプレイ";
    case "feedback":
      return "フィードバック";
    default:
      return step;
  }
}

async function fetchCurriculum(demand: Demand): Promise<Plan> {
  const res = await fetch("/api/curriculum", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(demand),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || "API error");
  return JSON.parse(text) as Plan;
}

/** ---------- page ---------- */
export default function Page() {
  const [demand] = useState<Demand>({
    profile: {
      ageRange: "30s",
      gender: "male",
      role: "restaurant_staff",
      industry: "food_service",
      useCase: "inbound_service",
    },
    level: {
      selfReport: "英検3級 / 中学英語程度",
      cefr: "A2",
      knownIssues: ["listening", "speaking_fluency"],
    },
    constraints: { minutesPerDay: 20, deadlineWeeks: 8, scenes: ["menu", "allergy", "payment", "directions"] },
    prefs: { lang: "ja", mode: "full_mix" },
  });

  const [preview, setPreview] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* header */}
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-black text-white flex items-center justify-center font-bold">A</div>
            <div className="font-semibold">AtoZ English</div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">PingPong Method</span>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="max-w-6xl mx-auto px-4 pt-10 pb-6">
        <h1 className="text-3xl font-bold leading-tight">最速で“使える英語”を。</h1>
        <p className="mt-4 text-gray-700">
          ベストセラー著者デイビッド・セイン率いるAtoZ English。日本語堪能な英語ネイティブ、翻訳・教育のスペシャリストが+αのサポート。
        </p>
        <button
          onClick={async () => {
            try {
              setLoading(true);
              const plan = await fetchCurriculum(demand);
              setPreview(plan);
            } catch (e) {
              console.error(e);
              alert("生成に失敗しました。APIキーやネットワークをご確認ください。");
            } finally {
              setLoading(false);
            }
          }}
          className="mt-6 px-4 py-2 rounded-xl bg-black text-white text-sm"
        >
          {loading ? "生成中..." : "プランを自動生成（プレビュー）"}
        </button>
      </section>

      {/* preview */}
      <section id="preview" className="max-w-6xl mx-auto px-4 pb-16">
        {preview ? (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border bg-white p-6">
              <div className="text-sm text-gray-500">カリキュラムプレビュー</div>
              <h3 className="text-lg font-semibold mt-1">{preview.track}</h3>

              <ul className="mt-2 text-sm text-gray-700 list-disc list-inside">
                {preview.weekly.map((w: WeekItem) => (
                  <li key={w.week}>
                    Week {w.week}: {w.goal}
                    {w.microLessons?.length > 0 && (
                      <ul className="ml-5 list-disc">
                        {w.microLessons.map((m: MicroLesson, i: number) => (
                          <li key={`${w.week}-${i}`}>
                            {m.type === "roleplay"
                              ? `ロールプレイ：${m.scene}`
                              : m.type === "phrasepack"
                              ? `フレーズ：${m.title}`
                              : m.type === "listening"
                              ? `リスニング：${m.focus}`
                              : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border bg-white p-6">
              <div className="text-sm text-gray-500">本日のセッション</div>
              <ul className="mt-2 text-sm text-gray-700 space-y-2">
                {preview.todaySession.flow.map((s: Step, i: number) => (
                  <li key={i} className="rounded-lg border p-3">
                    {i + 1}. {labelStep(s.step)}
                  </li>
                ))}
              </ul>
              <div className="mt-4 text-xs text-gray-500">KPI: {preview.kpis.join(", ")}</div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border bg-white p-6 text-sm text-gray-600">
            まだプランは未生成です。「プランを自動生成」を押すとプレビューが表示されます。
          </div>
        )}
      </section>
    </div>
  );
}
