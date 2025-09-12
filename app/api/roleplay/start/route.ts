import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CEFR = "A1"|"A2"|"B1"|"B2"|"C1"|"C2";

export async function POST(req: NextRequest) {
  const { scene, level } = (await req.json()) as { scene: string; level: CEFR };

  const system =
    "You are a polite foreign customer speaking simple, natural English. Ask ONE clear opening question for the given scene and level. Output only the question text.";

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `Scene: ${scene}\nLearner level: ${level}\nLanguage: English`,
        },
      ],
    }),
  });

  if (!r.ok) return new Response(JSON.stringify({ error: await r.text() }), { status: 500 });

  const data = await r.json();
  const question = (data?.choices?.[0]?.message?.content as string)?.trim();
  return Response.json({ question });
}
