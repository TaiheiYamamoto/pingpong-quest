"use client";

import React, { useState } from "react";
import { useToast } from "./components/Toast";
import RoleplayWidget from "./components/RoleplayWidget";

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

/** ---------- loading skeleton ---------- */
function PreviewSkeleton() {
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 rounded-2xl border bg-white p-6 animate-pulse">
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="mt-3 h-6 w-64 bg-gray-200 rounded" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-3 bg-gray-200 rounded w-full" />
          ))}
        </div>
      </div>
      <div className="rounded-2xl border bg-white p-6 animate-pulse">
        <div className="h-4 w-28 bg-gray-200 rounded" />
        <div className="mt-3 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** ---------- form component ---------- */
function DemandForm({
  demand,
  setDemand,
}: {
  demand: Demand;
  setDemand: React.Dispatch<React.SetStateAction<Demand>>;
}) {
  const sceneOptions = ["menu", "allergy", "payment", "directions"] as const;
  type Scene = (typeof sceneOptions)[number];

  const onIndustryChange = (value: Demand["profile"]["industry"]) => {
    setDemand((d) => ({ ...d, profile: { ...d.profile, industry: value } }));
  };

  const onMinutesChange = (value: number) => {
    const minutes = Number.isFinite(value) ? Math.max(5, Math.min(60, Math.round(value))) : 20;
    setDemand((d) => ({ ...d, constraints: { ...d.constraints, minutesPerDay: minutes } }));
  };

  const toggleScene = (s: Scene) => {
    setDemand((d) => {
      const has = d.constraints.scenes.includes(s);
      return {
        ...d,
        constraints: {
          ...d.constraints,
          scenes: has ? d.constraints.scenes.filter((x) => x !== s) : [...d.constraints.scenes, s],
        },
      };
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pb-6">
      <div className="rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-semibold">ニーズ入力（簡易）</h2>

        {/* 業種 */}
        <div className="mt-4">
          <label className="text-sm text-gray-600">業種</label>
          <select
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={demand.profile.industry}
            onChange={(e) => onIndustryChange(e.target.value as Demand["profile"]["industry"])}
          >
            <option value="food_service">飲食</option>
            <option value="hotel">ホテル</option>
            <option value="retail">小売</option>
            <option value="transport">交通</option>
            <option value="other">その他</option>
          </select>
        </div>

        {/* 1日学習時間 */}
        <div className="mt-4">
          <label className="text-sm text-gray-600">1日の学習時間（分）</label>
          <input
            type="number"
            min={5}
            max={60}
            step={1}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={demand.constraints.minutesPerDay}
            onChange={(e) => onMinutesChange(Number(e.target.value))}
          />
          <p className="mt-1 text-xs text-gray-500">5〜60分の範囲で指定できます。</p>
        </div>

        {/* 重点シーン */}
        <div className="mt-4">
          <div className="text-sm text-gray-600">重点シーン（複数選択可）</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {sceneOptions.map((s) => {
              const selected = demand.constraints.scenes.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleScene(s)}
                  className={`px-3 py-1 rounded-full text-sm border transition ${
                    selected
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-700 border-gray-300 hover:border-black"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/** ---------- page ---------- */
export default function Page() {
  const [demand, setDemand] = useState<Demand>({
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
  const { push } = useToast();

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

        {/* 生成ボタン（トースト付き） */}
        <button
          onClick={async () => {
            try {
              push({ kind: "info", title: "生成を開始しました", message: "少しお待ちください…" });
              setLoading(true);
              const plan = await fetchCurriculum(demand);
              setPreview(plan);
              push({ kind: "success", title: "プランを生成しました", message: "プレビュー欄をご確認ください。" });
            } catch (e) {
              console.error(e);
              push({
                kind: "error",
                title: "生成に失敗しました",
                message: "APIキーやネットワークをご確認ください。",
              });
            } finally {
              setLoading(false);
            }
          }}
          className="mt-6 px-4 py-2 rounded-xl bg-black text-white text-sm"
        >
          {loading ? "生成中..." : "プランを自動生成（プレビュー）"}
        </button>
      </section>

      {/* AtoZ差別化ブロック */}
      <section className="max-w-6xl mx-auto px-4 pb-8">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl border bg-white p-5">
            <h3 className="font-semibold">PingPongメソッド</h3>
            <p className="mt-2 text-sm text-gray-600">
              デイビッド・セイン監修。短い往復（Ping→Pong）で即応力を鍛える実践設計。
            </p>
          </div>
          <div className="rounded-2xl border bg-white p-5">
            <h3 className="font-semibold">AI + コーチの併走</h3>
            <p className="mt-2 text-sm text-gray-600">日本語OKの英語ネイティブが要点を補強。弱点にピンポイント介入。</p>
          </div>
          <div className="rounded-2xl border bg-white p-5">
            <h3 className="font-semibold">書籍コンテンツ連携</h3>
            <p className="mt-2 text-sm text-gray-600">ベストセラー教材と接続。AIだけでは届かない＋αの学習体験。</p>
          </div>
        </div>
      </section>

      {/* demand form */}
      <DemandForm demand={demand} setDemand={setDemand} />

      {/* preview */}
      <section id="preview" className="max-w-6xl mx-auto px-4 pb-10">
        {loading ? (
          <PreviewSkeleton />
        ) : preview ? (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border bg-white p-6">
              <div className="text-sm text-gray-500">カリキュラムプレビュー</div>
              <h3 className="text-lg font-semibold mt-1">{preview.track}</h3>

              <ul className="mt-2 text-sm text-gray-700 list-disc list-inside">
                {preview.weekly.map((w: WeekItem) => (
                  <li key={w.week}>
                    Week {w.week}: {w.goal}
                    {w.microLessons.length > 0 && (
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

      {/* ▼▼ 音声ロールプレイ：プレビューの下 ▼▼ */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="text-lg font-semibold mb-3">音声ロールプレイ（最小実装）</h2>
        <RoleplayWidget
          scene={demand.constraints.scenes[0] ?? "menu"}
          level={demand.level.cefr}
        />
      </section>

      {/* 任意：ビルドタグ（ENVでキャッシュ更新する運用用。表示は隠します） */}
      <footer className="sr-only">build: {process.env.NEXT_PUBLIC_BUILD_TAG}</footer>
    </div>
  );
}
