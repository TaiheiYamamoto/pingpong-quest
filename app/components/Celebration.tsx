"use client";
import React, { useEffect } from "react";

export default function Celebration({
  show,
  autoHideMs = 2000,
  onClose,
}: {
  show: boolean;
  autoHideMs?: number;
  onClose?: () => void;
}) {
  useEffect(() => {
    if (!show || !onClose) return;
    const t = setTimeout(onClose, autoHideMs);
    return () => clearTimeout(t);
  }, [show, autoHideMs, onClose]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-sm" />
      <div className="relative">
        <div className="text-3xl font-bold bg-white/90 rounded-2xl px-6 py-4 shadow">
          Great job! 🎉
        </div>
      </div>
    </div>
  );
}
