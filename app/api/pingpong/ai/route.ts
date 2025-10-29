// app/api/pingpong/ai/route.ts
import OpenAI from "openai";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // ★ okHint を受け取る
    const { userText, state, currentQuiz, okHint } = await req.json();

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const system = `You are a friendly English game master.
Write short, encouraging feedback in Japanese, and a short English reply for TTS (<=8 words).
Return JSON only with keys: feedback (JP short), speech (EN short).`;

    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          // ★ okHint が undefined でも動くように fallback
          content: `Quiz: ${currentQuiz ?? "-"}
User: ${userText ?? "-"}
LocalOK: ${okHint === undefined ? "unknown" : okHint}
State: ${JSON.stringify(state ?? {})}`
        }
      ],
      response_format: { type: "json_object" }
    });

    // 念のため安全にパース
    let payload: any = {};
    try {
      payload = JSON.parse(r.choices[0]?.message?.content ?? "{}");
    } catch {}

    const feedback = typeof payload.feedback === "string" ? payload.feedback : (okHint ? "よくできたよ！" : "もういちど言ってみよう。");
    const speech   = typeof payload.speech === "string"   ? payload.speech   : (okHint ? "Great job!" : "Try again!");

    return Response.json({ feedback, speech });
  } catch (e) {
    console.error("AI route error", e);
    return new Response("AI failed", { status: 500 });
  }
}
