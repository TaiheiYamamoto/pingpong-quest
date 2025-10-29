"use client";

type Tile = "sand" | "path" | "chest" | "gate" | "boss" | "goal";
type Cell = { t: Tile; label?: string };

const IMG: Record<Tile, string> = {
  sand: "/tiles/sand.png",
  path: "/tiles/path.png",
  chest: "/tiles/chest.png",
  gate: "/tiles/gate.png",
  boss: "/tiles/boss.png",
  goal: "/tiles/goal.png",
};

function TileCell({ cell, isHere }: { cell: Cell; isHere?: boolean }) {
  const bg = IMG[cell.t];
  return (
    <div
      className="relative w-10 h-10 md:w-12 md:h-12 border border-[#0001]"
      style={{
        backgroundImage: bg ? `url(${bg})` : undefined,
        backgroundSize: "cover",
        backgroundColor: bg ? undefined : cell.t === "path" ? "#d6b07a" : "#e9dcaa",
      }}
      title={cell.label}
    >
      {isHere && (
        <img
          src={"/tiles/pin.png"}
          alt="here"
          className="absolute -top-2 -left-2 w-5 h-5 md:w-6 md:h-6"
          onError={(e) => {
            // 画像が無いときは絵文字ピン
            (e.target as HTMLImageElement).style.display = "none";
            const p = document.createElement("div");
            p.textContent = "📍";
            p.style.position = "absolute";
            p.style.top = "-8px";
            p.style.left = "-8px";
            (e.currentTarget.parentElement as HTMLElement).appendChild(p);
          }}
        />
      )}
    </div>
  );
}

export default function MapMini({
  pos = { r: 0, c: 0 },          // ← デフォルトを設定
}: {
  pos?: { r: number; c: number };// ← optional に
}) {

  // 7x7 の簡易マップ（必要に応じて拡張）
  const G: Cell[][] = [
    // 0
    [
      { t: "sand" }, { t: "sand" }, { t: "sand" }, { t: "sand" }, { t: "sand" }, { t: "sand" }, { t: "sand" },
    ],
    // 1
    [
      { t: "sand" }, { t: "sand" }, { t: "path" }, { t: "path" }, { t: "path" }, { t: "sand" }, { t: "sand" },
    ],
    // 2
    [
      { t: "sand" }, { t: "sand" }, { t: "path" }, { t: "sand" }, { t: "path" }, { t: "sand" }, { t: "sand" },
    ],
    // 3
    [
      { t: "sand" }, { t: "path" }, { t: "path" }, { t: "gate", label: "Gate" }, { t: "path" }, { t: "chest", label: "Treasure" }, { t: "sand" },
    ],
    // 4
    [
      { t: "sand" }, { t: "sand" }, { t: "path" }, { t: "path" }, { t: "path" }, { t: "sand" }, { t: "sand" },
    ],
    // 5
    [
      { t: "sand" }, { t: "sand" }, { t: "sand" }, { t: "boss", label: "Boss" }, { t: "sand" }, { t: "sand" }, { t: "sand" },
    ],
    // 6
    [
      { t: "sand" }, { t: "sand" }, { t: "sand" }, { t: "goal", label: "Goal" }, { t: "sand" }, { t: "sand" }, { t: "sand" },
    ],
  ];

  return (
    <div className="inline-grid grid-cols-7 gap-px p-1 rounded bg-[#0002]">
      {G.map((row, r) =>
        row.map((cell, c) => (
          <TileCell key={`${r}-${c}`} cell={cell} isHere={!!pos && r === pos.r && c === pos.c} />
        ))
      )}
    </div>
  );
}
