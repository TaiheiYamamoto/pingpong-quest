// app/components/SessionRunner.tsx
"use client";

import React from "react";
import { useToast } from "./Toast";

/* ========= 型 ========= */
type CEFR = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type Demand = {
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

type StepId = "listen_and_repeat" | "roleplay_ai" | "review";
type Genre = "restaurant" | "hotel" | "retail" | "guide";
type Phrase = { en: string; ja: string };
type PhrasesResp = { phrases: Phrase[] };

/* ========= ユーティリティ ========= */
function toGenre(industry: Demand["profile"]["industry"]): Genre {
  switch (industry) {
    case "food_service":
      return "restaurant";
    case "hotel":
      return "hotel";
    case "retail":
      return "retail";
    case "transport":
    case "other":
    default:
      return "guide";
  }
}
function sceneForGenre(g: Genre): string {
  switch (g) {
    case "restaurant":
      return "menu";
    case "hotel":
      return "check_in";
    case "retail":
      return "payment";
    case "guide":
    default:
      return "directions";
  }
}
const cefrLabel: Record<CEFR, string> = {
  A1: "A1（基礎入門）",
  A2: "A2（基礎）",
  B1: "B1（日常会話）",
  B2: "B2（応用）",
  C1: "C1（上級）",
  C2: "C2（最上級）",
};

/* ========= ルート ========= */
export default function SessionRunner({
  demand,
  onPhrasePlayed,
  onRoleplayCompleted,
  onStepDone,
}: {
  demand: Demand;
  onPhrasePlayed?: (index: number) => void;
  onRoleplayCompleted?: (payload?: { score?: number }) => void;
  onStepDone?: (id: "phrases" | "roleplay" | "review") => void;
}) {
  const steps: StepId[] = ["listen_and_repeat", "roleplay_ai", "review"];
  const [current, setCurrent] = React.useState<number>(0);

  const genre = toGenre(demand.profile.industry);
  const level: CEFR = (["A1", "A2", "B1", "B2", "C1", "C2"] as CEFR[]).includes(demand.level.cefr)
    ? demand.level.cefr
    : "A2";

  // フレーズはここで一回だけ取得
  const { push } = useToast();
  const [phrases, setPhrases] = React.useState<Phrase[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch("/api/phrases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ genre, level }),
        });
        const j = (await r.json()) as PhrasesResp | { error?: string };
        if (!r.ok || !("phrases" in j)) throw new Error(("error" in j && j.error) || "フレーズ取得に失敗しました");
        if (!aborted) setPhrases(j.phrases.slice(0, 10));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "エラーが発生しました";
        if (!aborted) {
          setPhrases([]);
          push({ kind: "error", title: "フレーズ取得エラー", message: msg });
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [genre, level, push]);

  return (
    <div>
      {/* タブ */}
      <div className="space-y-3">
        {steps.map((s, i) => (
          <button
            key={`step-${s}`}
            type="button"
            onClick={() => setCurrent(i)}
            className={`w-full rounded-xl border px-4 py-3 text-left ${
              i === current ? "bg-gray-50 border-gray-800" : "hover:bg-gray-50"
            }`}
          >
            {i + 1}. {s === "listen_and_repeat" ? "音読＆リピート" : s === "roleplay_ai" ? "AIロールプレイ" : "重要表現の復習"}
          </button>
        ))}
      </div>

      {/* パネル */}
      <div className="mt-4">
        {steps[current] === "listen_and_repeat" && (
          <ListenAndRepeat
            genre={genre}
            level={level}
            phrases={phrases}
            loading={loading}
            onPhrasePlayed={onPhrasePlayed}
          />
        )}

        {steps[current] === "roleplay_ai" && (
          <RoleplayBlock genre={genre} level={level} onRoleplayCompleted={onRoleplayCompleted} />
        )}

        {steps[current] === "review" && <ReviewBlock genre={genre} level={level} phrases={phrases} />}

        {/* 任意：次へボタン（KPI連携用） */}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => {
              const id = steps[current] === "listen_and_repeat" ? "phrases" : steps[current] === "roleplay_ai" ? "roleplay" : "review";
              onStepDone?.(id);
              setCurrent((c) => Math.min(c + 1, steps.length - 1));
            }}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
          >
            次へ →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========= ① フレーズ＆TTS ========= */
function ListenAndRepeat({
  genre,
  level,
  phrases,
  loading,
  onPhrasePlayed,
}: {
  genre: Genre;
  level: CEFR;
  phrases: Phrase[];
  loading: boolean;
  onPhrasePlayed?: (index: number) => void; // ← 追加
}) {
  const { push } = useToast();
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [loadingIndex, setLoadingIndex] = React.useState<number | null>(null);
  const cacheRef = React.useRef<Map<string, string>>(new Map());

  async function play(text: string, idx: number) {
    try {
      setLoadingIndex(idx);
      let url = cacheRef.current.get(text);
      if (!url) {
        const r = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice: "default" }),
        });
        if (!r.ok) throw new Error("TTS生成に失敗しました");
        const b = await r.blob();
        url = URL.createObjectURL(b);
        cacheRef.current.set(text, url);
      }
      const a = audioRef.current;
      if (a) {
        a.src = url;
        await a.play().catch(() => void 0);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "エラーが発生しました";
      push({ kind: "error", title: "再生できません", message: msg });
    } finally {
      setLoadingIndex(null);
      onPhrasePlayed?.(idx); // ← KPI通知（あれば）
    }
  }

  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm text-gray-600">
        ジャンル: <span className="font-medium">{genre}</span> / レベル:{" "}
        <span className="font-medium">{cefrLabel[level]}</span>
      </div>

      {loading ? (
        <div className="mt-3 text-sm text-gray-500">フレーズを生成中…</div>
      ) : phrases.length === 0 ? (
        <div className="mt-3 text-sm text-gray-500">フレーズが取得できませんでした。</div>
      ) : (
        <>
          <ul className="mt-3 space-y-4">
            {phrases.map((p, i) => (
              <li key={`${p.en}-${i}`} className="text-sm leading-6">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="font-semibold">{p.en}</div>
                    <div className="text-gray-600">{p.ja}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => play(p.en, i)}
                    disabled={loadingIndex === i}
                    className="shrink-0 rounded-md border px-3 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                    aria-label={`Play phrase ${i + 1}`}
                    title="英語を再生"
                  >
                    {loadingIndex === i ? "…再生中" : "▶︎ 再生"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <audio ref={audioRef} className="mt-3 w-full" />
        </>
      )}
    </div>
  );
}

/* ========= ② ロールプレイ ========= */
function RoleplayBlock({
  genre,
  level,
  onRoleplayCompleted,
}: {
  genre: Genre;
  level: CEFR;
  onRoleplayCompleted?: (payload?: { score?: number }) => void;
}) {
  const { push } = useToast();
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [question, setQuestion] = React.useState<string>("");

  const scene = sceneForGenre(genre);

  const ask = async () => {
    try {
      const r1 = await fetch("/api/roleplay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene, level, lang: "ja" }),
      });
      const j1 = (await r1.json()) as { question?: string; error?: string };
      if (!r1.ok || !j1.question) throw new Error(j1.error || "AIの質問取得に失敗");
      setQuestion(j1.question);

      const r2 = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: j1.question, voice: "default" }),
      });
      if (!r2.ok) throw new Error("TTS生成に失敗しました");
      const b = await r2.blob();
      const url = URL.createObjectURL(b);
      const a = audioRef.current;
      if (a) {
        a.src = url;
        await a.play().catch(() => void 0);
      }
      push({ kind: "success", title: "AIが最初の質問をしました", message: "聞き取って返答してみましょう。" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "エラーが発生しました";
      push({ kind: "error", title: "AIの質問取得に失敗", message: msg });
    }
  };

  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm text-gray-600">AIが最初に質問します。聞いたあとに返答してください。（シーン: {scene}）</div>
      <button
        type="button"
        onClick={ask}
        className="mt-3 rounded-lg bg-black px-4 py-2 text-sm text-white hover:opacity-90"
      >
        🤖 最初の質問を聞く
      </button>

      <div className="mt-4 rounded-xl border p-4">
        <div className="text-sm text-gray-600">ロールプレイ（{scene}）</div>
        <audio ref={audioRef} controls className="mt-3 w-full" />
        {question && <p className="mt-2 text-sm text-gray-700">質問: {question}</p>}
      </div>

      <button
        type="button"
        onClick={() => onRoleplayCompleted?.({ score: undefined })}
        className="mt-3 rounded-md border px-3 py-1 text-xs hover:bg-gray-50"
      >
        ✅ ロールプレイ達成
      </button>
    </div>
  );
}

/* ========= ③ 重要表現の復習 ========= */
function ReviewBlock({ genre, level, phrases }: { genre: Genre; level: CEFR; phrases: Phrase[] }) {
  const list = phrases.slice(0, 5);
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm text-gray-600">本日のまとめ（ジャンル: {genre} / レベル: {cefrLabel[level]}）</div>
      {list.length === 0 ? (
        <div className="mt-2 text-sm text-gray-500">復習用の表現がありません。</div>
      ) : (
        <ul className="mt-2 list-disc pl-5 text-sm space-y-1 text-gray-700">
          {list.map((p, i) => (
            <li key={`${p.en}-${i}`}>
              <span className="font-medium">{p.en}</span> <span className="text-gray-500">— {p.ja}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 text-xs text-gray-500">ヒント：主語・時制・ていねい度を意識して音読 → 現場に合わせて言い換え練習。</div>
    </div>
  );
}
