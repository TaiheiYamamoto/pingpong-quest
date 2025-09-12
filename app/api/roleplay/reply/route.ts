import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CEFR = "A1"|"A2"|"B1"|"B2"|"C1"|"C2";
type Turn = { speaker: "ai" | "user"; text: string };

export async function POST(req: NextRequest) {
  const { scene, level, history, user } = (await req.json()) as {
    scene: string;
    level: CEFR;
    history: Turn[];
    user: string;
  };

  const system =
    "You are a helpful dialogue partner for Japanese service staff. Reply in SHORT, clear English appropriate to the level. Be kind and natural. Output ONLY the assistant's reply sentence(s).";

  const msgs = [
    { role: "system" as const, content: system },
    {
      role: "user" as const,
      content:
        `Scene: ${scene}\nLevel: ${level}\n` +
        `History:\n` +
        history.map((t) => `${t.speaker === "ai" ? "Assistant" : "User"}: ${t.text}`).join("\n") +
        `\nUser: ${user}\nAssistant:`,
    },
  ];

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "gpt-4o-mini", temperature: 0.4, messages: msgs }),
  });

  if (!r.ok) return new Response(JSON.stringify({ error: await r.text() }), { status: 500 });

  const data = await r.json();
  const reply = (data?.choices?.[0]?.message?.content as string)?.trim();

  // 2〜3往復で終えたいので、ヒストリの AI 発話が 3 回に到達したら done
  const aiTurns = history.filter((h) => h.speaker === "ai").length + 1;
  const done = aiTurns >= 3;

  return Response.json({ reply, done });
}
