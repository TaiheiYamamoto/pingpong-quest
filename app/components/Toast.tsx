"use client";
import React, { createContext, useContext, useMemo, useState } from "react";

type ToastKind = "info" | "success" | "error";
type Toast = { id: string; title: string; message?: string; kind: ToastKind; until: number };

type Ctx = { push: (t: Omit<Toast, "id" | "until"> & { ttlMs?: number }) => void };
const ToastCtx = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push: Ctx["push"] = ({ title, message, kind, ttlMs = 4000 }) => {
    const id = crypto.randomUUID();
    setToasts((arr) => [...arr, { id, title, message, kind, until: Date.now() + ttlMs }]);
    setTimeout(() => setToasts((arr) => arr.filter((t) => t.id !== id)), ttlMs + 50);
  };
  const value = useMemo(() => ({ push }), []);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[1000] flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-xl border px-4 py-3 shadow ${
              t.kind === "error"
                ? "border-red-300 bg-red-50 text-red-800"
                : t.kind === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-gray-300 bg-white text-gray-800"
            }`}
          >
            <div className="text-sm font-semibold">{t.title}</div>
            {t.message && <div className="mt-0.5 text-xs opacity-80">{t.message}</div>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider/>");
  return ctx;
}
