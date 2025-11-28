// app/pingpong-training/_components/Trainer.tsx
"use client";
import React, { useMemo, useState } from "react";

export type QA = { question: string; answer: string; qJa?: string; aJa?: string };

function normalize(s: string) {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

export default function Trainer({ level, items }: { level: number; items: QA[] }) {
  const data = useMemo<QA[]>(
    () =>
      items && items.length
        ? items
        : [
            {
              question: "You play baseball?",
              answer: "Yes, I play baseball.",
              qJa: "野球をするの？",
              aJa: "はい、野球をします。",
            },
            {
              question: "You like coffee?",
              answer: "Yes, I like coffee.",
              qJa: "コーヒーは好き？",
              aJa: "はい、好きです。",
            },
          ],
    [items]
  );

  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [showHint, setShowHint] = useState(true); // ← デフォルトで日本語を見せる
  const [correctCount, setCorrectCount] = useState(0);

  const total = data.length;
  const current = data[idx];
  const expected = current?.answer ?? "";
  const progress = Math.round(idx / Math.max(1, total) * 100);

  function check() {
    if (!current) return;
    const ok = normalize(input) === normalize(expected);
    setStatus(ok ? "correct" : "wrong");
    if (ok) setCorrectCount((c) => c + 1);
  }

  function next() {
    setStatus("idle");
    setInput("");
    if (idx + 1 < total) setIdx(idx + 1);
  }

  const cleared = idx === total - 1 && status === "correct";

  return (
    <div className="space-y-4">
      {/* 進捗バー */}
      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-slate-800" style={{ width: `${progress}%` }} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Question（英/日） */}
        <div className="p-5 rounded-2xl border bg-white shadow-sm">
          <div className="text-xs text-slate-500 mb-2">質問（英語）</div>
          <div className="text-lg leading-relaxed">{current?.question || "—"}</div>
          {current?.qJa && (
            <div className="mt-2 text-sm text-slate-600">🇯🇵 質問（日本語）：{current.qJa}</div>
          )}
        </div>

        {/* Answer 入力（英）＋日本語例 */}
        <div className="p-5 rounded-2xl border bg-white shadow-sm">
          <div className="text-xs text-slate-500 mb-2">あなたの答え（英語で入力）</div>
          <input
            className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setStatus("idle");
            }}
            placeholder="ここに英文を入力してください"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={check}
              className="px-4 py-2 rounded-xl border bg-black text-white"
            >
              答え合わせ
            </button>
            <button
              onClick={() => setShowHint((v) => !v)}
              className="px-3 py-2 rounded-xl border"
            >
              {showHint ? "日本語ヒントを隠す" : "日本語ヒントを表示"}
            </button>
            <button onClick={next} className="px-3 py-2 rounded-xl border">
              スキップ
            </button>
          </div>

          <div className="mt-3 min-h-6">
            {status === "correct" && (
              <span className="text-green-600 font-medium">⭕ 正解！よくできました。</span>
            )}
            {status === "wrong" && (
              <span className="text-red-600 font-medium">❌ もう一度チャレンジしてみよう。</span>
            )}
          </div>

          {/* 期待解答の表示（ヒント） */}
          <div className="mt-2 text-sm text-slate-600">
            ヒント（英語の模範解答）：
            <code className="bg-slate-100 px-1 rounded">{expected}</code>
          </div>
          {showHint && current?.aJa && (
            <div className="mt-1 text-sm text-slate-600">
              ヒント（日本語）：{current.aJa}
            </div>
          )}
        </div>
      </div>

      {/* フッター */}
      {cleared ? (
        <div className="p-6 rounded-2xl border bg-white shadow-sm">
          <div className="text-xl font-semibold mb-2">
            🎉 レベル {level} クリア！
          </div>
          <div className="text-slate-600 mb-4">
            おつかれさま！（{correctCount}/{total} 問正解）
          </div>
          <div className="flex gap-2">
            {level < 6 && (
              <a
                href={`/pingpong-training/level/${level + 1}`}
                className="px-4 py-2 rounded-xl border bg-black text-white"
              >
                レベル {level + 1} へ進む
              </a>
            )}
            <a
              href="/pingpong-training"
              className="px-4 py-2 rounded-xl border"
            >
              レベル選択に戻る
            </a>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">
            {idx + 1} / {total} 問
          </div>
          <button
            onClick={() => (status === "correct" ? next() : check())}
            className="px-4 py-2 rounded-xl border bg-black text-white"
          >
            {status === "correct" ? "次の問題へ" : "答え合わせ"}
          </button>
        </div>
      )}
    </div>
  );
}
