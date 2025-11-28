// app/pingpong-training/_components/pingpong/PingPongQuest.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import MapMini, { Marker } from "@/components/MapMini";
import { LEVEL_MAPS, type LevelMap, type NodeId } from "@/data/pingpong/maps";
import type React from "react";

/* ===== Types ===== */
export type QA = {
  question: string;
  answer: string;
  qJa?: string;
  aJa?: string;
};

type GameState = {
  node: NodeId | "goal";
  hasKey: boolean;
  score: number; // 正解数
  bossHits: number; // ボスに当てた回数（3回でクリア）
  qIndex: number; // 何問目まで進んだか（0,1,2,...）
};

// モンスターID（node.monster に入る想定）
type MonsterId =
  | "gargoyle"
  | "rizard"
  | "dragon"
  | "grasshopper"
  | "small_goblin"
  | "wizard"
  | "grim_reaper"
  | "slime"
  | "devil"
  | "crow";

/* ===== Utils ===== */

// 記号・空白・大文字小文字の違いをならして比較
function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[“”‘’"']/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "") // 記号削除 → . , ? などの違いは無視
    .replace(/\s+/g, " ")
    .trim();
}

// レベルごとの録音秒数
const RECORD_SECONDS: Record<number, number> = {
  1: 3,
  2: 3,
  3: 3,
  4: 4,
  5: 4,
  6: 5,
};

// ステージ1の報酬カード
const STAGE1_REWARDS: Record<number, string> = {
  1: "/cards/stage1/hero_sword.png",
  2: "/cards/stage1/book_of_wisdom.png",
  3: "/cards/stage1/swift_boots.png",
  4: "/cards/stage1/iron_helm.png",
  5: "/cards/stage1/magic_staff.png",
  6: "/cards/stage1/baby_goblin.png",
};

const JP_TEXT = {
  foundKey: "🔑 鍵を見つけた！",
};

