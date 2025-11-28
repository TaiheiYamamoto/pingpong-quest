// app/pingpong-training/for-business/level/[level]/page.tsx
import PingPongQuest, { QA } from "../../../_components/pingpong/PingPongQuest";

// ★ Next.js 側の PageProps に合わせて params を Promise にする
type BusinessLevelPageProps = {
  params: Promise<{ level: string }>;
};

// レベルごとに env から URL を取る
function getBusinessCsvUrl(level: number): string | undefined {
  const map: Record<number, string | undefined> = {
    1: process.env.NEXT_PUBLIC_BIZ_L1_CSV,
    2: process.env.NEXT_PUBLIC_BIZ_L2_CSV,
    3: process.env.NEXT_PUBLIC_BIZ_L3_CSV,
    4: process.env.NEXT_PUBLIC_BIZ_L4_CSV,
    5: process.env.NEXT_PUBLIC_BIZ_L5_CSV,
    6: process.env.NEXT_PUBLIC_BIZ_L6_CSV,
  };
  return map[level];
}

// ---- CSV パース（普通版と同じフォーマット前提） ----
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result.map((v) => v.trim());
}

function csvToQA(text: string): QA[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length <= 1) return [];

  const dataLines = lines.slice(1); // 1行目はヘッダー

  return dataLines.map((line) => {
    const [q, a, qJa, aJa] = parseCsvLine(line);
    return {
      question: q ?? "",
      answer: a ?? "",
      qJa: qJa || undefined,
      aJa: aJa || undefined,
    };
  });
}

async function fetchBusinessItems(level: number): Promise<QA[]> {
  const url = getBusinessCsvUrl(level);
  if (!url) {
    console.error("Business CSV URL not found for level", level);
    return [];
  }

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    console.error("Failed to fetch business CSV", res.status);
    return [];
  }

  const text = await res.text();
  return csvToQA(text);
}

export default async function ForBusinessLevelPage({
  params,
}: BusinessLevelPageProps) {
  // ★ Next.js が実際に渡す params: Promise<{ level: string }>
  const { level } = await params;
  const levelNum = Number(level) || 1;

  const items = await fetchBusinessItems(levelNum);

  return (
    <div className="min-h-screen bg-[#fdf9ee]">
      <div className="max-w-6xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">
          🏢 PingPong English Quest for Business — Level {levelNum}
        </h1>

        {items.length === 0 ? (
          <p className="text-sm text-red-600">
            このレベルのビジネス用問題を読み込めませんでした
            （env の URL か、シート公開設定を確認してください）。
          </p>
        ) : (
          <PingPongQuest level={levelNum} items={items} />
        )}
      </div>
    </div>
  );
}
