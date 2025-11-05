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
            { question: "You play baseball?", answer: "Yes, I play baseball.", qJa: "野球をするの？", aJa: "はい、野球をします。" },
            { question: "You like coffee?", answer: "Yes, I like coffee.", qJa: "コーヒーは好き？", aJa: "はい、好きです。" },
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
  const progress = Math.round(((idx) / Math.max(1, total)) * 100);

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
      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-slate-800" style={{ width: `${progress}%` }} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Question（英/日） */}
        <div className="p-5 rounded-2xl border bg-white shadow-sm">
          <div className="text-xs text-slate-500 mb-2">Question</div>
          <div className="text-lg leading-relaxed">{current?.question || "—"}</div>
          {current?.qJa && (
            <div className="mt-2 text-sm text-slate-600">🇯🇵 {current.qJa}</div>
          )}
        </div>

        {/* Answer 入力（英）＋日本語例 */}
        <div className="p-5 rounded-2xl border bg-white shadow-sm">
          <div className="text-xs text-slate-500 mb-2">Your Answer</div>
          <input
            className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setStatus("idle");
            }}
            placeholder="Type here..."
          />
          <div className="mt-3 flex gap-2">
            <button onClick={check} className="px-4 py-2 rounded-xl border bg-black text-white">Check</button>
            <button onClick={() => setShowHint(v => !v)} className="px-3 py-2 rounded-xl border">
              {showHint ? "Hide JP" : "Show JP"}
            </button>
            <button onClick={next} className="px-3 py-2 rounded-xl border">Skip</button>
          </div>

          <div className="mt-3 min-h-6">
            {status === "correct" && <span className="text-green-600 font-medium">✅ Correct!</span>}
            {status === "wrong" && <span className="text-red-600 font-medium">❌ Try again.</span>}
          </div>

          {/* 期待解答の表示（ヒント） */}
          <div className="mt-2 text-sm text-slate-600">
            Hint (EN): <code className="bg-slate-100 px-1 rounded">{expected}</code>
          </div>
          {showHint && current?.aJa && (
            <div className="mt-1 text-sm text-slate-600">Hint (JP): {current.aJa}</div>
          )}
        </div>
      </div>

      {/* フッター */}
      {cleared ? (
        <div className="p-6 rounded-2xl border bg-white shadow-sm">
          <div className="text-xl font-semibold mb-2">🎉 Level {level} Cleared!</div>
          <div className="text-slate-600 mb-4">Great job! ({correctCount}/{total} correct)</div>
          <div className="flex gap-2">
            {level < 6 && (
              <a href={`/pingpong-training/level/${level + 1}`} className="px-4 py-2 rounded-xl border bg-black text-white">
                Go to Level {level + 1}
              </a>
            )}
            <a href="/pingpong-training" className="px-4 py-2 rounded-xl border">Back to Levels</a>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">{idx + 1} / {total}</div>
          <button
            onClick={() => (status === "correct" ? next() : check())}
            className="px-4 py-2 rounded-xl border bg-black text-white"
          >
            {status === "correct" ? "Next" : "Check"}
          </button>
        </div>
      )}
    </div>
  );
}
