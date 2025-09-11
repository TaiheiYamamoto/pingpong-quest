"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useToast } from "./components/Toast";
import SessionRunner from "./components/SessionRunner";
import Motivation, { type MotivateKind } from "./components/Motivation";

/** ---------- types ---------- */
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

type WeekItem = { week: number; goal: string; microLessons: MicroLesson[] };

type Plan = {
  track: string;
  weekly: WeekItem[];
  todaySession: { durationMin: number; flow: Step[] };
  kpis: string[];
};

/** ---------- helpers ---------- */
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

// 安全に unknown を読むためのユーティリティ
type UnknownRecord = Record<string, unknown>;
const isObject = (v: unknown): v is UnknownRecord => typeof v === "object" && v !== null;
const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
const arr = <T = unknown>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

// Step に正規化
type RawStep = string | UnknownRecord;
const getScene = (v: unknown): string | undefined => {
  if (!isObject(v)) return undefined;
  const sc = (v as { scene?: unknown }).scene;
  return typeof sc === "string" ? sc : undefined;
};
function toStep(x: RawStep, defaultScene: string): Step | null {
  const text =
    typeof x === "string"
      ? x
      : str((x as UnknownRecord).step) ||
        str((x as UnknownRecord).type) ||
        str((x as UnknownRecord).label);

  if (/diagnostic|診断/i.test(text)) return { step: "diagnostic_mini_test" };
  if (/listen|repeat|音読|リピート/i.test(text)) return { step: "listen_and_repeat" };
  if (/roleplay|ロールプレイ/i.test(text))
    return { step: "roleplay_ai", scene: getScene(x) ?? defaultScene };
  if (/feedback|フィードバック|振り返り/i.test(text)) return { step: "feedback" };
  return null;
}

// MicroLesson に正規化
type RawLesson = string | UnknownRecord;
function toLesson(m: RawLesson): MicroLesson | null {
  if (typeof m === "string") {
    const s = m.trim();
    if (!s) return null;
    if (/roleplay|ロールプレイ/i.test(s)) return { type: "roleplay", scene: "menu" };
    if (/listen|リスニング/i.test(s)) return { type: "listening", focus: s };
    return { type: "phrasepack", title: s };
  }
  if (!isObject(m)) return null;
  const t = str(m.type);
  if (t === "roleplay") return { type: "roleplay", scene: str((m as { scene?: unknown }).scene, "menu") };
  if (t === "listening") return { type: "listening", focus: str((m as { focus?: unknown }).focus, "") };
  if (t === "phrasepack") return { type: "phrasepack", title: str((m as { title?: unknown }).title, "") };
  // fallback: 文字列化してフレーズ扱い
  const asText =
    str((m as { title?: unknown }).title) ||
    str((m as { label?: unknown }).label) ||
    str((m as { name?: unknown }).name);
  if (asText) return { type: "phrasepack", title: asText };
  return null;
}

/** unknown な API 返却を Plan に正規化 */
function normalizePlan(raw: unknown, demand: Demand): Plan {
  const scene0 = demand.constraints.scenes?.[0] ?? "menu";

  const r = isObject(raw) ? raw : ({} as UnknownRecord);

  // todaySession
  const todayObj = isObject(r.todaySession) ? (r.todaySession as UnknownRecord) : ({} as UnknownRecord);
  const rawFlow = arr<unknown>(todayObj.flow) as RawStep[];
  const flow = rawFlow.map((x) => toStep(x, scene0)).filter(Boolean) as Step[];
  const DEFAULT_FLOW: Step[] = [
    { step: "diagnostic_mini_test" },
    { step: "listen_and_repeat" },
    { step: "roleplay_ai", scene: scene0 },
    { step: "feedback" },
  ];

  // weekly
  const weeklySrc = arr<unknown>(r.weekly);
  const weekly: WeekItem[] = weeklySrc.slice(0, 8).map((w, i) => {
    const rec = isObject(w) ? (w as UnknownRecord) : ({} as UnknownRecord);
    const microRaw = arr<unknown>(rec.microLessons) as RawLesson[];
    const lessons = microRaw.map(toLesson).filter(Boolean) as MicroLesson[];
    return {
      week: num(rec.week, i + 1),
      goal: str(rec.goal, `Week ${i + 1}`) || `Week ${i + 1}`,
      microLessons: lessons,
    };
    });

  const kpis = arr<unknown>(r.kpis).map((x) => String(x)).filter(Boolean);

  return {
    track: str(r.track, "飲食業向け英会話"),
    weekly,
    todaySession: {
      durationMin: num(todayObj.durationMin, 20),
      flow: flow.length ? flow : DEFAULT_FLOW,
    },
    kpis: kpis.length
      ? kpis
      : ["weekly_completion_rate", "WPM", "mispronunciation_rate", "dialog_success_rate"],
  };
}

