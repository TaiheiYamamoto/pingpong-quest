// app/pingpong-training/level/[level]/page.tsx
import Trainer from "../../_components/Trainer";
import PingPongQuest from "../../_components/pingpong/PingPongQuest";

export type QA = { question: string; answer: string; qJa?: string; aJa?: string };

// ▼ Level別の問題数
const QUESTION_LIMIT: Record<number, number> = {
  1: 3,
  2: 5,
  3: 6,
  4: 8,
  5: 9,
  6: 10,
};

// ▼ 通常版の CSV URL
const LEVEL_CSV: Record<string, string | undefined> = {
  "1": process.env.NEXT_PUBLIC_L1_CSV,
  "2": process.env.NEXT_PUBLIC_L2_CSV,
  "3": process.env.NEXT_PUBLIC_L3_CSV,
  "4": process.env.NEXT_PUBLIC_L4_CSV,
  "5": process.env.NEXT_PUBLIC_L5_CSV,
  "6": process.env.NEXT_PUBLIC_L6_CSV,
};

/* --- simple CSV parser --- */
function parseCSV(csv: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    const next = csv[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") {
        row.push(cell);
        cell = "";
      } else if (ch === "\n") {
        row.push(cell);
        cell = "";
        out.push(row);
        row = [];
      } else {
        cell += ch;
      }
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    out.push(row);
  }
  return out;
}

function canon(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

async function fetchCSV(url?: string): Promise<QA[]> {
  if (!url) return [];
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  const rows = parseCSV(text);
  if (!rows.length) return [];

  const header = rows[0].map((h) => canon(h));
  const qi = header.findIndex((c) => c === "question" || c === "q");
  const ai = header.findIndex((c) => c === "answer" || c === "a");
  const qji = header.findIndex((c) => c === "q:ja" || c === "qja");
  const aji = header.findIndex((c) => c === "a:ja" || c === "aja");

  return rows.slice(1).map((r) => ({
    question: r[qi] ?? "",
    answer: r[ai] ?? "",
    qJa: qji >= 0 ? r[qji] : "",
    aJa: aji >= 0 ? r[aji] : "",
  }));
}

// ★ Next.js が期待している PageProps に合わせて、params/searchParams を Promise にする
type LevelPageProps = {
  params: Promise<{ level: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LevelPage({ params, searchParams }: LevelPageProps) {
  // Next.js から渡される params/searchParams を await でほどく
  const { level } = await params;
  const sp = await searchParams;

  const levelNum = Number(level) || 1;
  const mode = typeof sp.mode === "string" ? sp.mode : "quest";

  const url = LEVEL_CSV[level];
  const allItems = await fetchCSV(url);

  // Level ごとに問題数調整
  const limit = QUESTION_LIMIT[levelNum] ?? allItems.length;
  const items = allItems.slice(0, limit);

  /* ---- UI ---- */
  const ModeTabs = (
    <div className="mb-4 flex gap-2">
      <a
        href={`/pingpong-training/level/${levelNum}?mode=quest`}
        className={`px-3 py-1.5 rounded-xl border text-sm ${
          mode === "quest" ? "bg-black text-white" : ""
        }`}
      >
        🎮 Quest
      </a>
      <a
        href={`/pingpong-training/level/${levelNum}?mode=text`}
        className={`px-3 py-1.5 rounded-xl border text-sm ${
          mode !== "quest" ? "bg-black text-white" : ""
        }`}
      >
        📝 Training
      </a>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        PingPong English Quest — Level {levelNum}
      </h1>
      {ModeTabs}

      {mode === "quest" ? (
        <PingPongQuest level={levelNum} items={items} />
      ) : (
        <Trainer level={levelNum} items={items} />
      )}
    </div>
  );
}
