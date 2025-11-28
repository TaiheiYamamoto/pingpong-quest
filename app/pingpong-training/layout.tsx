// app/pingpong-training/layout.tsx
"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

const LEVELS = [1, 2, 3, 4, 5, 6];

export default function PingPongTrainingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isBusiness = pathname?.startsWith("/pingpong-training/for-business");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="text-lg font-semibold">PingPong Training</div>

          {/* ★ ビジネス版のときはレベルボタンを非表示 */}
          {!isBusiness && (
            <nav className="flex gap-2">
              {LEVELS.map((lv) => (
                <a
                  key={lv}
                  href={`/pingpong-training/level/${lv}?mode=quest`}
                  className="px-3 py-1.5 rounded-full border text-sm bg-white hover:bg-black hover:text-white transition"
                >
                  Level {lv}
                </a>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">{children}</main>
    </div>
  );
}
