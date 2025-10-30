// app/pingpong-training/level/[level]/page.tsx
import Trainer from "../../_components/Trainer";
import PingPongQuest from "@/pingpong-training/_components/pingpong/PingPongQuest";

type QA = { question: string; answer: string };

const LEVEL_CSV: Record<string, string | undefined> = {
  "1": process.env.NEXT_PUBLIC_L1_CSV,
  "2": process.env.NEXT_PUBLIC_L2_CSV,
  "3": process.env.NEXT_PUBLIC_L3_CSV,
  "4": process.env.NEXT_PUBLIC_L4_CSV,
  "5": process.env.NEXT_PUBLIC_L5_CSV,
  "6": process.env.NEXT_PUBLIC_L6_CSV,
};

// シンプルCSVパーサ（ダブルクオート対応）
function parseCSV(csv: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    const next = csv[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') { cell += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cell += ch; }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n") { row.push(cell); cell = ""; out.push(row.map(s=>s.replace(/\r$/,""))); row = []; }
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
  return rows.slice(1).filter(r => r[qi] && r[ai]).map(r => ({
    question: r[qi].trim(),
    answer: r[ai].trim(),
  }));
}

export default async function LevelPage({
  params,
  searchParams,
}: {
  params: Promise<{ level: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next 15: params / searchParams は Promise
  const { level } = await params;
  const sp = await searchParams;
  const mode = typeof sp.mode === "string" ? sp.mode : "text"; // "text" | "quest"

  const url = LEVEL_CSV[level];
  const items = await fetchCSV(url);
  const levelNum = Number(level) || 1;

  // モード切替 UI（クエリを付けてリンク）
  const ModeTabs = (
    <div className="mb-4 flex gap-2">
      <a
        href={`/pingpong-training/level/${levelNum}?mode=text`}
        className={`px-3 py-1.5 rounded-xl border text-sm ${mode !== "quest" ? "bg-black text-white" : ""}`}
      >
        📝 Text
      </a>
      <a
        href={`/pingpong-training/level/${levelNum}?mode=quest`}
        className={`px-3 py-1.5 rounded-xl border text-sm ${mode === "quest" ? "bg-black text-white" : ""}`}
      >
        🎮 Quest
      </a>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Level {levelNum}</h1>
      {ModeTabs}
      {mode === "quest" ? (
        <PingPongQuest level={levelNum} items={items} />
      ) : (
        <Trainer level={levelNum} items={items} />
      )}
    </div>
  );
}
