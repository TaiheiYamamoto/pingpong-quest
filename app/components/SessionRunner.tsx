// app/components/SessionRunner.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useToast } from "./Toast";
import RoleplayWidget from "./RoleplayWidget";

/* ===== types (page.tsx と揃える) ===== */
type CEFR = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
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

/* ===== 小ユーティリティ ===== */
function labelStep(step: Step["step"]) {
  switch (step) {
    case "diagnostic_mini_test":
      return "診断ミニテスト";
    case "listen_and_repeat":
      return "音読＆リピート";
    case "roleplay_ai":
      return "AIロールプレイ";
    case "feedback":
      return "フィードバック";
  }
}

function wordSim(a: string, b: string) {
  // 超簡易：単語一致率（空白区切りで一致/合計）
  const A = a.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean);
  const B = b.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean);
  if (A.length === 0 || B.length === 0) return 0;
  const setB = new Set(B);
  const hit = A.filter((w) => setB.has(w)).length;
  return Math.round((hit / Math.max(A.length, B.length)) * 100);
}

/* ===== 1) 診断ミニテスト ===== */
function DiagnosticMiniTest({
  level,
  onDecide,
}: {
  level: CEFR;
  onDecide: (out: { level: CEFR; scenes: string[] }) => void;
}) {
  const [goal, setGoal] = useState<"inbound" | "business" | "travel">("inbound");
  const [self, setSelf] = useState<"A1" | "A2" | "B1">("A2");
  const [scenes, setScenes] = useState<string[]>(["menu", "payment"]);

  return (
    <div className="rounded-xl border p-4">
      <div className="text-sm text-gray-500">ゴール・レベル・シーンを簡易診断します。</div>

      <div className="mt-3">
        <label className="text-sm text-gray-600">主目的</label>
        <select
          value={goal}
          onChange={(e) => setGoal(e.target.value as typeof goal)}
          className="mt-1 w-full rounded-lg border px-3 py-2"
        >
          <option value="inbound">インバウンド接客</option>
          <option value="business">ビジネス会話</option>
          <option value="travel">旅行英会話</option>
        </select>
      </div>

      <div className="mt-3">
        <label className="text-sm text-gray-600">自己申告レベル</label>
        <select
          value={self}
          onChange={(e) => setSelf(e.target.value as typeof self)}
          className="mt-1 w-full rounded-lg border px-3 py-2"
        >
          <option value="A1">A1：超入門</option>
          <option value="A2">A2：基礎</option>
          <option value="B1">B1：日常会話</option>
        </select>
      </div>

      <div className="mt-3">
        <div className="text-sm text-gray-600">必要シーン（複数選択可）</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {["menu", "allergy", "payment", "directions"].map((s) => {
            const sel = scenes.includes(s);
            return (
              <button
                key={s}
                className={`px-3 py-1 rounded-full text-sm border ${
                  sel ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-300"
                }`}
                onClick={() =>
                  setScenes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
                }
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <button
        className="mt-4 rounded-lg bg-black px-4 py-2 text-white text-sm"
        onClick={() => {
          const map: Record<typeof self, CEFR> = { A1: "A1", A2: "A2", B1: "B1" };
          onDecide({ level: map[self], scenes });
        }}
      >
        この内容で開始
      </button>

      <div className="mt-2 text-xs text-gray-500">現在の推奨レベル: {level}</div>
    </div>
  );
}

/* ===== 2) 音読＆リピート ===== */
function ListenAndRepeat({
  phrase,
}: {
  phrase: string;
}) {
  const { push } = useToast();
  const [recording, setRecording] = useState(false);
  const [userText, setUserText] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);

  const mime = (): string | undefined => {
    const c1 = "audio/webm;codecs=opus";
    const c2 = "audio/webm";
    if (typeof MediaRecorder === "undefined") return undefined;
    if (MediaRecorder.isTypeSupported?.(c1)) return c1;
    if (MediaRecorder.isTypeSupported?.(c2)) return c2;
    return undefined;
  };

  async function playTTS(text: string) {
    try {
      const r = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) throw new Error(await r.text());
      const buf = await r.arrayBuffer();
      const url = URL.createObjectURL(new Blob([buf], { type: "audio/mpeg" }));
      const a = new Audio(url);
      await a.play();
    } catch {
      push({ kind: "error", title: "音声再生に失敗", message: "ネットワークをご確認ください。" });
    }
  }

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, mime() ? { mimeType: mime() } : undefined);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => e.data && chunks.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
        const fd = new FormData();
        fd.append("audio", blob, "in.webm");
        try {
          const stt = await fetch("/api/stt", { method: "POST", body: fd });
          if (!stt.ok) throw new Error(await stt.text());
          const { text } = (await stt.json()) as { text: string };
          setUserText(text);
          setScore(wordSim(phrase, text));
        } catch {
          push({ kind: "error", title: "文字起こし失敗", message: "もう一度お試しください。" });
        }
      };
      recRef.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      push({ kind: "error", title: "マイク権限が必要です", message: "ブラウザ設定をご確認ください。" });
    }
  }

  function stop() {
    recRef.current?.stop();
    setRecording(false);
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="text-sm text-gray-500">聞いて→真似して言う。正確さスコアも表示します。</div>
      <div className="mt-2 rounded border bg-white p-3">{phrase}</div>
      <div className="mt-3 flex gap-2">
        <button onClick={() => playTTS(phrase)} className="rounded-lg bg-gray-900 px-3 py-2 text-white text-sm">
          🔊 再生
        </button>
        {!recording ? (
          <button onClick={start} className="rounded-lg bg-black px-3 py-2 text-white text-sm">
            🎙️ 録音
          </button>
        ) : (
          <button onClick={stop} className="rounded-lg bg-red-600 px-3 py-2 text-white text-sm">
            ⏹ 停止
          </button>
        )}
      </div>
      {userText && (
        <div className="mt-3 text-sm">
          <div className="text-gray-500">あなた：</div>
          <div className="mt-1 rounded border bg-gray-50 p-2">{userText}</div>
          <div className="mt-1 font-semibold">一致度：{score}%</div>
        </div>
      )}
    </div>
  );
}

