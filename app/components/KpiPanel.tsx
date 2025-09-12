"use client";
import React from "react";

export type KpiState = {
  phrasesDone: number;        // 再生したフレーズ数
  phrasesGoal: number;        // 目標（例: 10）
  roleplayCompleted: boolean; // ロールプレイを完了したか
  stepsDone: number;          // 完了したステップ数
  stepsGoal: number;          // ステップ総数（3）
};

export default function KpiPanel({ kpi }: { kpi: KpiState }) {
  const bar = (v: number, total: number) => {
    const pct = Math.min(100, Math.round((v / total) * 100));
    return (
      <div className="w-full h-2 rounded bg-gray-100">
        <div
          className="h-2 rounded bg-gradient-to-r from-indigo-500 to-cyan-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  };

  return (
    <div>
      <div className="text-sm text-gray-500">今日の進捗</div>

      <div className="mt-3 space-y-4 text-sm">
        <div>
          <div className="flex justify-between">
            <span>音読フレーズ</span>
            <span>{kpi.phrasesDone}/{kpi.phrasesGoal}</span>
          </div>
          {bar(kpi.phrasesDone, kpi.phrasesGoal)}
        </div>

        <div>
          <div className="flex justify-between">
            <span>ステップ完了</span>
            <span>{kpi.stepsDone}/{kpi.stepsGoal}</span>
          </div>
          {bar(kpi.stepsDone, kpi.stepsGoal)}
        </div>

        <div className={`rounded border p-3 ${kpi.roleplayCompleted ? "border-emerald-300 bg-emerald-50" : "border-gray-200"}`}>
          ロールプレイ：{kpi.roleplayCompleted ? "達成 🎉" : "未達"}
        </div>
      </div>
    </div>
  );
}
