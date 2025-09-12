// app/page.tsx
"use client";

import React, { useState } from "react";
import { useToast } from "./components/Toast";
import SessionRunner, { type Demand } from "./components/SessionRunner";

export default function Page() {
  const { push } = useToast();

  /** ====== ユーザーの選択（ニーズ入力） ====== */
  const [demand, setDemand] = useState<Demand>({
    profile: {
      ageRange: "30s",
      gender: "male",
      role: "staff",
      /** ← ジャンル（ドロップダウンで変更） */
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

  /** ====== 生成（セッション開始） ====== */
  const startSession = () => {
    setStarted(true);
    push({
      kind: "success",
      title: "キックオフ成功！",
      message: "この勢いで ①フレーズ→②ロールプレイ→③復習 の順に進みましょう。",
    });
  };

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
          ①フレーズ → ②AIロールプレイ → ③復習。ジャンルとレベルに合わせて毎回すぐ実践できます。
        </p>

        <button
          onClick={startSession}
          className="mt-6 px-4 py-2 rounded-xl bg-black text-white text-sm"
        >
          {started ? "本日のセッションを再開" : "本日のセッションを開始"}
        </button>
      </section>

      {/* ニーズ入力 */}
      <section className="max-w-6xl mx-auto px-4 pb-6">
        <div className="rounded-2xl border bg-white p-6">
          <h2 className="text-lg font-semibold">身につけたい英語のジャンル</h2>

          {/* ジャンル */}
          <div className="mt-4">
            <label className="text-sm text-gray-600">ジャンル</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={demand.profile.industry}
              onChange={(e) =>
                setDemand((d) => ({
                  ...d,
                  profile: {
                    ...d.profile,
                    industry: e.target.value as Demand["profile"]["industry"],
                  },
                }))
              }
            >
              <option value="food_service">レストラン（飲食）</option>
              <option value="hotel">ホテル（旅行・交通）</option>
              <option value="retail">商店（小売）</option>
              <option value="transport">交通</option>
              <option value="other">おもてなし（観光ガイド）</option>
            </select>
          </div>

          {/* レベル（自己申告） */}
          <div className="mt-4">
            <label className="text-sm text-gray-600">自己申告レベル（CEFR）</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2"
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

          {/* 1日学習時間（任意） */}
          <div className="mt-4">
            <label className="text-sm text-gray-600">1日の学習時間（分）</label>
            <input
              type="number"
              min={5}
              max={60}
              step={1}
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={demand.constraints.minutesPerDay}
              onChange={(e) =>
                setDemand((d) => ({
                  ...d,
                  constraints: { ...d.constraints, minutesPerDay: Math.max(5, Math.min(60, Number(e.target.value))) },
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
          <div className="lg:col-span-2 rounded-2xl border bg-white p-6">
            <div className="text-sm text-gray-500">本日のセッション</div>
            {started ? (
              <div className="mt-2">
                <SessionRunner demand={demand} />
              </div>
            ) : (
              <div className="mt-2 text-sm text-gray-600">
                「本日のセッションを開始」を押すと、ジャンル/レベルに合わせて ①フレーズ → ②ロールプレイ → ③復習 を表示します。
              </div>
            )}
          </div>

          {/* KPI などの横ブロック（ダミー） */}
          <div className="rounded-2xl border bg-white p-6">
            <div className="text-sm text-gray-500">KPI例</div>
            <ul className="mt-2 text-sm text-gray-700 space-y-2">
              <li className="rounded-lg border p-3">weekly_completion_rate</li>
              <li className="rounded-lg border p-3">WPM / mispronunciation_rate</li>
              <li className="rounded-lg border p-3">dialog_success_rate</li>
            </ul>
          </div>
        </div>
      </section>

      <footer className="sr-only">build: {process.env.NEXT_PUBLIC_BUILD_TAG}</footer>
    </div>
  );
}
