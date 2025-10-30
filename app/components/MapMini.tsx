"use client";

import { useState } from "react";

type Pos = { r: number; c: number };
type MarkerType = "chest" | "gate" | "boss" | "goal";

export default function MapMini({
  pos,
  rows = 6,
  cols = 6,
  tile = 34,
  scale = 1.25,
  bouncing = false,
  markers = [],
}: {
  pos: Pos;                     // 現在地（1始まり）
  rows?: number;
  cols?: number;
  tile?: number;                // 1マスのピクセル基準
  scale?: number;               // 拡大率
  bouncing?: boolean;           // ボス時のピン演出
  markers?: Array<{ type: MarkerType; pos: Pos }>;
}) {
  const W = cols * tile * scale;
  const H = rows * tile * scale;

  // 画像の有無でフォールバック
  const [pinErr, setPinErr] = useState(false);

  // マーカー種別 → 画像パス
  const markerImg: Record<MarkerType, string> = {
    chest: "/tiles/chest.png",
    gate: "/tiles/gate.png",
    boss: "/tiles/boss.png",
    goal: "/tiles/goal.png",
  };

  // 絶対配置のヘルパ
  const toXY = (p: Pos) => ({
    left: (p.c - 1) * tile * scale,
    top: (p.r - 1) * tile * scale,
    width: tile * scale,
    height: tile * scale,
  });

  return (
    <div
      className="relative rounded-2xl border overflow-hidden"
      style={{ width: W, height: H }}
    >
      {/* 砂タイル：画像をリピート */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(/tiles/sand.png)`,
          backgroundRepeat: "repeat",
          backgroundSize: `${tile * scale}px ${tile * scale}px`,
        }}
      />

      {/* 格子（薄い線） */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)`,
          backgroundSize: `${tile * scale}px ${tile * scale}px`,
        }}
      />

      {/* マーカー（宝箱/ゲート/ボス/ゴール） */}
      {markers.map((m, i) => (
        <img
          key={`${m.type}-${i}`}
          src={markerImg[m.type]}
          alt={m.type}
          style={{
            position: "absolute",
            ...toXY(m.pos),
            imageRendering: "pixelated",
            objectFit: "contain",
            padding: Math.max(2, (tile * scale) * 0.08),
          }}
        />
      ))}

      {/* ピン（/tiles/pin.png があればそれ、無ければ丸） */}
      {pinErr ? (
        <div
          className={`absolute rounded-full bg-emerald-700/85 ${bouncing ? "animate-bounce" : ""}`}
          style={{
            width: Math.max(8, tile * scale * 0.28),
            height: Math.max(8, tile * scale * 0.28),
            left: (pos.c - 0.5) * tile * scale - (tile * scale * 0.14),
            top: (pos.r - 0.5) * tile * scale - (tile * scale * 0.14),
            boxShadow: "0 2px 6px rgba(0,0,0,.25)",
          }}
          title="you"
        />
      ) : (
        <img
          src="/tiles/pin.png"
          alt="pin"
          onError={() => setPinErr(true)}
          className={bouncing ? "animate-bounce" : ""}
          style={{
            position: "absolute",
            width: Math.max(16, tile * scale * 0.6),
            height: Math.max(16, tile * scale * 0.6),
            left: (pos.c - 0.5) * tile * scale - (Math.max(16, tile * scale * 0.6) / 2),
            top: (pos.r - 0.5) * tile * scale - (Math.max(16, tile * scale * 0.6) / 2),
            imageRendering: "pixelated",
            objectFit: "contain",
          }}
        />
      )}
    </div>
  );
}