/* ===== Component ===== */
export default function PingPongQuest({
  level,
  items,
}: {
  level: number;
  items: QA[];
}) {
  const MAP = LEVEL_MAPS[level] as LevelMap;

  // --- Recorder & タイマー関連 ---
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const countdownTimerRef = useRef<number | null>(null);
  const rewardRef = useRef<HTMLDivElement | null>(null);

  // --- UI state ---
  const [audioUrl, setAudioUrl] = useState("");
  const [lastText, setLastText] = useState("");
  const [isRec, setIsRec] = useState(false);
  const [reward, setReward] = useState<string | null>(null);
  const [imgErr, setImgErr] = useState(false);
  const [started, setStarted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const [state, setState] = useState<GameState>({
    node: "start",
    hasKey: false,
    score: 0,
    bossHits: 0,
    qIndex: 0,
  });

  // items が変わったら、必ず 1 行目からやり直し
  useEffect(() => {
    setState({
      node: "start",
      hasKey: false,
      score: 0,
      bossHits: 0,
      qIndex: 0,
    });
  }, [items]);

  // マップ情報
  const node = MAP[state.node];
  const isBoss = state.node === "boss";

  /* ===== モンスター表示ロジック =====
   *  仕様：
   *  - どのモンスターが出るかは LEVEL_MAPS の node.monster に従う
   *  - 1つの level の中で、マスを進むごとにモンスターが変わる（元の仕様を維持）
   */
  const monsterId: MonsterId =
    (((node as any).monster as MonsterId | undefined) ?? "slime");

  // ラベル用（small_goblin → "Small Goblin" など）
  const monsterLabel = monsterId
    .split("_")
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  // 絵文字（画像が読めなかったときのフォールバック）
  const emojiMap: Record<string, string> = {
    slime: "🟢",
    small_goblin: "👺",
    gargoyle: "🗿",
    rizard: "🦎",
    dragon: "🐉",
    wizard: "🧙‍♂️",
    grim_reaper: "☠️",
    devil: "😈",
    grasshopper: "🦗",
    crow: "🐦",
  };
  const monsterEmoji = emojiMap[monsterId] ?? "👾";

  // 画像パス（旧 /Monster フォルダもフォールバックで見る）
// 画像パス（新しい /monster フォルダだけを使う）
const monsterSrcs = [`/monster/${monsterId}.png`];


  // ===== 現在の items[] インデックス =====
  // ★ 完全にシンプル：0 行目から順番に下へ。
  function currentIndex(s: GameState): number {
    if (items.length === 0) return 0;
    return Math.min(s.qIndex, items.length - 1);
  }

  function questionFor(s: GameState) {
    const idx = currentIndex(s);
    return items[idx]?.question ?? "";
  }

  function answerFor(s: GameState) {
    const idx = currentIndex(s);
    return items[idx]?.answer ?? "";
  }

  const spokenQuestion = questionFor(state);
  const expectedAnswer = answerFor(state);

  /* ===== TTS 共通関数 ===== */
  async function speak(text: string) {
    if (!text) return;
    const tts = await fetch("/api/pingpong/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const ab = await tts.arrayBuffer();
    const url = URL.createObjectURL(new Blob([ab], { type: "audio/mpeg" }));
    setAudioUrl(url);
    new Audio(url).play();
  }

  // ゲーム開始：最初の Question を読み上げ
  async function startGame() {
    setStarted(true);
    await speak(spokenQuestion);
  }

  /* ===== 録音開始（録音中にカウントダウン） ===== */
  async function startRec() {
    const secs = RECORD_SECONDS[level] ?? 3;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const media = new MediaRecorder(stream);
    mediaRef.current = media;
    chunksRef.current = [];
    setIsRec(true);
    setCountdown(secs);

    media.ondataavailable = (e) => {
      chunksRef.current.push(e.data);
    };

    media.onstop = onStop;

    media.start();

    // カウントダウン（録音中）
    if (countdownTimerRef.current != null) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    countdownTimerRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          if (countdownTimerRef.current != null) {
            window.clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // secs 秒後に自動停止
    window.setTimeout(() => {
      if (media.state !== "inactive") {
        media.stop();
      }
    }, secs * 1000);
  }

  /* ===== 録音停止後 ===== */
  async function onStop() {
    // カウントダウン停止＆消す
    if (countdownTimerRef.current != null) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);

    setIsRec(false);
    const wav = new Blob(chunksRef.current, { type: "audio/webm" });

    const stt = await fetch("/api/pingpong/stt", {
      method: "POST",
      body: wav,
    }).then((r) => r.json());

    const user = (stt.text ?? "").trim();
    setLastText(user);

    // 判定：記号・空白・大文字小文字だけは無視
    const userNorm = normalize(user);
    const expectedNorm = normalize(expectedAnswer);
    const okLocal =
      expectedNorm.length > 0 && userNorm === expectedNorm;

    // ===== 遷移ロジック =====
    const nextState: GameState = { ...state };

    if (okLocal) {
      // ★ 正解したときだけ、次の行へ進む
      nextState.score += 1;

      if (state.qIndex < items.length - 1) {
        nextState.qIndex = state.qIndex + 1;
      }

      new Audio("/sfx/pingpong.mp3").play();

      if (!isBoss) {
        // 通常マスの移動
        const nowNode = MAP[state.node];
        const next = (nowNode.next ?? [])[0];
        if (next) nextState.node = next;

        if (state.node === "treasure") {
          nextState.hasKey = true;
        }
      } else {
        // ボス戦：3 回当てたらゴール
        nextState.bossHits = Math.min(state.bossHits + 1, 3);
        if (nextState.bossHits >= 3) {
          nextState.node = "goal";
        }
      }
    }

    // gate → boss に行こうとして鍵がない場合 treasure に戻す
    if (nextState.node === "boss" && !nextState.hasKey) {
      nextState.node = "treasure";
    }

    setState(nextState);

    // ===== 音声フィードバック =====
    if (nextState.node === "goal") {
      // クリア時は読み上げなし
      // 報酬カード設定
      const card = STAGE1_REWARDS[level] ?? STAGE1_REWARDS[1];
      setReward(card);
      return;
    }

    if (okLocal) {
      // ✅ 正解：次の問題を読み上げ
      const nextQ = questionFor(nextState);
      if (nextQ) {
        setTimeout(() => {
          speak(nextQ);
        }, 650);
      }
    } else {
      // ❌ 不正解：同じ問題に留まり、「Try again. Bowling?」のように発話
      const retryQ = questionFor(state); // state.qIndex は進んでいない
      await speak(`Try again. ${retryQ}`);
    }
  }

  /* 🎴 報酬カード表示時、自動スクロール */
  useEffect(() => {
    if (reward && rewardRef.current) {
      rewardRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [reward]);

  /* ===== マーカー ===== */
  const M = MAP as Record<string, { pos?: { r: number; c: number } }>;
  const markers: Marker[] = [];
  if (M.treasure?.pos) markers.push({ type: "chest", pos: M.treasure.pos });
  if (M.gate?.pos) markers.push({ type: "gate", pos: M.gate.pos });
  if (M.boss?.pos) markers.push({ type: "boss", pos: M.boss.pos });
  if (M.goal?.pos) markers.push({ type: "goal", pos: M.goal.pos });

  // 宝箱マスだけ日本語メッセージに差し替え
  const promptText =
    state.node === "treasure" ? JP_TEXT.foundKey : node.prompt;

  /* ===== UI ===== */
  return (
    <div className="min-h-screen bg-[#fdf9ee]">
      <div className="max-w-6xl mx-auto p-4 scale-[1.02] md:scale-[1.06] origin-center">
        <div className="bg-white/90 border rounded-2xl shadow p-5 space-y-4">
          <h2 className="hud-title text-xl">
            🎮 PingPong English Quest — Level {level}
          </h2>

          <div className="flex items-center gap-6">
            <MapMini
              pos={node.pos}
              rows={6}
              cols={6}
              tile={34}
              scale={1.5}
              bouncing={isBoss}
              markers={markers}
              theme="sand"
            />

            <div className="text-sm">
              <div>
                <b>Stage:</b> {state.node}
              </div>
              <div>
                Key: {state.hasKey ? "🗝️" : "—"} / Score: {state.score}
              </div>
              <div>Boss: {state.bossHits} / 3</div>
            </div>

            {/* モンスター表示 */}
            <div className="flex items-center justify-end mt-2 mr-4">
              {imgErr ? (
                <div className="text-4xl" title={monsterLabel}>
                  {monsterEmoji}
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    marginRight: "16px",
                  }}
                >
                  {/* モンスター画像（大きく表示） */}
                  <div
                    style={{
                      position: "relative",
                      width: "160px",
                      height: "160px",
                    }}
                  >
                    <img
  src={monsterSrcs[0]}
  onError={() => setImgErr(true)}
  alt={monsterLabel}
  style={{
    width: "100%",
    height: "100%",
    objectFit: "contain",
    imageRendering: "pixelated",
  }}
/>
                  </div>

                  <p style={{ marginTop: "4px", fontSize: "12px", color: "#666" }}>
                    Monster: {monsterLabel}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 出題と答え */}
          <div className="p-3 rounded border">
            <div className="mb-1">🧭 {promptText}</div>
            <div className="text-gray-700 mb-1">
              <span className="text-xs text-slate-500 mr-2">Question:</span>
              <code className="bg-slate-100 px-1 rounded">
                {spokenQuestion || "—"}
              </code>
            </div>
            <div className="text-gray-700">
              <span className="text-xs text-slate-500 mr-2">
                📝 Say (Answer):
              </span>
              <code className="bg-slate-100 px-1 rounded">
                {expectedAnswer || "—"}
              </code>
            </div>
          </div>

          {/* ボタン & カウントダウン */}
          <div className="space-y-2">
            {isRec && countdown !== null && (
              <div className="text-2xl font-bold text-center text-orange-600">
                {countdown}
              </div>
            )}

            {!started ? (
              <button
                className="px-5 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
                onClick={startGame}
                disabled={!spokenQuestion}
              >
                🎮 ゲームスタート
              </button>
            ) : (
              <button
                className={
                  "px-5 py-3 rounded-lg font-semibold text-white transition " +
                  (isRec
                    ? "bg-red-600 animate-pulse cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700")
                }
                onClick={startRec}
                disabled={isRec || !expectedAnswer}
              >
                {isRec ? "● 録音中..." : "Talk"}
              </button>
            )}
          </div>

          {lastText && (
            <p className="text-sm text-gray-500 mt-1">
              You said: {lastText}
            </p>
          )}

          {audioUrl && <audio src={audioUrl} autoPlay controls />}

          {/* 報酬カード（クリア時） */}
          {reward && (
            <div
              ref={rewardRef}
              className="p-3 rounded bg-emerald-50 border mt-6"
            >
              <div className="font-semibold mb-2">
                🎉 クリア！ごほうびカード
              </div>
              <Image
                src={reward}
                alt="reward"
                width={224}
                height={128}
                className="rounded border mx-auto"
              />
              <div className="mt-2 flex flex-col sm:flex-row gap-2 justify-center">
                <a
                  href={reward}
                  download={reward.split("/").pop() || "reward.png"}
                  className="px-4 py-2 rounded bg-emerald-600 text-white inline-block text-center"
                >
                  カードをダウンロード
                </a>

                {level < 6 ? (
                  <a
                    href={`/pingpong-training/level/${level + 1}?mode=quest`}
                    className="px-4 py-2 rounded-xl border inline-block text-center"
                  >
                    次のレベルへ →
                  </a>
                ) : (
                  <a
                    href="/pingpong-training"
                    className="px-4 py-2 rounded-xl border inline-block text-center"
                  >
                    レベル選択に戻る
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
