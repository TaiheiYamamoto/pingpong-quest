// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { ToastProvider } from "./components/Toast"; // これを使います

export const metadata: Metadata = {
  title: "AtoZ English",
  description: "最速で使える英語を。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        {/* ← これが無いと中身が出ません */}
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
