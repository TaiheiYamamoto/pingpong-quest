export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/** クライアントから来る body の型 */
type GameState = {
  node: "start" | "fork1L" | "fork1R" | "treasure" | "gate" | "boss" | "goal";
  hasKey: boolean;
  score: number;
  bossHits: number;
};

type AiBody = {
  userText: string;
  state: GameState;
  currentQuiz?: string;
  okHint?: boolean;
};

type AiJson = { speech?: string; feedback?: string };

export async function POST(req: Request): Promise<Response> {
  try {
    const body: AiBody = await req.json();

    const system =
      'You are a concise English coach for A2/B1 learners. ' +
      'Return JSON only: {"speech": string, "feedback": string}. ' +
      "Keep sentences short and friendly.";

    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content:
            `Quiz: ${body.currentQuiz ?? ""}\n` +
            `User: ${body.userText}\n` +
            `OK: ${String(body.okHint ?? false)}`,
        },
      ],
    });

    const content: string = r.choices[0]?.message?.content ?? "{}";

    let parsed: AiJson;
    try {
      parsed = JSON.parse(content) as AiJson;
    } catch {
      parsed = { speech: "Okay.", feedback: "Good try!" };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return new Response(JSON.stringify({ speech: "Sorry.", feedback: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
