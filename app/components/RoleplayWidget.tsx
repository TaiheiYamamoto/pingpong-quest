// app/components/RoleplayWidget.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useToast } from "./Toast";

type CEFR = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export default function RoleplayWidget({
  scene,
  level,
}: {
  scene: string;
  level: CEFR;
}) {
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [userText, setUserText] = useState("");
  const [reply, setReply] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [tips, setTips] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { push } = useToast();

  useEffect(() => () => rec?.stop(), [rec]);

  function pickMime(): string | undefined {
    const c1 = "audio/webm;codecs=opus";
    const c2 = "audio/webm";
    if (typeof MediaRecorder === "undefined") return undefined;
    if (MediaRecorder.isTypeSupported?.(c1)) return c1;
    if (MediaRecorder.isTypeSupported?.(c2)) return c2;
    return undefined;
  }

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMime();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => e.data && chunks.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
        await handleBlob(blob);
      };
      mr.start();
      setRec(mr);
      setRecording(true);
      setUserText("");
      setReply("");
      setScore(null);
      setTips([]);
    } catch {
      push({ kind: "error", title: "マイク権限が必要です", message: "ブラウザの設定をご確認ください。" });
    }
  }

  function stop() {
    rec?.stop();
    setRecording(false);
  }

  async function handleBlob(blob: Blob) {
    try {
      // 1) 文字起こし
      const fd = new FormData();
      fd.append("audio", blob, "input.webm");
      const stt = await fetch("/api/stt", { method: "POST", body: fd });
      if (!stt.ok) throw new Error(await stt.text());
      const { text } = (await stt.json()) as { text: string };
      setUserText(text);

      // 2) ロールプレイ応答
      const rp = await fetch("/api/roleplay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene, userUtterance: text, level }),
      });
      if (!rp.ok) throw new Error(await rp.text());
      const data = (await rp.json()) as { reply: string; score: number; tips: string[] };
      setReply(data.reply);
      setScore(data.score);
      setTips(data.tips);

      // 3) TTS
      const tts = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: data.reply }),
      });
      if (!tts.ok) throw new Error(await tts.text());
      const buf = await tts.arrayBuffer();
      const url = URL.createObjectURL(new Blob([buf], { type: "audio/mpeg" }));
      if (audioRef.current) {
        audioRef.current.src = url;
        await audioRef.current.play().catch(() => void 0);
      }
    } catch {
      push({ kind: "error", title: "ロールプレイに失敗", message: "ネットワークまたはAPI設定をご確認ください。" });
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-6">
      <div className="text-sm text-gray-500">ロールプレイ（{scene}）</div>
      <div className="mt-3 flex items-center gap-3">
        {!recording ? (
          <button onClick={start} className="rounded-lg bg-black px-4 py-2 text-white text-sm">
            🎙️ 録音開始
          </button>
        ) : (
          <button onClick={stop} className="rounded-lg bg-red-600 px-4 py-2 text-white text-sm">
            ⏹ 停止して送信
          </button>
        )}
        <audio ref={audioRef} className="ml-auto" controls />
      </div>

      {userText && (
        <div className="mt-4 text-sm">
          <div className="text-gray-500">あなた：</div>
          <div className="mt-1 rounded-lg border bg-gray-50 p-3">{userText}</div>
        </div>
      )}

      {reply && (
        <div className="mt-4 text-sm">
          <div className="text-gray-500">AI：</div>
          <div className="mt-1 rounded-lg border bg-white p-3">{reply}</div>
        </div>
      )}

      {score !== null && (
        <div className="mt-3 text-sm">
          <div className="font-semibold">スコア：{score}/100</div>
          {tips.length > 0 && (
            <ul className="ml-4 list-disc text-gray-700">
              {tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
