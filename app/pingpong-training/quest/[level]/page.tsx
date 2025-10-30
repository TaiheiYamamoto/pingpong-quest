// app/pingpong-training/quest/[level]/page.tsx
import PingPongQuest, { type QA } from "../../../_components/pingpong/PingPongQuest";

const LEVEL_CSV: Record<string, string | undefined> = {
  "1": process.env.NEXT_PUBLIC_L1_CSV,
  "2": process.env.NEXT_PUBLIC_L2_CSV,
  "3": process.env.NEXT_PUBLIC_L3_CSV,
  "4": process.env.NEXT_PUBLIC_L4_CSV,
  "5": process.env.NEXT_PUBLIC_L5_CSV,
  "6": process.env.NEXT_PUBLIC_L6_CSV,
};

function parseCSV(csv: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i], next = csv[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { cell += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cell += ch; }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n") { row.push(cell); cell = ""; out.push(row.map(s => s.replace(/\r$/, ""))); row = []; }
      else { cell += ch; }
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); out.push(row); }
  return out;
}

async function fetchCSV(url?: string): Promise<QA[]> {
  if (!url) return [];
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  const rows = parseCSV(text);
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const qi = header.findIndex((c) => c === "question");
  const ai = header.findIndex((c) => c === "answer");
  return rows.slice(1)
    .filter((r) => r[qi] && r[ai])
    .map((r) => ({ question: r[qi].trim(), answer: r[ai].trim() }));
}

export default async function Page({ params }: { params: { level: string } }) {
  const levelNum = Number(params.level) || 1;
  const items = await fetchCSV(LEVEL_CSV[String(levelNum)]);
  return <PingPongQuest level={levelNum} items={items} />;
}
