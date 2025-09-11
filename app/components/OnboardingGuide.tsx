"use client";

import React, { useEffect } from "react";

type Step = {
  title: string;
  bullets: string[];
};

type Props = {
  open: boolean;
  /** true のときは「今後表示しない」を保存したい場合に使う */
  onClose: (persistDontShow: boolean) => void;
  onFinish?: () => void;
};

export default function OnboardingGuide({ open, onClose, onFinish }: Props) {
  const steps: Step[] = [
    {
      title: "1. ニーズ入力（30秒）",
      bullets: [
        "業種（飲食/ホテル/小売/交通 など）を選ぶ",
        "1日の学習時間（5〜60分）を入力",
        "重点シーン（menu, allergy, payment, directions など）を選択",
      ],
    },
    {
      title: "2. プランを自動生成",
      bullets: [
        "ボタンを押すと8週間のカリキュラムと「本日のセッション」を作成",
        "ネットワーク状況により数十秒かかる場合があります",
      ],
    },
    {
      title: "3. 本日のセッションの流れ",
      bullets: [
        "① 診断ミニテスト → 得意/苦手を把握",
        "② 音読＆リピート → 重要フレーズを口慣らし",
        "③ AIロールプレイ → 実践練習（★最初の質問はAIから）",
        "④ フィードバック → すぐ改善ポイントを確認",
      ],
    },
    {
      title: "4. ロールプレイのコツ",
      bullets: [
        "マイクの許可をオンにする（初回のみ確認が出ます）",
        "AIの質問に対し、短くてもOK。とにかく返すことが上達の近道",
        "Whisperで文字起こし → 簡易採点 → TTSで模範音声を再生",
      ],
    },
    {
      title: "5. ちょっとした小ワザ",
      bullets: [
        "生成に失敗したら再試行（回線やAPI混雑の影響）",
        "左の8週間カリキュラムはいつでも見直し可",
        "ヘッダーの「使い方」から本ガイドを再表示できます",
      ],
    },
  ];

  const [idx, setIdx] = React.useState(0);

  // ESCで閉じる
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(false);
      if (e.key === "ArrowRight") setIdx((i) => Math.min(i + 1, steps.length - 1));
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, steps.length]);

  if (!open) return null;

  const step = steps[idx];
  const isLast = idx === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold">このサイトの使い方</h2>
          <button
            aria-label="閉じる"
            onClick={() => onClose(false)}
            className="rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="mt-4">
          <div className="text-base font-medium">{step.title}</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
            {step.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full ${i === idx ? "bg-black" : "bg-gray-300"}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onClose(true)}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              スキップ（今後表示しない）
            </button>
            {!isLast ? (
              <button
                onClick={() => setIdx((i) => Math.min(i + 1, steps.length - 1))}
                className="rounded-lg bg-black px-4 py-1.5 text-sm text-white hover:opacity-90"
              >
                次へ →
              </button>
            ) : (
              <button
                onClick={() => {
                  onClose(true);
                  onFinish?.();
                }}
                className="rounded-lg bg-black px-4 py-1.5 text-sm text-white hover:opacity-90"
              >
                はじめる
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
