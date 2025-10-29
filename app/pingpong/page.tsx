// app/pingpong/page.tsx
import Link from "next/link";
import PingPongGame from "../components/PingPongGame";

export default function PingPongPage() {
  return (
    <main className="max-w-2xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">PingPong English Demo</h1>
      <p className="mb-4">
        <Link href="/" className="underline text-blue-600">← Back to Home</Link>
      </p>
      <PingPongGame />
    </main>
  );
}
