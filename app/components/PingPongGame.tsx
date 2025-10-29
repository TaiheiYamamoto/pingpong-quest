"use client";

import { useRef, useState } from "react";
import MapMini from "./MapMini";
import Image from "next/image";

/* ===== Types ===== */
type NodeId = "start" | "fork1L" | "fork1R" | "treasure" | "gate" | "boss" | "goal";

type GameState = {
  node: NodeId;
  hasKey: boolean;
  score: number;
  bossHits: number;
};

/* ===== Boss questions (3種固定) ===== */
const BOSS_QUESTIONS: { label: string; check: (s: string) => boolean }[] = [
  {
    label: "Introduce yourself in one sentence.",
    check: (raw) => {
      const s = raw.toLowerCase();
      const okVerb = /\b(my name is|i am|i'm)\b/.test(s);
      const hasNameLike = /\b[A-Za-z]{2,}\b/.test(raw);
      return okVerb && hasNameLike; // from は必須にしない
    },
  },
  {
    label: "Say your hobby in one short sentence.",
    check: (raw) => /\bi\s+(like|love)\b/i.test(raw.toLowerCase()),
  },
  {
    label: "Say your future dream in one short sentence.",
    check: (raw) => /\bi\s+(want to be|want to become|will be|would like to be)\b/i.test(raw.toLowerCase()),
  },
];

/* ===== Map (各ノード定義) ===== */
const MAP: Record<
  NodeId,
  {
    prompt: string;
    next?: NodeId[];
    quiz?: string;
    pos: { r: number; c: number };
    check?: (s: string) => boolean;
    monster?: "slime" | "sprite" | "goblin" | "shadow";
  }
> = {
  start: { prompt: "Welcome! Ready?", next: ["fork1L", "fork1R"], pos: { r: 1, c: 2 }, monster: "slime" },
  fork1L: {
    prompt: "Turn left. Say a greeting.",
    next: ["treasure"],
    pos: { r: 1, c: 3 },
    quiz: "Say: Nice to meet you.",
    check: (s) => /nice to meet you\b/i.test(s),
    monster: "sprite",
  },
  fork1R: {
    prompt: "Turn right. Ask the time.",
    next: ["gate"],
    pos: { r: 1, c: 4 },
    quiz: "Ask: What time is it?",
    check: (s) => /(what\s+time\s+is\s+it)/i.test(s),
    monster: "goblin",
  },
  treasure: {
    prompt: "You found a key!",
    next: ["gate"],
    pos: { r: 3, c: 5 },
    quiz: "Spell 'map'.",
    check: (s) => /\bmap\b/i.test(s) || /\bm\s*a\s*p\b/i.test(s.replace(/\W+/g, " ")),
    monster: "sprite",
  },
  gate: {
    prompt: "A gate blocks the way.",
    next: ["boss"],
    pos: { r: 3, c: 3 },
    quiz: "Answer: Where are you from?",
    check: (s) => /\bfrom\b/i.test(s),
    monster: "goblin",
  },
  boss: {
    prompt: "Final Boss! 3 short Qs.",
    next: ["goal"],
    pos: { r: 5, c: 3 },
    quiz: "Introduce yourself in one sentence.",
    // 実判定は BOSS_QUESTIONS 側で行うのでここは参考
    check: (s) => /\b(my name is|i am)\b/i.test(s),
    monster: "shadow",
  },
  goal: { prompt: "Clear! Take your reward card!", pos: { r: 6, c: 3 }, monster: "slime" },
};

/* ===== Initial state ===== */
const INITIAL: GameState = { node: "start", hasKey: false, score: 0, bossHits: 0 };

export default function PingPongGame() {
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const [audioUrl, setAudioUrl] = useState("");
  const [lastText, setLastText] = useState("");
  const [isRec, setIsRec] = useState(false);
  const [state, setState] = useState<GameState>(INITIAL);
  const [reward, setReward] = useState<string | null>(null);
  const [aiMsg, setAiMsg] = useState<{ feedback?: string; speech?: string } | null>(null);

  const node = MAP[state.node] ?? MAP.start;
  const safePos = node.pos;

  const isBoss = state.node === "boss";
  const bossIdx = Math.min(state.bossHits, BOSS_QUESTIONS.length - 1);
  const activeBossQ = isBoss ? BOSS_QUESTIONS[bossIdx] : null;

  /* ===== モンスター画像フォールバック ===== */
  const [monsterImgError, setMonsterImgError] = useState(false);
  const monsterEmoji: Record<string, string> = { slime: "🟢", sprite: "🧚", goblin: "👺", shadow: "🕳️" };

  /* ===== Recording ===== */
  async function startRec() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRef.current = new MediaRecorder(stream);
    chunksRef.current = [];
    setIsRec(true);

    mediaRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
    mediaRef.current.onstop = onStop;
    mediaRef.current.start();
    setTimeout(() => mediaRef.current?.stop(), 3000);
  }

  async function onStop() {
    setIsRec(false);
    const wav = new Blob(chunksRef.current, { type: "audio/webm" });

    // 1) STT
    const stt = await fetch("/api/pingpong/stt", { method: "POST", body: wav }).then((r) => r.json());
    const user = (stt.text ?? "").trim();
    setLastText(user);

    // 2) その時点のノード
    const now = MAP[state.node] ?? MAP.start;

    // 3) ローカル判定
    const okLocal = isBoss
      ? activeBossQ
        ? activeBossQ.check(user)
        : false
      : now.check
      ? now.check(user)
      : true;

    // 4) AI（フィードバック＋先生セリフ）
    const currentQuiz = isBoss ? activeBossQ?.label ?? "Answer the question." : now.quiz;
    const aiResp = await fetch("/api/pingpong/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userText: user, state, currentQuiz, okHint: okLocal }),
    }).then((r) => r.json());
    setAiMsg(aiResp);

    // 5) 遷移
    const nextState: GameState = { ...state };

    if (isBoss) {
      if (okLocal) nextState.bossHits = state.bossHits + 1; // ★ progress を進める
      if (nextState.bossHits >= BOSS_QUESTIONS.length) {
        nextState.node = "goal";
      } else {
        nextState.node = "boss"; // 継続
      }
    } else {
      if (okLocal) {
        nextState.score += 1;
        if (state.node === "treasure") nextState.hasKey = true;

        let next: NodeId | undefined;
        if (state.node === "start") {
          const lower = user.toLowerCase();
          next = lower.includes("left")
            ? "fork1L"
            : lower.includes("right")
            ? "fork1R"
            : (now.next ?? [])[0];
        } else {
          next = (now.next ?? [])[0];
        }
        if (next) nextState.node = next;
      }
    }

    // gate → boss は鍵必須
    if (nextState.node === "boss" && !nextState.hasKey) nextState.node = "treasure";

    setState(nextState);

    // 6) TTS
    const tts = await fetch("/api/pingpong/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: aiResp.speech || (okLocal ? "Great job!" : "Almost. Try again!") }),
    });
    const ab = await tts.arrayBuffer();
    const url = URL.createObjectURL(new Blob([ab], { type: "audio/mpeg" }));
    setAudioUrl(url);

    // 7) ごほうび
    if (nextState.node === "goal") {
      const card = nextState.score >= 3 ? "/cards/boss.png" : "/cards/light.png";
      setReward(card);
    }
  }

  function downloadReward() {
    if (!reward) return;
    const a = document.createElement("a");
    a.href = reward;
    a.download = reward.split("/").pop() || "reward.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /* ===== UI ===== */
  return (
    <div className="min-h-screen bg-[#f5e8c7]">
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white/80 border rounded-2xl shadow p-5 space-y-4">
          <h2 className="hud-title text-xl">🎮 PingPong English Quest</h2>

          {/* あそびかた */}
          <div className="bg-amber-50 border rounded p-3">
            <h3 className="font-semibold">あそびかた</h3>
            <ul className="list-disc ml-5 text-sm leading-relaxed">
              <li>ボタンをおすと 3びょう はなせるよ。</li>
              <li>えいごでこたえると スコアが ふえるよ。</li>
              <li>かぎを ひろって から ゴールへ！</li>
              <li>ボスには 3かい こたえて かつ！</li>
            </ul>
          </div>

          {/* モンスター */}
          <div className="flex items-center gap-3">
            {monsterImgError ? (
  <div className="text-3xl">
    {monsterEmoji[node.monster ?? "slime"]}
  </div>
) : (
  <Image
    src={`/monsters/${node.monster ?? "slime"}.png`}
    alt="monster"
    width={64}
    height={64}
    className={state.node === "boss" ? "animate-bounce" : ""}
    onError={() => setMonsterImgError(true)}
  />
)}
            <div className="text-xs text-gray-500">Attribute: {node.monster}</div>
          </div>

          {/* マップ */}
          <div className="flex items-center gap-3">
            <MapMini pos={safePos} />
            <div className="text-sm">
              <div>
                <b>Stage:</b> {state.node}
              </div>
              <div>
                Key: {state.hasKey ? "🗝️" : "—"} / Score: {state.score}
              </div>
            </div>
          </div>

          {/* プロンプト＆クイズ */}
          <div className="p-3 rounded border">
            <div className="mb-1">🧭 {node.prompt}</div>

            {state.node === "boss" && (
              <div className="text-xs text-purple-700">
                Boss progress: {state.bossHits} / {BOSS_QUESTIONS.length}
              </div>
            )}

            <div className="text-gray-700">
              📝 Quiz:{" "}
              {state.node === "boss"
                ? BOSS_QUESTIONS[Math.min(state.bossHits, BOSS_QUESTIONS.length - 1)].label
                : node.quiz ?? ""}
            </div>
          </div>

          {/* 録音ボタン */}
          <button
            className={
              "btn-8bit px-5 py-3 rounded text-white transition " +
              (isRec ? "bg-red-600 animate-pulse cursor-not-allowed" : "bg-black hover:bg-gray-800")
            }
            onClick={startRec}
            disabled={isRec}
          >
            {isRec ? "● Recording..." : "Talk (3 sec)"}
          </button>

          {lastText && <p className="text-sm text-gray-500">You said: {lastText}</p>}
          {audioUrl && <audio src={audioUrl} autoPlay controls />}

          {/* AIフィードバック */}
          {aiMsg?.feedback && (
            <div className="text-sm text-orange-700 bg-orange-50 border rounded p-2">{aiMsg.feedback}</div>
          )}

          {/* ごほうびカード */}
          {reward && (
            <div className="p-3 rounded bg-emerald-50 border">
              <div className="font-semibold mb-2">🎉 CLEAR! Reward Card</div>
              <Image
  src={reward}
  alt="reward"
  width={224}   // w-56 相当
  height={128}  // 適宜
  className="rounded border"
  onError={() => {
    const ph = document.getElementById("reward-fallback");
    if (ph) ph.classList.remove("hidden");
  }}
/>
              <div id="reward-fallback" className="hidden w-56 h-32 grid place-items-center rounded border bg-white">
                <div className="text-center">
                  <div className="text-2xl">✨</div>
                  <div className="text-sm">Reward Unlocked!</div>
                </div>
              </div>
              <div className="mt-2">
                <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={downloadReward}>
                  Download Card
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
