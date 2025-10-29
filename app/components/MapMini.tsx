// app/components/MapMini.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Pos = { r: number; c: number };

// 必要なアセットのパス（public/ 直下なので / でOK）
const TILE_SRC = {
  sand: "/tiles/sand.png",
  path: "/tiles/path.png",
  chest: "/tiles/chest.png",
  gate: "/tiles/gate.png",
  boss: "/tiles/boss.png",
  pin: "/tiles/pin.png",
} as const;

// 変更後（readonlyを外しつつ、扱いやすいRecordに）
type ImgMap = Partial<Record<keyof typeof TILE_SRC, HTMLImageElement>>;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = async () => {
      try {
        // decode() があるブラウザではデコード完了まで待つ（描画の確実性UP）
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof (img as any).decode === "function") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (img as any).decode();
        }
      } catch {
        // Safari など decode 未対応は無視
      }
      resolve(img);
    };
    img.onerror = reject;
  });
}

export default function MapMini({ pos }: { pos: Pos }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imgs, setImgs] = useState<ImgMap>({});
  const [ready, setReady] = useState(false);

  // 7x7 の固定マップ（必要に応じて編集）
  const H = 7;
  const W = 7;
  const cell = 28; // CSS px（あとで DPR スケール）
  const pad = 6;

  const grid = useMemo(() => {
    // シンプルに砂地ベース、通路・宝箱・門・ボス配置（例）
    const base = Array.from({ length: H }, () => Array.from({ length: W }, () => "sand" as keyof typeof TILE_SRC));
    // 道
    for (let r = 1; r <= 4; r++) base[r][1] = "path";
    for (let c = 1; c <= 3; c++) base[4][c] = "path";
    // 宝箱・門・ボス（お好みで）
    base[4][4] = "chest";
    base[3][3] = "gate";
    base[5][3] = "boss";
    return base;
  }, []);

  // アセットのプリロード（初回のみ）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        Object.entries(TILE_SRC).map(async ([k, src]) => {
          const img = await loadImage(src);
          return [k, img] as const;
        })
      );
      if (!cancelled) {
        const map: ImgMap = {};
        entries.forEach(([k, img]) => (map[k as keyof typeof TILE_SRC] = img));
        setImgs(map);
        setReady(true);
      }
    })().catch(() => {
      // 読み込み失敗時は ready=false のまま（下でフォールバック描画）
      setReady(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 描画
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;

    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const width = pad * 2 + W * cell;
    const height = pad * 2 + H * cell;
    cvs.width = width * dpr;
    cvs.height = height * dpr;
    cvs.style.width = `${width}px`;
    cvs.style.height = `${height}px`;

    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // 背景
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#d4d4d4";
    ctx.lineWidth = 1;
    ctx.roundRect(0.5, 0.5, width - 1, height - 1, 8);
    ctx.stroke();

    // タイル描画
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const x = pad + c * cell;
        const y = pad + r * cell;

        if (ready && imgs.sand) {
          // まず砂地
          ctx.drawImage(imgs.sand as HTMLImageElement, x, y, cell, cell);

          // 上書きのタイルがあれば描画
          const kind = grid[r][c];
          if (kind !== "sand" && imgs[kind as keyof typeof TILE_SRC]) {
            ctx.drawImage(imgs[kind as keyof typeof TILE_SRC] as HTMLImageElement, x, y, cell, cell);
          }
        } else {
          // フォールバック（画像未ロード時）：薄い枠のセル
          ctx.fillStyle = r === pos.r && c === pos.c ? "#fde68a" : "#fafafa";
          ctx.fillRect(x, y, cell, cell);
          ctx.strokeStyle = "#e5e7eb";
          ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
        }
      }
    }

    // 現在位置ピン
    const px = pad + pos.c * cell + cell / 2;
    const py = pad + pos.r * cell + cell / 2;
    if (ready && imgs.pin) {
      ctx.drawImage(imgs.pin as HTMLImageElement, px - cell / 2, py - cell / 2, cell, cell);
    } else {
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [ready, imgs, pos, cell, pad, grid, H, W]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="mini map"
      className="rounded-lg border bg-white"
    />
  );
}