/* ===== 3) AI ロールプレイ（AIが最初に質問） ===== */
function RoleplayAIFirst({
  scene,
  level,
}: {
  scene: string;
  level: CEFR;
}) {
  const { push } = useToast();
  const [question, setQuestion] = useState<string>("");

  async function fetchOpening() {
    try {
      const r = await fetch("/api/roleplay/opening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene, level }),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = (await r.json()) as { question: string };
      setQuestion(data.question);
      // 再生
      const tts = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: data.question }),
      });
      if (!tts.ok) throw new Error(await tts.text());
      const buf = await tts.arrayBuffer();
      const url = URL.createObjectURL(new Blob([buf], { type: "audio/mpeg" }));
      const a = new Audio(url);
      await a.play();
    } catch {
      push({ kind: "error", title: "AIの質問取得に失敗", message: "ネットワークをご確認ください。" });
    }
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="text-sm text-gray-500">AIが最初に質問します。聞いたあとに返答してください。</div>
      <div className="mt-2 flex gap-2">
        <button className="rounded-lg bg-black px-4 py-2 text-white text-sm" onClick={fetchOpening}>
          🤖 最初の質問を聞く
        </button>
      </div>
      {question && (
        <div className="mt-3 text-sm">
          <div className="text-gray-500">AI（質問）：</div>
          <div className="mt-1 rounded border bg-white p-2">{question}</div>
        </div>
      )}
      {/* 返答用：既存の音声ロールプレイ（STT→AI返信→TTS） */}
      <div className="mt-4">
        <RoleplayWidget scene={scene} level={level} />
      </div>
    </div>
  );
}

/* ===== 4) まとめ（フィードバック） ===== */
function FeedbackBlock() {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-sm text-gray-600">
        今日の学習を保存し、次のレベルに進みましょう。弱点（発音・語彙・文法）に合わせて次のタスクが強化されます。
      </div>
      <div className="mt-3 text-sm">
        ✅ 目標フレーズの再現度 / ✅ ロールプレイの理解度 / ✅ 応答スピード（WPM）
      </div>
    </div>
  );
}

/* ===== セッションランナー本体 ===== */
export default function SessionRunner({
  plan,
  demand,
  setDemand,
}: {
  plan: Plan;
  demand: Demand;
  setDemand: React.Dispatch<React.SetStateAction<Demand>>;
}) {
  const { push } = useToast();
  const steps = plan.todaySession.flow;
  const [active, setActive] = useState(0);

  // シーン由来の練習フレーズ（簡易）
  const scene = demand.constraints.scenes[0] ?? "menu";
  const phraseMap: Record<string, string[]> = {
    menu: [
      "What would you like to drink?",
      "Would you like to see our specials?",
      "How would you like your steak cooked?",
    ],
    allergy: [
      "Do you have any food allergies?",
      "This dish contains peanuts.",
      "We can make it without soy sauce.",
    ],
    payment: [
      "How would you like to pay?",
      "Could you tap your card here, please?",
      "Would you like a receipt?",
    ],
    directions: [
      "The restroom is down the hall to the right.",
      "The station is a five-minute walk straight ahead.",
      "Take the elevator to the third floor.",
    ],
  };
  const phrases = phraseMap[scene] ?? phraseMap.menu;
  const [phraseIndex, setPhraseIndex] = useState(0);

  return (
    <div>
      {/* ステップのカード群（クリックで切替） */}
      <ul className="mt-2 text-sm text-gray-700 space-y-3">
        {steps.map((s, i) => (
          <li
            key={i}
            className={`cursor-pointer rounded-lg border p-3 ${
              active === i ? "bg-gray-50 border-black" : ""
            }`}
            onClick={() => setActive(i)}
          >
            {i + 1}. {labelStep(s.step)}
          </li>
        ))}
      </ul>

      <div className="mt-4">
        {/* 中身 */}
        {steps[active]?.step === "diagnostic_mini_test" && (
          <DiagnosticMiniTest
            level={demand.level.cefr}
            onDecide={(out) => {
              setDemand((d) => ({
                ...d,
                level: { ...d.level, cefr: out.level },
                constraints: { ...d.constraints, scenes: out.scenes.length ? out.scenes : d.constraints.scenes },
              }));
              push({ kind: "success", title: "診断を更新しました", message: `レベル: ${out.level}` });
            }}
          />
        )}

        {steps[active]?.step === "listen_and_repeat" && (
          <div>
            <ListenAndRepeat phrase={phrases[phraseIndex]} />
            <div className="mt-3 flex gap-2">
              <button
                className="rounded-lg border px-3 py-2 text-sm"
                onClick={() => setPhraseIndex((i) => Math.max(0, i - 1))}
              >
                ◀ 前
              </button>
              <button
                className="rounded-lg border px-3 py-2 text-sm"
                onClick={() => setPhraseIndex((i) => Math.min(phrases.length - 1, i + 1))}
              >
                次 ▶
              </button>
            </div>
          </div>
        )}

        {steps[active]?.step === "roleplay_ai" && (
          <RoleplayAIFirst scene={scene} level={demand.level.cefr} />
        )}

        {steps[active]?.step === "feedback" && <FeedbackBlock />}
      </div>
    </div>
  );
}
