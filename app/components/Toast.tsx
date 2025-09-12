"use client";

import React from "react";

type Toast = { id: number; kind: "success" | "error" | "info"; title: string; message?: string };

const ToastCtx = React.createContext<{ push: (t: Omit<Toast, "id">) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = React.useState<Toast[]>([]);
  const push = (t: Omit<Toast, "id">) =>
    setList((L) => [...L, { id: Date.now() + Math.random(), ...t }]);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      {/* UI */}
      <div className="fixed top-3 right-3 z-50 space-y-2">
        {list.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg border px-4 py-3 text-sm shadow ${
              t.kind === "success"
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : t.kind === "error"
                ? "bg-rose-50 border-rose-300 text-rose-900"
                : "bg-sky-50 border-sky-300 text-sky-900"
            }`}
          >
            <div className="font-semibold">{t.title}</div>
            {t.message && <div className="mt-0.5 text-xs opacity-90">{t.message}</div>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used under <ToastProvider>");
  return ctx;
}
