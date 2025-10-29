"use client";
import Image from "next/image";

type Pos = { r: number; c: number };
type MapMiniProps = { pos: Pos };

const ROWS = 6;
const COLS = 6;

export default function MapMini({ pos }: MapMiniProps) {
  const r = Math.max(0, Math.min(ROWS - 1, pos.r));
  const c = Math.max(0, Math.min(COLS - 1, pos.c));

  return (
    <div className="inline-block">
      <div
        className="grid gap-[2px] p-2 rounded-lg border bg-[#e8dcb9]"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 16px)`,
          gridTemplateRows: `repeat(${ROWS}, 16px)`,
        }}
        aria-label="mini map"
      >
        {Array.from({ length: ROWS * COLS }, (_, i) => {
          const rr = Math.floor(i / COLS);
          const cc = i % COLS;
          const isPin = rr === r && cc === c;
          return (
            <div
              key={`${rr}-${cc}`}
              className={`w-4 h-4 rounded-sm border ${
                isPin ? "bg-amber-300" : "bg-[#f5e8c7]"
              }`}
            />
          );
        })}
      </div>

      {/* ピン画像（任意）: public/pin.png があれば重ねて表示 */}
      <div className="relative -mt-5 ml-2 h-0 w-0">
        <Image
          src="/pin.png"
          alt="pin"
          width={18}
          height={18}
          className="drop-shadow"
          priority
        />
      </div>
    </div>
  );
}