/** ---------- 簡易ニーズフォーム ---------- */
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

/** ---------- ページ ---------- */
export default function Page() {
  const [demand, setDemand] = useState<Demand>({
    profile: { ageRange: "30s", gender: "male", role: "restaurant_staff", industry: "food_service", useCase: "inbound_service" },
    level: { selfReport: "英検3級 / 中学英語程度", cefr: "A2", knownIssues: ["listening", "speaking_fluency"] },
    constraints: { minutesPerDay: 20, deadlineWeeks: 8, scenes: ["menu", "allergy", "payment", "directions"] },
    prefs: { lang: "ja", mode: "full_mix" },
  });

  const [preview, setPreview] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [motivate, setMotivate] = useState<MotivateKind>("idle");
  const { push } = useToast();

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-50 via-white to-white">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/pingpong.svg" alt="PingPong" width={32} height={32} priority />
            <div className="font-semibold">AtoZ English</div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-white">
              PingPong Method
            </span>
          </div>
          <div className="hidden sm:block w-[360px]">
            <Motivation variant={motivate} />
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 pt-10 pb-6">
        <h1 className="text-3xl font-extrabold leading-tight bg-gradient-to-r from-fuchsia-600 to-sky-600 bg-clip-text text-transparent">
          最速で“使える英語”を。
        </h1>
        <p className="mt-3 text-gray-700">
          ベストセラー著者デイビッド・セイン率いる AtoZ English。日本語堪能な英語ネイティブ、翻訳・教育のスペシャリストが +α のサポート。
        </p>

        <button
          onClick={async () => {
            try {
              setMotivate("start");
              push({ kind: "info", title: "生成を開始しました", message: "少しお待ちください…" });
              setLoading(true);
              const raw = await fetchCurriculum(demand);
              const plan = normalizePlan(raw, demand);
              setPreview(plan);
              push({ kind: "success", title: "プランを生成しました", message: "本日のセッションから始めましょう！" });
              setMotivate("good");
            } catch (e) {
              console.error(e);
              push({ kind: "error", title: "生成に失敗しました", message: "APIキーやネットワークをご確認ください。" });
              setMotivate("oops");
            } finally {
              setLoading(false);
            }
          }}
          className="mt-6 px-5 py-2 rounded-xl text-sm text-white bg-gradient-to-r from-indigo-600 to-sky-600 shadow hover:opacity-90"
        >
          {loading ? "生成中..." : "プランを自動生成（プレビュー）"}
        </button>
      </section>

      <DemandForm demand={demand} setDemand={setDemand} />

      <section id="preview" className="max-w-6xl mx-auto px-4 pb-16">
        {preview ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 右：本日のセッション（主役） */}
            <div className="order-1 lg:order-2 lg:col-span-2 rounded-2xl border bg-white p-6">
              <div className="text-xl font-semibold">本日のセッション</div>
              <p className="text-sm text-gray-500 mt-1">
                合計 {preview.todaySession.durationMin} 分想定。クリックでステップを切り替えられます。
              </p>
              <div className="mt-4">
                <SessionRunner
                  plan={preview}
                  demand={demand}
                  setDemand={setDemand}
                  onEncourage={(k) => setMotivate(k)}
                />
              </div>
              <div className="mt-6 text-xs text-gray-500">KPI: {preview.kpis.join(", ")}</div>
            </div>

            {/* 左：8週間プレビュー（サブ） */}
            <div className="order-2 lg:order-1 lg:col-span-1 rounded-2xl border bg-white p-6">
              <div className="text-sm text-gray-500">カリキュラムプレビュー</div>
              <h3 className="text-lg font-semibold mt-1">{preview.track}</h3>
              <ul className="mt-2 text-sm text-gray-700 list-disc list-inside space-y-4">
                {preview.weekly.map((w: WeekItem) => (
                  <li key={w.week}>
                    <div className="font-medium">
                      Week {w.week}: {w.goal}
                    </div>
                    {w.microLessons.length > 0 ? (
                      <ul className="ml-5 list-disc">
                        {w.microLessons.map((m: MicroLesson, i: number) => (
                          <li key={`${w.week}-${i}`}>
                            {m.type === "roleplay"
                              ? `ロールプレイ：${m.scene}`
                              : m.type === "phrasepack"
                              ? `フレーズ：${m.title}`
                              : `リスニング：${m.focus}`}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="ml-5 text-gray-400 text-xs">（今週の詳細は自動生成中）</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border bg-white p-6 text-sm text-gray-600">
            まだプランは未生成です。「プランを自動生成」を押すとプレビューが表示されます。
          </div>
        )}
      </section>

      <footer className="sr-only">build: {process.env.NEXT_PUBLIC_BUILD_TAG}</footer>
    </div>
  );
}
