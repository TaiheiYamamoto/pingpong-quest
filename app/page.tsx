// app/page.tsx
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useToast } from "./components/Toast";
import SessionRunner, { type Demand } from "./components/SessionRunner";
import KpiPanel, { type KpiState } from "./components/KpiPanel";
import Celebration from "./components/Celebration";

export default function Page() {
  const { push } = useToast();

  /** ====== ユーザーの選択（ニーズ入力） ====== */
  const [demand, setDemand] = useState<Demand>({
    profile: {
      ageRange: "30s",
      gender: "male",
      role: "staff",
      industry: "food_service",
      useCase: "inbound_service",
    },
    level: {
      selfReport: "自己申告",
      cefr: "A2",
      knownIssues: [],
    },
    constraints: { minutesPerDay: 20, deadlineWeeks: 8, scenes: [] },
    prefs: { lang: "ja", mode: "full_mix" },
  });

  const [started, setStarted] = useState(false);

  /** ====== KPI ====== */
  const [kpi, setKpi] = useState<KpiState>({
    phrasesDone: 0,
    phrasesGoal: 10,
    roleplayCompleted: false,
    stepsDone: 0,
    stepsGoal: 3,
  });

  const sessionClear =
    kpi.phrasesDone >= kpi.phrasesGoal &&
    kpi.roleplayCompleted &&
    kpi.stepsDone >= kpi.stepsGoal;

  // セレブレーション表示
  const [showCele, setShowCele] = useState(false);
  useEffect(() => {
    if (sessionClear) setShowCele(true);
  }, [sessionClear]);

  /** ====== 生成（セッション開始） ====== */
  const startSession = () => {
    setStarted(true);
    push({
      kind: "success",
      title: "キックオフ成功！",
      message: "①フレーズ → ②ロールプレイ → ③復習 の順に進みましょう。",
    });
  };

  /** ====== コーチのひとこと ====== */
  const coachTips = useMemo(() => {
    const genreLabel: Record<Demand["profile"]["industry"], string> = {
      food_service: "レストラン",
      hotel: "ホテル",
      retail: "商店",
      transport: "交通",
      other: "おもてなし",
    };
    const g = genreLabel[demand.profile.industry];
    const lv = demand.level.cefr;
    return [
      `今日は ${g} × ${lv} にフォーカス。短く・はっきり・笑顔で！`,
      "英語は“伝わったら勝ち”。完璧を目指すより回数をこなそう。",
      "聞き返されたらチャンス！言い換え1パターンを用意しておくと安心。",
      "音読は“耳＞口＞目”。声に出す回数で定着します。",
      "ロールプレイは、返答＋ひとこと気遣いが好印象！",
    ];
  }, [demand.profile.industry, demand.level.cefr]);

  /** ====== ヘッダーバッジ用のジャンル表示 ====== */
  const genreText = useMemo(() => {
    switch (demand.profile.industry) {
      case "food_service":
        return "レストラン（飲食）";
      case "hotel":
        return "ホテル（旅行）";
      case "retail":
        return "商店（小売）";
      case "transport":
        return "移動・交通";
      default:
        return "おもてなし（観光ガイド）";
    }
  }, [demand.profile.industry]);

  return (
    <div className="min-h-screen bg-white relative overflow-x-clip">
      {/* 背景の大胆グラデーション */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-fuchsia-300 via-pink-300 to-amber-200 blur-3xl opacity-40" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-sky-300 via-teal-200 to-lime-200 blur-3xl opacity-40" />

      {/* header */}
      <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/80 border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-black to-gray-600 text-white flex items-center justify-center font-bold shadow">
              A
            </div>
            <div className="font-semibold">AtoZ English</div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              PingPong Method
            </span>
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
        <p className="mt-4 text-gray-700 text-lg">
          ①フレーズ → ②AIロールプレイ → ③復習。ジャンルとレベルに合わせて、毎回すぐ実戦投入できる形で身につきます。
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={startSession}
            className="px-5 py-3 rounded-2xl text-white text-sm font-semibold shadow transition
                       bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:opacity-90"
          >
            {started ? "本日のセッションを再開" : "本日のセッションを開始"}
          </button>
          <span className="text-xs text-gray-500">約 {demand.constraints.minutesPerDay} 分 / 日</span>
        </div>
      </section>

      {/* ニーズ入力 */}
      <section className="max-w-6xl mx-auto px-4 pb-6">
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">身につけたいおもてなし英語のジャンル</h2>

          {/* ジャンル */}
          <div className="mt-4">
            <label className="text-sm text-gray-600">ジャンル</label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={demand.profile.industry}
              onChange={(e) =>
                setDemand((d) => ({
                  ...d,
                  profile: { ...d.profile, industry: e.target.value as Demand["profile"]["industry"] },
                }))
              }
            >
              <option value="food_service">レストラン（飲食）</option>
              <option value="hotel">ホテル（旅行）</option>
              <option value="retail">商店（小売）</option>
              <option value="transport">移動・交通</option>
              <option value="other">おもてなし（観光ガイド）</option>
            </select>
          </div>

          {/* レベル */}
          <div className="mt-4">
            <label className="text-sm text-gray-600">自己申告レベル（CEFR）</label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={demand.level.cefr}
              onChange={(e) =>
                setDemand((d) => ({ ...d, level: { ...d.level, cefr: e.target.value as Demand["level"]["cefr"] } }))
              }
            >
              {(["A1", "A2", "B1", "B2", "C1", "C2"] as const).map((lv) => (
                <option key={lv} value={lv}>
                  {lv}
                </option>
              ))}
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
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={demand.constraints.minutesPerDay}
              onChange={(e) =>
                setDemand((d) => ({
                  ...d,
                  constraints: {
                    ...d.constraints,
                    minutesPerDay: Math.max(5, Math.min(60, Number(e.target.value))),
                  },
                }))
              }
            />
            <p className="mt-1 text-xs text-gray-500">5〜60分の範囲で指定できます。</p>
          </div>
        </div>
      </section>

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
                  onStepDone={() =>
                    setKpi((k) => ({ ...k, stepsDone: Math.min(k.stepsGoal, k.stepsDone + 1) }))
                  }
                  onPhrasePlayed={() =>
                    setKpi((k) => ({ ...k, phrasesDone: Math.min(k.phrasesGoal, k.phrasesDone + 1) }))
                  }
                  onRoleplayCompleted={() => setKpi((k) => ({ ...k, roleplayCompleted: true }))}
                  onStart={() => setKpi((k) => ({ ...k, stepsDone: 0, phrasesDone: 0, roleplayCompleted: false }))}
                />
              </div>
            ) : (
              <div className="mt-3 text-sm text-gray-600">
                「本日のセッションを開始」を押すと、ジャンル/レベルに合わせて ①フレーズ → ②ロールプレイ →
                ③復習 を表示します。
              </div>
            )}
          </div>

          {/* 右：進捗・目標・ひとこと */}
          <div className="space-y-6">
            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <KpiPanel kpi={kpi} />
            </div>

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
      <Celebration show={showCele} />

      <footer className="sr-only">build: {process.env.NEXT_PUBLIC_BUILD_TAG}</footer>
    </div>
  );
}
