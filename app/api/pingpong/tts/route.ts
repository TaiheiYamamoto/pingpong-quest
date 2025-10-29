export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  try {
    const { text } = (await req.json()) as { text?: string };
    const inputText = text?.trim() || "Hello!";

    // OpenAI TTS REST エンドポイント（SDK型に依存しない）
    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "alloy",
        input: inputText,
        // format は指定しない（型差異回避）。デフォルト mp3 相当で返る。
      }),
    });

    if (!r.ok) {
      const errTxt = await r.text();
      return new Response(JSON.stringify({ error: errTxt }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const ab = await r.arrayBuffer();
    return new Response(ab, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "TTS error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
