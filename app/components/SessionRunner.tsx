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

/* ========= 親へ通知するための Props ========= */
type RunnerProps = {
  demand: Demand;
  onStepDone?: (step: "phrases" | "roleplay" | "review") => void;
  onPhrasePlayed?: (index: number) => void;
  onRoleplayCompleted?: (result?: { score?: number }) => void;
};

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

/* ========= ルートレベル ========= */
export default function SessionRunner({
  demand,
  onStepDone,
  onPhrasePlayed,
  onRoleplayCompleted,
}: RunnerProps) {
  const { push } = useToast();

  const steps: StepId[] = ["listen_and_repeat", "roleplay_ai", "review"];
  const [current, setCurrent] = React.useState<number>(0);

  const genre = toGenre(demand.profile.industry);
  const level: CEFR = (["A1", "A2", "B1", "B2", "C1", "C2"] as CEFR[]).includes(demand.level.cefr)
    ? demand.level.cefr
    : "A2";

  // フレーズはここで1回だけ取得して子に配る
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
        if (!r.ok || !("phrases" in j)) {
          throw new Error(("error" in j && j.error) || "フレーズ取得に失敗しました");
        }
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

  const handleTabClick = (i: number, s: StepId) => {
    setCurrent(i);
    const id = s === "listen_and_repeat" ? "phrases" : s === "roleplay_ai" ? "roleplay" : "review";
    onStepDone?.(id);
  };

  return (
    <div>
      {/* タブ */}
      <div className="space-y-3">
        {steps.map((s, i) => (
          <button
            key={`step-${s}`}
            type="button"
            onClick={() => handleTabClick(i, s)}
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
          <RoleplayBlock
            genre={genre}
            level={level}
            onRoleplayCompleted={onRoleplayCompleted}
          />
        )}

        {steps[current] === "review" && (
          <ReviewBlock genre={genre} level={level} phrases={phrases} />
        )}
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
  onPhrasePlayed?: (index: number) => void;
}) {
  const { push } = useToast();
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [loadingIndex, setLoadingIndex] = React.useState<number | null>(null);
  const cacheRef = React.useRef<Map<string, string>>(new Map());

  const play = async (text: string, idx: number) => {
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
      onPhrasePlayed?.(idx); // 成功時だけ通知
    } catch (e) {
      const msg = e instanceof Error ? e.message : "エラーが発生しました";
      useToast().push({ kind: "error", title: "再生できません", message: msg });
    } finally {
      setLoadingIndex(null);
    }
  };

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

/* ========= ② ロールプレイ（録音→STT→AI返答→TTS、2〜3往復） ========= */

type Turn = { speaker: "ai" | "user"; text: string };

function RoleplayBlock({
  genre,
  level,
  onRoleplayCompleted,
}: {
  genre: Genre;
  level: CEFR;
  onRoleplayCompleted?: (r?: { score?: number }) => void;
}) {
  const { push } = useToast();
  const scene = sceneForGenre(genre);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [isRecording, setIsRecording] = React.useState(false);
  const mediaRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<BlobPart[]>([]);
  const [rounds, setRounds] = React.useState(0); // AIの発話回数
  const [busy, setBusy] = React.useState(false);
  const [modelAnswer, setModelAnswer] = React.useState<string | null>(null);

  const speak = async (text: string) => {
    const r = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: "default" }),
    });
    if (!r.ok) throw new Error("TTS生成に失敗しました");
    const b = await r.blob();
    const url = URL.createObjectURL(b);
    const a = audioRef.current;
    if (a) {
      a.src = url;
      await a.play().catch(() => void 0);
    }
  };

  // 最初の質問
  const start = async () => {
    try {
      setBusy(true);
      const r = await fetch("/api/roleplay/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene, level }),
      });
      const j = (await r.json()) as { question?: string; error?: string };
      if (!r.ok || !j.question) throw new Error(j.error || "AIの質問取得に失敗");
      const q = j.question;
      setTurns([{ speaker: "ai", text: q }]);
      setRounds(1);
      await speak(q);
      push({ kind: "success", title: "AIが最初の質問をしました", message: "聞き取って返答してみましょう。" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "エラーが発生しました";
      push({ kind: "error", title: "AIの質問取得に失敗", message: msg });
    } finally {
      setBusy(false);
    }
  };

  // 録音開始/停止
  const toggleRec = async () => {
    if (isRecording) {
      mediaRef.current?.stop();
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await handleUserAudio(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRef.current = mr;
      mr.start();
      setIsRecording(true);
    } catch {
      push({ kind: "error", title: "マイクが使えません", message: "ブラウザの権限設定をご確認ください。" });
    }
  };

  // STT → AI返答 → TTS
  const handleUserAudio = async (blob: Blob) => {
    try {
      setBusy(true);

      // 1) STT（/api/stt は FormData の file を受け取る想定）
      const fd = new FormData();
      fd.append("file", blob, "speech.webm");
      const r1 = await fetch("/api/stt", { method: "POST", body: fd });
      const j1 = (await r1.json()) as { text?: string; error?: string };
      if (!r1.ok || !j1.text) throw new Error(j1.error || "音声の文字起こしに失敗しました");
      const userText = j1.text.trim();
      setTurns((t) => [...t, { speaker: "user", text: userText }]);

      // 2) AI 返答
      const history = turns;
      const r2 = await fetch("/api/roleplay/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scene,
          level,
          history, // これまでのやり取り（簡易）
          user: userText,
        }),
      });
      const j2 = (await r2.json()) as { reply?: string; error?: string; tips?: string[]; done?: boolean };
      if (!r2.ok || !j2.reply) throw new Error(j2.error || "AIの返答生成に失敗しました");

      setTurns((t) => [...t, { speaker: "ai", text: j2.reply! }]);
      await speak(j2.reply!);

      const nextRounds = rounds + 1;
      setRounds(nextRounds);

      // 2〜3往復で終了
      const finished = j2.done || nextRounds >= 3;
      if (finished) {
        onRoleplayCompleted?.({ score: undefined });
        push({ kind: "success", title: "ロールプレイ完了！", message: "おつかれさまです。復習に進みましょう。" });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "エラーが発生しました";
      push({ kind: "error", title: "ロールプレイ中断", message: msg });
    } finally {
      setBusy(false);
    }
  };

  // 模範解答（最後の AI 質問に対する 1〜2文）
  const showModel = async () => {
    try {
      const lastAi = [...turns].reverse().find((t) => t.speaker === "ai")?.text || "";
      const r = await fetch("/api/roleplay/model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene, level, question: lastAi }),
      });
      const j = (await r.json()) as { model?: string; error?: string };
      if (!r.ok || !j.model) throw new Error(j.error || "模範解答の生成に失敗しました");
      setModelAnswer(j.model);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "エラーが発生しました";
      push({ kind: "error", title: "模範解答エラー", message: msg });
    }
  };

  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm text-gray-600">
        AIが最初に質問します。聞いたあとに返答してください。（シーン: {scene}）
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={start}
          disabled={busy || turns.length > 0}
          className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
        >
          🤖 最初の質問を聞く
        </button>

        <button
          type="button"
          onClick={toggleRec}
          disabled={busy || turns.length === 0}
          className={`rounded-lg px-4 py-2 text-sm text-white ${
            isRecording ? "bg-rose-600" : "bg-indigo-600"
          } disabled:opacity-50`}
        >
          {isRecording ? "■ 録音停止" : "🎙️ 録音開始"}
        </button>

        <button
          type="button"
          onClick={showModel}
          disabled={turns.length === 0 || busy}
          className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          📘 模範解答を表示
        </button>
      </div>

      {/* 進行ログ */}
      <div className="mt-4 rounded-xl border p-4">
        <div className="text-sm text-gray-600">ロールプレイ</div>
        <audio ref={audioRef} controls className="mt-3 w-full" />
        <ul className="mt-3 space-y-2 text-sm">
          {turns.map((t, i) => (
            <li key={i} className={t.speaker === "ai" ? "text-gray-900" : "text-gray-700"}>
              <span className="font-medium">{t.speaker === "ai" ? "AI" : "You"}:</span> {t.text}
            </li>
          ))}
        </ul>

        {modelAnswer && (
          <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm">
            <div className="font-semibold text-emerald-800">模範解答（例）</div>
            <div className="mt-1 text-emerald-900">{modelAnswer}</div>
          </div>
        )}
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
function ReviewBlock({
  genre,
  level,
  phrases,
}: {
  genre: Genre;
  level: CEFR;
  phrases: Phrase[];
}) {
  const list = phrases.slice(0, 5);
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm text-gray-600">
        本日のまとめ（ジャンル: {genre} / レベル: {cefrLabel[level]}）
      </div>
      {list.length === 0 ? (
        <div className="mt-2 text-sm text-gray-500">復習用の表現がありません。</div>
      ) : (
        <ul className="mt-2 list-disc pl-5 text-sm space-y-1 text-gray-700">
          {list.map((p, i) => (
            <li key={`${p.en}-${i}`}>
              <span className="font-medium">{p.en}</span>{" "}
              <span className="text-gray-500">— {p.ja}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 text-xs text-gray-500">
        ヒント：主語・時制・ていねい度を意識して音読 → 自身の現場に合わせて言い換え練習。
      </div>
    </div>
  );
}
