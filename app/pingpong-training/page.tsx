// app/pingpong-training/page.tsx
export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">PingPong Training Hub</h1>
      <div className="grid gap-3 md:grid-cols-2">
        <a href="/pingpong-training/level/1" className="rounded-xl border p-4 hover:bg-slate-50">
          📝 Text Trainer (You→I) — Level 1
        </a>
        <a href="/pingpong-training/quest/1" className="rounded-xl border p-4 hover:bg-slate-50">
          🎮 Quest Mode (Map + TTS/STT) — Level 1
        </a>
      </div>
    </div>
  );
}
