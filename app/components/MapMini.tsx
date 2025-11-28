"use client";

import { useMemo, useState } from "react";

/* ===== Types (export して他ファイルから再利用) ===== */
export type Pos = { r: number; c: number }; // 1 始まり
export type MarkerType = "chest" | "gate" | "boss" | "goal";
export type Marker = { type: MarkerType; pos: Pos };

export type MapMiniProps = {
  pos: Pos;
  rows?: number;
  cols?: number;
  tile?: number;
  scale?: number;
  bouncing?: boolean;
  markers?: Marker[];
  theme?: "sand" | "grass" | "stone";
  caseFallback?: boolean;
  className?: string;
  mapImage?: string;
};

export default function MapMini({
  pos,
  rows = 6,
  cols = 6,
  tile = 34,
  scale = 1.25,
  bouncing = false,
  markers = [],
  theme = "sand",
  caseFallback = true,
  className = "",
  mapImage,
}: MapMiniProps) {
  const W = cols * tile * scale;
  const H = rows * tile * scale;

  const [pinErr, setPinErr] = useState(false);
  const [markerErr, setMarkerErr] = useState<Record<string, boolean>>({});

  const bgUrl = useMemo(() => {
    const low = `/tiles/${theme}.png`;
    const up = `/Tiles/${theme}.png`;
    return caseFallback ? `url(${low}), url(${up})` : `url(${low})`;
  }, [theme, caseFallback]);

  const markerSrcs: Record<MarkerType, string[]> = useMemo(
    () => ({
      chest: ["/tiles/chest.png", "/Tiles/chest.png"],
      gate: ["/tiles/gate.png", "/Tiles/gate.png"],
      boss: ["/tiles/boss.png", "/Tiles/boss.png"],
      goal: ["/tiles/goal.png", "/Tiles/goal.png"],
    }),
    []
  );

  const pinSrcs = useMemo(
    () => ["/tiles/hero.png", "/Tiles/hero.png"],
    []
  );

  const toXY = (p: Pos) => ({
    left: (p.c - 1) * tile * scale,
    top: (p.r - 1) * tile * scale,
    width: tile * scale,
    height: tile * scale,
  });

  // ★ 勇者アイコンをさらに大きく
  const pinSize = Math.max(24, tile * scale * 0.9);
  const pinOffset = pinSize / 2;

  return (
    <div
      className={`relative rounded-2xl border overflow-hidden ${className}`}
      style={{ width: W, height: H }}
    >
      {/* 背景：mapImage があればそれ、無ければタイルをリピート */}
      <div
        className="absolute inset-0"
        style={
          mapImage
            ? {
                backgroundImage: `url(${mapImage})`,
                backgroundRepeat: "no-repeat",
                backgroundSize: "cover",
              }
            : {
                backgroundImage: bgUrl,
                backgroundRepeat: "repeat",
                backgroundSize: `${tile * scale}px ${tile * scale}px`,
              }
        }
      />

      {/* グリッド */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            `linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px),
             linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)`,
          backgroundSize: `${tile * scale}px ${tile * scale}px`,
        }}
      />

      {/* マーカー（宝箱/ゲート/ボス/ゴール） */}
      {markers.map((m, i) => {
        const key = `${m.type}-${m.pos.r}-${m.pos.c}-${i}`;
        const fallbackUsed = markerErr[key] ?? false;
        const srcArr = markerSrcs[m.type];
        const src = caseFallback ? (fallbackUsed ? srcArr[1] : srcArr[0]) : srcArr[0];

        return (
          <img
            key={key}
            src={src}
            alt={m.type}
            onError={(e) => {
              if (!caseFallback) return;
              setMarkerErr((prev) => {
                const nextUsed = !prev[key];
                const arr = markerSrcs[m.type];
                e.currentTarget.src = nextUsed ? arr[1] : arr[0];
                return { ...prev, [key]: nextUsed };
              });
            }}
            style={{
              position: "absolute",
              ...toXY(m.pos),
              imageRendering: "pixelated",
              objectFit: "contain",
              padding: Math.max(2, tile * scale * 0.08),
            }}
          />
        );
      })}

      {/* ピン（勇者アイコン or 丸） */}
      {pinErr ? (
        <div
          className={`absolute rounded-full bg-emerald-700/85 ${
            bouncing ? "animate-bounce" : ""
          }`}
          style={{
            width: Math.max(8, tile * scale * 0.28),
            height: Math.max(8, tile * scale * 0.28),
            left: (pos.c - 0.5) * tile * scale - tile * scale * 0.14,
            top: (pos.r - 0.5) * tile * scale - tile * scale * 0.14,
            boxShadow: "0 2px 6px rgba(0,0,0,.25)",
          }}
          title="you"
        />
      ) : (
        <img
          src={caseFallback ? pinSrcs[0] : "/tiles/hero.png"}
          alt="hero"
          onError={(e) => {
            if (caseFallback && e.currentTarget.src.endsWith(pinSrcs[0])) {
              e.currentTarget.src = pinSrcs[1];
            } else {
              setPinErr(true);
            }
          }}
          className={bouncing ? "animate-bounce" : ""}
          style={{
            position: "absolute",
            width: pinSize,
            height: pinSize,
            left: (pos.c - 0.5) * tile * scale - pinOffset,
            top: (pos.r - 0.5) * tile * scale - pinOffset,
            imageRendering: "pixelated",
            objectFit: "contain",
          }}
        />
      )}
    </div>
  );
}
