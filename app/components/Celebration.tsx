"use client";
import React from "react";

export default function Celebration({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-sm" />
      <div className="relative">
        <div className="text-3xl font-bold bg-white/90 rounded-2xl px-6 py-4 shadow">
          Great job! 🎉
        </div>
        {/* confetti dots */}
        {[...Array(24)].map((_, i) => (
          <span
            key={i}
            className="absolute w-2 h-2 rounded-full animate-[pop_900ms_ease-out_forwards]"
            style={{
              left: 0, right: 0, top: 0, bottom: 0, margin: "auto",
              background:
                ["#ef4444","#f59e0b","#10b981","#3b82f6","#a855f7"][i % 5],
              transform: `translate(${Math.cos(i)*6}px, ${Math.sin(i)*6}px)`,
              animationDelay: `${i*25}ms`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes pop {
          0% { transform: translate(0,0) scale(0.5); opacity: 0.9; }
          100% { transform: translate(var(--tx, 0), var(--ty, 0)) scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
