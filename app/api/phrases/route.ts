// app/api/phrases/route.ts
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CEFR = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
type Genre = "restaurant" | "hotel" | "retail" | "guide";

export async function POST(req: NextRequest) {
  try {
    const { genre, level, count = 10 } = (await req.json()) as {
      genre: Genre;
      level: CEFR;
      count?: number;
    };

    const system =
      "You are an expert English tutor for Japanese service scenarios. " +
      "Generate useful, natural EN-JA phrase pairs appropriate to the CEFR level and scenario. " +
      "Return ONLY JSON: {\"phrases\":[{\"en\":\"...\",\"ja\":\"...\"}, ...]}";

    const scenarioHint: Record<Genre, string> = {
      restaurant:
        "Role: restaurant staff. Topics: menu guidance, taking orders, recommendations, allergy checks, payment, polite service.",
      hotel:
        "Role: hotel front/concierge. Topics: reservations, check-in/out, room service, amenities guidance, transport/taxi.",
      retail:
        "Role: shop clerk. Topics: greeting, size/color, fitting room, checkout, receipts, exchanges, bags.",
      guide:
        "Role: guide or hospitality staff. Topics: directions, landmarks, transportation, tickets, safety, recommendations.",
    };

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.4,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content:
              `Scenario: ${genre}\n` +
              `${scenarioHint[genre]}\n` +
              `CEFR level: ${level}\n` +
              `Number of pairs: ${count}\n` +
              "Rules: simple, concise, frontline-usable. EN in natural register; JA is自然で丁寧. Avoid duplicates. No numbering.",
          },
        ],
      }),
    });

    if (!r.ok) {
      const err = await r.text();
      return new Response(JSON.stringify({ error: err || "openai_error" }), { status: 500 });
    }

    const data = await r.json();
    const raw = (data?.choices?.[0]?.message?.content as string) ?? "{}";

    let json: { phrases?: Array<{ en: string; ja: string }> } = {};
    try {
      json = JSON.parse(raw) as { phrases?: Array<{ en: string; ja: string }> };
    } catch {
      const m = raw.match(/\{[\s\S]*\}$/);
      if (m) json = JSON.parse(m[0]) as { phrases?: Array<{ en: string; ja: string }> };
    }

    // 最低限のバリデーション
    const safe =
      Array.isArray(json.phrases) &&
      json.phrases
        .slice(0, count)
        .every(
          (p) =>
            p &&
            typeof p.en === "string" &&
            p.en.trim() !== "" &&
            typeof p.ja === "string" &&
            p.ja.trim() !== "",
        );

    if (!safe) return new Response(JSON.stringify({ error: "invalid_response" }), { status: 500 });

    return new Response(JSON.stringify({ phrases: json.phrases!.slice(0, count) }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "bad_request" }), { status: 400 });
  }
}
