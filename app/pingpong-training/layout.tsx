// app/pingpong-training/layout.tsx
import React from "react";
import Link from "next/link";

export default function Layout({ children }: { children: React.ReactNode }) {
  const tabs = [1, 2, 3, 4, 5, 6];
  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <Link href="/pingpong-training" className="font-bold text-lg">PingPong Training</Link>
          <nav className="flex gap-2">
            {tabs.map((lvl) => (
              <Link
                key={lvl}
                href={`/pingpong-training/level/${lvl}`}
                className="px-3 py-1.5 rounded-xl border hover:bg-slate-100 text-sm"
              >
                Level {lvl}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
