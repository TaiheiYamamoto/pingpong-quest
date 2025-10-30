// components/pingpong/Trainer.tsx
"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";

export type QA = { question: string; answer: string };

function normalize(s: string) {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

// 先頭の "You" のみ → "I"（大文字小文字対応）
function pingpongTransform(input: string) {
  return input.replace(/^\s*you\b/i, (m) => (m[0] === "Y" ? "I" : "i"));
}

export default function Trainer({ level, items }: { level: number; items: QA[] }) {
  const data = useMemo<QA[]>(
    () =>
      items && items.length
        ? items
        : [
            { question: "You like tennis.", answer: "I like tennis." },
            { question: "You are ready.", answer: "I am ready." },
          ],
    [items]
  );

  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [showHint, setShowHint] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const total = data.length;
  const current = data[idx];
  const expected = pingpongTransform(current?.question ?? "");
  const progress = Math.round((idx / Math.max(1, total)) * 100);

  function check() {
    if (!current) return;
    const ok = normalize(input) === normalize(expected);
    setStatus(ok ? "correct" : "wrong");
    if (ok) setCorrectCount((c) => c + 1);
  }

  function next() {
    setStatus("idle");
    setShowHint(false);
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
        <div className="p-5 rounded-2xl border bg-white shadow-sm">
          <div className="text-xs text-slate-500 mb-2">Question</div>
          <div className="text-lg leading-relaxed">{current?.question || "—"}</div>
        </div>

        <div className="p-5 rounded-2xl border bg-white shadow-sm">
          <div className="text-xs text-slate-500 mb-2">
            Your Answer (replace head &quot;You&quot; → &quot;I&quot;)
            </div>
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
            <button onClick={check} className="px-4 py-2 rounded-xl border bg-black text-white">
              Check
            </button>
            <button onClick={() => setShowHint((v) => !v)} className="px-3 py-2 rounded-xl border">
              {showHint ? "Hide Hint" : "Show Hint"}
            </button>
            <button onClick={next} className="px-3 py-2 rounded-xl border">
              Skip
            </button>
          </div>
          <div className="mt-3 min-h-6">
            {status === "correct" && <span className="text-green-600 font-medium">✅ Correct!</span>}
            {status === "wrong" && <span className="text-red-600 font-medium">❌ Try again.</span>}
          </div>
          {showHint && (
            <div className="mt-2 text-sm text-slate-600">
              Hint: <code className="bg-slate-100 px-1 rounded">{expected}</code>
            </div>
          )}
        </div>
      </div>

      {cleared ? (
        <div className="p-6 rounded-2xl border bg-white shadow-sm">
          <div className="text-xl font-semibold mb-2">🎉 Level {level} Cleared!</div>
          <div className="text-slate-600 mb-4">
            Great job! ({correctCount}/{total} correct)
          </div>
          <div className="flex gap-2">
            {level < 6 && (
 <Link
href={`/pingpong-training/level/${level + 1}`}
className="px-4 py-2 rounded-xl border bg-black text-white"
>
Go to Level {level + 1}
</Link>
)}
<Link href="/pingpong-training" className="px-4 py-2 rounded-xl border">
Back to Levels
</Link>
            )}
            <a href="/pingpong-training" className="px-4 py-2 rounded-xl border">
              Back to Levels
            </a>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">
            {idx + 1} / {total}
          </div>
          <button
            onClick={() => {
              if (status === "correct") next();
              else check();
            }}
            className="px-4 py-2 rounded-xl border bg-black text-white"
          >
            {status === "correct" ? "Next" : "Check"}
          </button>
        </div>
      )}
    </div>
  );
}
