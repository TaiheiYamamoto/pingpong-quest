// app/pingpong-training/_components/pingpong/PingPongQuest.tsx
"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import MapMini, { Marker } from "@/components/MapMini";
import { LEVEL_MAPS, type LevelMap, type NodeId } from "@/data/pingpong/maps";
import type React from "react";

/* ===== Types ===== */
export type QA = { question: string; answer: string; ja?: string };

type GameState = {
  node: NodeId;
  hasKey: boolean;
  score: number;
  bossHits: number;
  qIndex: number;
};

/* ===== Utils ===== */
function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[“”‘’"']/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* ===== Component ===== */
export default function PingPongQuest({
  level,
  items,
}: {
  level: number;
  items: QA[];
}) {
  const MAP = LEVEL_MAPS[level] as LevelMap;

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [audioUrl, setAudioUrl] = useState("");
  const [lastText, setLastText] = useState("");
  const [isRec, setIsRec] = useState(false);
  const [reward, setReward] = useState<string | null>(null);
  const [imgErr, setImgErr] = useState(false);
  const [started, setStarted] = useState(false);

  const [state, setState] = useState<GameState>({
    node: "start",
    hasKey: false,
    score: 0,
    bossHits: 0,
    qIndex: 0,
  });

  const node = MAP[state.node];
  const isBoss = state.node === "boss";
  const total = items.length;

  const monster = node.monster ?? "slime";
  const emoji: Record<string, string> = {
    slime: "🟢",
    sprite: "🧚",
    goblin: "👺",
    shadow: "🕳️",
  };
  const monsterSrcs = [`/monsters/${monster}.png`, `/Monster/${monster}.png`];

  // Question と Answer の抽出関数
  function questionFor(s: GameState, list: QA[]) {
    const bossNow = s.node === "boss";
    const idx = bossNow ? s.qIndex + s.bossHits : s.qIndex;
    return list[idx]?.question ?? "";
  }
  function answerFor(s: GameState, list: QA[]) {
    const bossNow = s.node === "boss";
    const idx = bossNow ? s.qIndex + s.bossHits : s.qIndex;
    return list[idx]?.answer ?? "";
  }

  // 現在の出題内容
  const spokenQuestion = questionFor(state, items);
  const expectedAnswer = answerFor(state, items);

  /* ===== TTS ===== */
  async function speak(text: string) {
    if (!text) return;
    const tts = await fetch("/api/pingpong/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const ab = await tts.arrayBuffer();
    new Audio(URL.createObjectURL(new Blob([ab], { type: "audio/mpeg" }))).play();
  }

  async function startGame() {
    setStarted(true);
    await speak(`Listen: ${spokenQuestion}`);
  }

  /* ===== 録音 ===== */
  async function startRec() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRef.current = new MediaRecorder(stream);
    chunksRef.current = [];
    setIsRec(true);

    mediaRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
    mediaRef.current.onstop = onStop;
    mediaRef.current.start();
    setTimeout(() => mediaRef.current?.stop(), 5000);
  }

  async function onStop() {
    setIsRec(false);
    const wav = new Blob(chunksRef.current, { type: "audio/webm" });

    const stt = await fetch("/api/pingpong/stt", {
      method: "POST",
      body: wav,
    }).then((r) => r.json());
    const user = (stt.text ?? "").trim();
    setLastText(user);

    const okLocal = normalize(user) === normalize(expectedAnswer);

    const aiResp = await fetch("/api/pingpong/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userText: user,
        state,
        currentQuiz: `Say: ${expectedAnswer}`,
        okHint: okLocal,
      }),
    }).then((r) => r.json());

    const nextState: GameState = { ...state };
    if (okLocal) {
      nextState.score += 1;
      new Audio("/sfx/pingpong.mp3").play();

      if (!isBoss) {
        const now = MAP[state.node];
        const next = (now.next ?? [])[0];
        if (next) nextState.node = next;

        const reserve = 3;
        const maxQ = Math.max(0, total - reserve);
        nextState.qIndex = Math.min(state.qIndex + 1, maxQ);
        if (state.node === "treasure") nextState.hasKey = true;
      } else {
        nextState.bossHits += 1;
        if (nextState.bossHits >= 3) nextState.node = "goal";
      }
    }

    if (nextState.node === "boss" && !nextState.hasKey) nextState.node = "treasure";
    setState(nextState);

    if (nextState.node === "goal") {
      // クリア時は読み上げ不要
    } else if (okLocal) {
      const nextQuestion = questionFor(nextState, items);
      setTimeout(() => speak(`Listen: ${nextQuestion}`), 650);
    } else {
      const feedback = aiResp.speech || "Almost. Try again!";
      const tts = await fetch("/api/pingpong/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: feedback }),
      });
      const ab = await tts.arrayBuffer();
      setAudioUrl(URL.createObjectURL(new Blob([ab], { type: "audio/mpeg" })));
    }

    if (nextState.node === "goal") {
      const card = nextState.score >= 6 ? "/cards/boss.png" : "/cards/light.png";
      setReward(card);
    }
  }

  /* ===== マーカー ===== */
  const M = MAP as Record<string, { pos?: { r: number; c: number } }>;
  const markers: Marker[] = [];
  if (M.treasure?.pos) markers.push({ type: "chest", pos: M.treasure.pos });
  if (M.gate?.pos) markers.push({ type: "gate", pos: M.gate.pos });
  if (M.boss?.pos) markers.push({ type: "boss", pos: M.boss.pos });
  if (M.goal?.pos) markers.push({ type: "goal", pos: M.goal.pos });

  /* ===== UI ===== */
  return (
    <div className="min-h-screen bg-[#f5e8c7]">
      <div className="max-w-6xl mx-auto p-4 scale-[1.06] md:scale-[1.12] origin-center">
        <div className="bg-white/80 border rounded-2xl shadow p-5 space-y-4">
          <h2 className="hud-title text-xl">
            🎮 PingPong English Quest — Level {level}
          </h2>

          <div className="flex items-center gap-6">
            <MapMini
              pos={node.pos}
              rows={6}
              cols={6}
              tile={34}
              scale={1.25}
              bouncing={isBoss}
              markers={markers}
            />

            <div className="text-sm">
              <div><b>Stage:</b> {state.node}</div>
              <div>Key: {state.hasKey ? "🗝️" : "—"} / Score: {state.score}</div>
              <div>Boss: {state.bossHits} / 3</div>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              {imgErr ? (
                <div className="text-4xl" title={monster}>
                  {emoji[monster]}
                </div>
              ) : (
                <img
                  src={monsterSrcs[0]}
                  onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                    const el = e.currentTarget;
                    if (el.src.endsWith(monsterSrcs[0])) el.src = monsterSrcs[1];
                    else setImgErr(true);
                  }}
                  alt="monster"
                  width={72}
                  height={72}
                  className={isBoss ? "animate-bounce" : ""}
                  style={{ imageRendering: "pixelated", objectFit: "contain" }}
                />
              )}
              <div className="text-xs text-gray-500">Monster: {monster}</div>
            </div>
          </div>

          {/* 出題と答え（両方表示） */}
          <div className="p-3 rounded border">
            <div className="mb-1">🧭 {node.prompt}</div>
            <div className="text-gray-700 mb-1">
              <span className="text-xs text-slate-500 mr-2">Question:</span>
              <code className="bg-slate-100 px-1 rounded">{spokenQuestion || "—"}</code>
            </div>
            <div className="text-gray-700">
              <span className="text-xs text-slate-500 mr-2">📝 Say (Answer):</span>
              <code className="bg-slate-100 px-1 rounded">{expectedAnswer || "—"}</code>
            </div>
          </div>

          {/* ボタンエリア */}
          {!started ? (
            <button
              className="btn-8bit px-5 py-3 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
              onClick={startGame}
              disabled={!spokenQuestion}
            >
              🎮 Game Start
            </button>
          ) : (
            <button
              className={
                "btn-8bit px-5 py-3 rounded text-white transition " +
                (isRec
                  ? "bg-red-600 animate-pulse cursor-not-allowed"
                  : "bg-black hover:bg-gray-800")
              }
              onClick={startRec}
              disabled={isRec || !expectedAnswer}
            >
              {isRec ? "● Recording..." : "Talk (5 sec)"}
            </button>
          )}

          {lastText && (
            <p className="text-sm text-gray-500">You said: {lastText}</p>
          )}
          {audioUrl && <audio src={audioUrl} autoPlay controls />}

          {/* 報酬 */}
          {reward && (
            <div className="p-3 rounded bg-emerald-50 border">
              <div className="font-semibold mb-2">
                🎉 CLEAR! Reward Card
              </div>
              <Image
                src={reward}
                alt="reward"
                width={224}
                height={128}
                className="rounded border"
              />
              <div className="mt-2">
                <a
                  href={reward}
                  download={reward.split("/").pop() || "reward.png"}
                  className="px-4 py-2 rounded bg-emerald-600 text-white inline-block"
                >
                  Download Card
                </a>
              </div>
              <div className="mt-2">
                {level < 6 ? (
                  <a
                    href={`/pingpong-training/level/${level + 1}?mode=quest`}
                    className="px-4 py-2 rounded-xl border"
                  >
                    Next Level →
                  </a>
                ) : (
                  <a
                    href="/pingpong-training"
                    className="px-4 py-2 rounded-xl border"
                  >
                    Back to Levels
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
