// app/pingpong-training/for-business/layout.tsx
import type { ReactNode } from "react";

const LEVELS = [1, 2, 3, 4, 5, 6];

export default function ForBusinessLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="text-lg font-semibold">
            PingPong Training <span className="text-xs text-gray-500 ml-2">for Business</span>
          </div>

          {/* ★ ここがレベル切り替えナビ */}
          <nav className="flex gap-2">
            {LEVELS.map((lv) => (
              <a
                key={lv}
                href={`/pingpong-training/for-business/level/${lv}?mode=quest`}
                className="px-3 py-1.5 rounded-full border text-sm bg-white hover:bg-black hover:text-white transition"
              >
                Level {lv}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">{children}</main>
    </div>
  );
}
