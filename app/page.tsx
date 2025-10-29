// app/page.tsx
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useToast } from "./components/Toast";
import SessionRunner, { type Demand } from "./components/SessionRunner";
import KpiPanel, { type KpiState } from "./components/KpiPanel";
import Celebration from "./components/Celebration";

type CEFR = "A1"|"A2"|"B1"|"B2"|"C1"|"C2";
type Genre = "restaurant" | "hotel" | "retail" | "guide";
type Phrase = { en: string; ja: string };
type DayPlan = { phrases: Phrase[]; scene: string; tips: string[] };
type WeekPlan = {
  weekStartISO: string; genre: Genre; level: CEFR; perDay: number; days: DayPlan[];
};

const toGenre = (ind: Demand["profile"]["industry"]): Genre =>
  ind === "food_service" ? "restaurant" :
  ind === "hotel" ? "hotel" :
  ind === "retail" ? "retail" : "guide";

export default function Page() {
  const { push } = useToast();

  /** ====== ユーザー選択 ====== */
  const [demand, setDemand] = useState<Demand>({
    profile: { ageRange: "30s", gender: "male", role: "staff", industry: "food_service", useCase: "inbound_service" },
    level: { selfReport: "自己申告", cefr: "A2", knownIssues: [] },
    constraints: { minutesPerDay: 20, deadlineWeeks: 8, scenes: [] },
    prefs: { lang: "ja", mode: "full_mix" },
  });

  const [started, setStarted] = useState(false);

  /** ====== KPI ====== */
  const [kpi, setKpi] = useState<KpiState>({ phrasesDone: 0, phrasesGoal: 10, roleplayCompleted: false, stepsDone: 0, stepsGoal: 3 });
  const sessionClear = kpi.phrasesDone >= kpi.phrasesGoal && kpi.roleplayCompleted && kpi.stepsDone >= kpi.stepsGoal;

  // セレブレーション
const [showCele, setShowCele] = useState(false);
// セレブ（達成時に出して 2 秒で閉じる：1本化）
useEffect(() => {
  if (!sessionClear) return;
  setShowCele(true);
  const t = setTimeout(() => setShowCele(false), 2000);
  return () => clearTimeout(t);
}, [sessionClear]);

  /** ====== Week Plan ====== */
  const [week, setWeek] = useState<WeekPlan | null>(null);
  const [dayIndex, setDayIndex] = useState<number>(0);

  const key = (w?: WeekPlan | null) => {
    const g = toGenre(demand.profile.industry);
    const lv = demand.level.cefr;
    const iso = w?.weekStartISO ?? "";
    return `ATOZ_WEEK_${g}_${lv}_${iso}`;
  };

  // 起動時に localStorage から週プランを復元（同じジャンル＆レベルで週内なら使う）
  useEffect(() => {
    const g = toGenre(demand.profile.industry);
    try {
      const raw = localStorage.getItem("ATOZ_WEEK_LAST");
      if (!raw) return;
      const parsed = JSON.parse(raw) as WeekPlan;
      if (parsed.genre !== g || parsed.level !== demand.level.cefr) return;
      // 今日が週内か判定
      const start = new Date(parsed.weekStartISO);
      const now = new Date();
      const diff = Math.floor((+new Date(now.toDateString()) - +new Date(start.toDateString())) / 86400000);
      if (diff >= 0 && diff < 7) {
        setWeek(parsed);
        setDayIndex(diff);
      }
    } catch { /* ignore */ }
  }, [demand.profile.industry, demand.level.cefr]);

  const generateWeek = async () => {
    try {
      const genre = toGenre(demand.profile.industry);
      const level = demand.level.cefr;
      const r = await fetch("/api/phrases/week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genre, level, perDay: 10, days: 7 }),
      });
      const ctype = r.headers.get("content-type") || "";
      if (!ctype.includes("application/json")) throw new Error(await r.text());
      const plan = (await r.json()) as WeekPlan;
      setWeek(plan);
      setDayIndex(0);
      localStorage.setItem("ATOZ_WEEK_LAST", JSON.stringify(plan));
      push({ kind: "success", title: "1週間プランを作成しました", message: "毎日10フレーズで進めましょう。" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "作成に失敗しました";
      push({ kind: "error", title: "週プラン生成エラー", message: msg });
    }
  };
// 106行目から追加
const weekUi = useMemo(() => {
  if (!week) return [];
  const start = new Date(week.weekStartISO);
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const doneKey = `atoz-week-done:${week.weekStartISO}`;
  const doneDates = new Set<string>(
    JSON.parse(localStorage.getItem(doneKey) ?? "[]")
  );

  return week.days.map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const label = `${d.getMonth() + 1}/${d.getDate()}(${"日月火水木金土"[d.getDay()]})`;
    const date = ymd(d);
    return { date, label, done: doneDates.has(date) };
  });
}, [week]);
  const todayPhrases: Phrase[] =
    week?.days?.[dayIndex]?.phrases?.slice(0, 10) ?? [];

  /** ====== セッション開始 ====== */
  const startSession = () => {
    setStarted(true);
    setShowCele(false);
    setKpi((k) => ({ ...k, stepsDone: 0, phrasesDone: 0, roleplayCompleted: false }));
    push({ kind: "success", title: "キックオフ成功！", message: "①フレーズ → ②ロールプレイ → ③復習 の順に進みましょう。" });
  };

  /** ====== コーチのひとこと ====== */
  const coachTips = useMemo(() => {
    const genreLabel: Record<Demand["profile"]["industry"], string> = {
      food_service: "レストラン", hotel: "ホテル", retail: "商店", transport: "移動・交通", other: "おもてなし",
    };
    const g = genreLabel[demand.profile.industry];
    const lv = demand.level.cefr;
    return [
      `今日は ${g} × ${lv} にフォーカス。短く・はっきり・笑顔で！`,
      "英語は“伝わったら勝ち”。完璧より回数。",
      "聞き返されたらチャンス。言い換え1つ用意。",
      "音読は “耳＞口＞目”。声に出す回数が命。",
      "返答＋ひとこと気遣いで好印象！",
    ];
  }, [demand.profile.industry, demand.level.cefr]);

  /** ====== 表示用 ====== */
  const genreText = useMemo(() => {
    switch (demand.profile.industry) {
      case "food_service": return "レストラン（飲食）";
      case "hotel": return "ホテル（旅行）";
      case "retail": return "商店（小売）";
      case "transport": return "移動・交通";
      default: return "おもてなし（観光ガイド）";
    }
  }, [demand.profile.industry]);

  return (
    <div className="min-h-screen bg-white relative overflow-x-clip">
      {/* 背景グラデ */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-fuchsia-300 via-pink-300 to-amber-200 blur-3xl opacity-40" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-sky-300 via-teal-200 to-lime-200 blur-3xl opacity-40" />

      {/* header */}
      <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/80 border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-black to-gray-600 text-white flex items-center justify-center font-bold shadow">A</div>
            <div className="font-semibold">AtoZ English</div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">PingPong Method</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
            <span className="px-2 py-0.5 rounded-full bg-gray-100">ジャンル: {genreText}</span>
            <span className="px-2 py-0.5 rounded-full bg-gray-100">CEFR: {demand.level.cefr}</span>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="max-w-6xl mx-auto px-4 pt-10 pb-6">
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
          最速で
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-600 via-pink-600 to-orange-500">
            “使えるおもてなし英語”
          </span>
          をトレーニング
        </h1>
        <p className="mt-4 text-gray-700 text-lg">①フレーズ → ②AIロールプレイ → ③復習。ジャンルとレベルに合わせて、毎回すぐ実戦投入。</p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button onClick={startSession} className="px-5 py-3 rounded-2xl text-white text-sm font-semibold shadow transition bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:opacity-90">
            {started ? "本日のセッションを再開" : "本日のセッションを開始"}
          </button>
          <button onClick={generateWeek} className="px-4 py-2 rounded-xl border text-sm hover:bg-gray-50">
            1週間プランを自動生成
          </button>
          <span className="text-xs text-gray-500">約 {demand.constraints.minutesPerDay} 分 / 日</span>
        </div>
      </section>

      {/* ニーズ入力 */}
      <section className="max-w-6xl mx-auto px-4 pb-6">
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">身につけたいおもてなし英語のジャンル</h2>

          <div className="mt-4">
            <label className="text-sm text-gray-600">ジャンル</label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={demand.profile.industry}
              onChange={(e) => setDemand((d) => ({ ...d, profile: { ...d.profile, industry: e.target.value as Demand["profile"]["industry"] } }))}
            >
              <option value="food_service">レストラン（飲食）</option>
              <option value="hotel">ホテル（旅行）</option>
              <option value="retail">商店（小売）</option>
              <option value="transport">移動・交通</option>
              <option value="other">おもてなし（観光ガイド）</option>
            </select>
          </div>

          <div className="mt-4">
            <label className="text-sm text-gray-600">自己申告レベル（CEFR）</label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={demand.level.cefr}
              onChange={(e) => setDemand((d) => ({ ...d, level: { ...d.level, cefr: e.target.value as Demand["level"]["cefr"] } }))}
            >
              {(["A1","A2","B1","B2","C1","C2"] as const).map((lv) => (<option key={lv} value={lv}>{lv}</option>))}
            </select>
          </div>

          <div className="mt-4">
            <label className="text-sm text-gray-600">1日の学習時間（分）</label>
            <input
              type="number" min={5} max={60} step={1} className="mt-1 w-full rounded-xl border px-3 py-2"
              value={demand.constraints.minutesPerDay}
              onChange={(e) => setDemand((d) => ({ ...d, constraints: { ...d.constraints, minutesPerDay: Math.max(5, Math.min(60, Number(e.target.value))) } }))}
            />
            <p className="mt-1 text-xs text-gray-500">5〜60分の範囲で指定できます。</p>
          </div>
        </div>
      </section>

      {/* 週ナビ（あれば） */}
      {(week?.days ?? []).length > 0 && (
  <section className="max-w-6xl mx-auto px-4 pb-2">
    <div className="flex flex-wrap gap-2">
      {(week?.days ?? []).map((_, i) => (
        <button
          key={i}
          onClick={() => { setDayIndex(i); setShowCele(false); setStarted(false); }}
          className={`px-3 py-1 rounded-full text-xs border ${i === dayIndex ? "bg-black text-white border-black" : "hover:bg-gray-50"}`}
        >
          Day {i + 1}
        </button>
      ))}
    </div>
  </section>
)}

      {/* 本日のセッション */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* 左：メイン */}
          <div className="lg:col-span-2 rounded-3xl border bg-white p-6 shadow-lg ring-1 ring-black/5">
            <div className="text-sm text-gray-500">本日のセッション</div>
            {started ? (
              <div className="mt-2">
                <SessionRunner
                  demand={demand}
                  phrasesOverride={todayPhrases}   // ← 今日の10フレーズを注入
                  onStepDone={() => setKpi((k) => ({ ...k, stepsDone: Math.min(k.stepsGoal, k.stepsDone + 1) }))}
                  onPhrasePlayed={() => setKpi((k) => ({ ...k, phrasesDone: Math.min(k.phrasesGoal, k.phrasesDone + 1) }))}
                  onRoleplayCompleted={() => setKpi((k) => ({ ...k, roleplayCompleted: true }))}
                  onStart={() => setKpi((k) => ({ ...k, stepsDone: 0, phrasesDone: 0, roleplayCompleted: false }))}
                />
              </div>
            ) : (
              <div className="mt-3 text-sm text-gray-600">「本日のセッションを開始」を押すと、①フレーズ → ②ロールプレイ → ③復習 を表示します。</div>
            )}
          </div>

          {/* 右：進捗・目標・ひとこと */}
          <div className="space-y-6">
            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <KpiPanel kpi={kpi} />
            </div>
  {weekUi.length > 0 && (
  <div className="rounded-3xl border bg-white p-6 shadow-sm">
    <div className="text-sm text-gray-500">今週のプラン</div>
    <div className="mt-2 grid grid-cols-2 gap-2">
      {weekUi.map((d, i) => (
        <div
          key={d.date}
          className={`rounded-xl border p-2 text-xs ${
            d.done ? "bg-emerald-50 border-emerald-300" : "bg-white"
          }`}
        >
          <div className="font-medium">Day {i + 1}</div>
          <div className="text-gray-600">{d.label}</div>
        </div>
      ))}
    </div>
  </div>
)}

            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <div className="text-sm text-gray-500">今日の目標</div>
              <ul className="mt-2 text-sm text-gray-800 space-y-2">
                <li className="rounded-xl border p-3">フレーズ 10本を音読（各 3 回）</li>
                <li className="rounded-xl border p-3">ロールプレイで 1 往復 × 3 セット</li>
                <li className="rounded-xl border p-3">重要表現の復習で言い換え 2 パターン</li>
              </ul>
            </div>

            <div className="rounded-3xl border bg-gradient-to-r from-emerald-50 to-teal-50 p-6 shadow-sm">
              <div className="text-sm text-emerald-700 font-semibold">コーチのひとこと</div>
              <p className="mt-2 text-sm text-emerald-900">{coachTips[0]}</p>
              <p className="mt-1 text-xs text-emerald-700">小さな成功体験を3つ積めたら今日は合格！💮</p>
            </div>
          </div>
        </div>
      </section>

      {/* お祝い */}
      <Celebration show={showCele} onClose={() => setShowCele(false)} />

      <footer className="sr-only">build: {process.env.NEXT_PUBLIC_BUILD_TAG}</footer>
    </div>
  );
}
