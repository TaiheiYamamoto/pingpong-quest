// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { ToastProvider } from "./components/Toast"; // これを使います
import "./globals.css";
import { Press_Start_2P, Noto_Sans_JP } from "next/font/google";
import type { ReactNode } from "react";

const pixel = Press_Start_2P({ weight: "400", subsets: ["latin"], variable: "--font-pixel" });
const jp = Noto_Sans_JP({ weight: ["400","700"], subsets: ["latin"], variable: "--font-jp" });

export const metadata: Metadata = {
  title: "AtoZ English",
  description: "最速で使える英語を。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${pixel.variable} ${jp.variable} font-sans`}>
        {/* これが無いと中身が出ません */}
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
