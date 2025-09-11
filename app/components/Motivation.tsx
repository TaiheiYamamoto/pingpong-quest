"use client";

import React, { useEffect, useMemo, useState } from "react";

export type MotivateKind = "idle" | "start" | "good" | "great" | "oops";

const MESSAGES: Record<MotivateKind, string[]> = {
  idle: [
    "今日の1分から、英語は変わる！",
    "小さな一歩＝大きな伸び。Let's do it!",
    "準備OK？ピンポン開始！"
  ],
  start: [
    "キックオフ成功！この勢いでいこう 🏓",
    "いいスタート！耳が温まってきたね 👂",
  ],
  good: [
    "いい感じ！確実に上達中 ✨",
    "その調子！あと一歩で完璧！",
  ],
  great: [
    "最高！今日のあなたはエース級 🔥",
    "完璧に近い！次のラリーへ！🏓",
  ],
  oops: [
    "大丈夫、次のラリーで取り返そう！",
    "失点してもOK。打ち返せば勝てる！💪",
  ],
};

function bg(variant: MotivateKind) {
  switch (variant) {
    case "start":
      return "from-emerald-500/10 to-cyan-500/10 border-emerald-300";
    case "good":
      return "from-yellow-500/10 to-orange-500/10 border-yellow-300";
    case "great":
      return "from-fuchsia-500/10 to-pink-500/10 border-fuchsia-300";
    case "oops":
      return "from-red-500/10 to-rose-500/10 border-rose-300";
    case "idle":
    default:
      return "from-sky-500/10 to-violet-500/10 border-sky-300";
  }
}

export default function Motivation({
  variant,
  autoRotate = true,
  durationMs = 5000,
}: {
  variant: MotivateKind;
  autoRotate?: boolean;
  durationMs?: number;
}) {
  const pool = MESSAGES[variant];
  const [idx, setIdx] = useState(0);

  const text = useMemo(() => pool[idx % pool.length], [pool, idx]);

  useEffect(() => {
    if (!autoRotate) return;
    const t = setInterval(() => setIdx((i) => i + 1), durationMs);
    return () => clearInterval(t);
  }, [autoRotate, durationMs]);

  // variant 変更時に一度メッセージを切り替え
  useEffect(() => setIdx((i) => i + 1), [variant]);

  return (
    <div
      className={`rounded-xl border bg-gradient-to-r ${bg(
        variant
      )} px-4 py-2 text-sm text-gray-900 flex items-center gap-2`}
      role="status"
      aria-live="polite"
    >
      <span className="text-lg">🏓</span>
      <span className="font-medium">{text}</span>
    </div>
  );
}
