"use client";

import React from "react";
import { useToast } from "./Toast";

/** ====== 型（このファイル内で完結） ====== */
type CEFR = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

type Demand = {
  profile: {
    ageRange: "10s" | "20s" | "30s" | "40s" | "50s+";
    gender: "male" | "female" | "other" | "prefer_not_to_say";
    role: string;
    industry: "food_service" | "hotel" | "retail" | "transport" | "other";
    useCase: "inbound_service" | "business" | "study_abroad" | "daily_life";
  };
  level: { selfReport: string; cefr: CEFR; knownIssues: string[] };
  constraints: { minutesPerDay: number; deadlineWeeks: number; scenes: string[] };
  prefs: { lang: "ja" | "en"; mode: "ai_only" | "ai_plus_coach" | "ai_plus_books" | "full_mix" };
};

type Step =
  | { step: "diagnostic_mini_test" }
  | { step: "listen_and_repeat" }
  | { step: "roleplay_ai"; scene: string }
  | { step: "feedback" };

type MicroLesson =
  | { type: "phrasepack"; title: string }
  | { type: "roleplay"; scene: string }
  | { type: "listening"; focus: string };

type WeekItem = { week: number; goal: string; microLessons: MicroLesson[] };

type Plan = {
  track: string;
  weekly: WeekItem[];
  todaySession: { durationMin: number; flow: Step[] };
  kpis: string[];
};

/** ====== 小ユーティリティ ====== */
const cefrLabel: Record<CEFR, string> = {
  A1: "A1：基礎入門",
  A2: "A2：基礎",
  B1: "B1：日常会話",
  B2: "B2：応用",
  C1: "C1：上級",
  C2: "C2：最上級",
};

function labelStep(step: Step["step"]) {
  switch (step) {
    case "diagnostic_mini_test":
      return "診断ミニテスト";
    case "listen_and_repeat":
      return "音読＆リピート";
    case "roleplay_ai":
      return "AIロールプレイ";
    case "feedback":
      return "フィードバック";
  }
}

/** ステップ配列のための安定キー */
function stepKey(s: Step, idx: number) {
  if (s.step === "roleplay_ai") return `step-${s.step}-${s.scene}`;
  return `step-${s.step}-${idx}`; // 役に立つ識別子が無ければ念のため idx を添える
}

/** ====== Props ====== */
type Props = {
  plan: Plan;
  demand: Demand;
  setDemand: React.Dispatch<React.SetStateAction<Demand>>;
  onEncourage?: (kind: "idle" | "start" | "good" | "oops") => void;
  /** ← 追加：診断適用時に親（page.tsx）で plan を再生成するためのコールバック */
  onApplyDemand?: (next: Demand) => Promise<void> | void;
};

/** ====== 本体 ====== */
export default function SessionRunner({ plan, demand, setDemand, onEncourage, onApplyDemand }: Props) {
  const { push } = useToast();
  const [current, setCurrent] = React.useState(0);

  const flow = plan.todaySession.flow;

  return (
    <div>
      {/* ステップタブ */}
      <div className="space-y-3">
        {flow.map((s, i) => (
          <button
            key={stepKey(s, i)}
            type="button"
            onClick={() => setCurrent(i)}
            className={`w-full rounded-xl border px-4 py-3 text-left ${
              i === current ? "bg-gray-50 border-gray-800" : "hover:bg-gray-50"
            }`}
          >
            {i + 1}. {labelStep(s.step)}
          </button>
        ))}
      </div>

      {/* パネル */}
      <div className="mt-4">
        {flow[current]?.step === "diagnostic_mini_test" && (
          <MiniDiagnostic
            demand={demand}
            setDemand={setDemand}
            onDone={(next) => {
              // 親にも通知したいときはここで
              onApplyDemand?.(next);
              push({
                kind: "success",
                title: "設定を適用しました",
                message: "今日のセッションに反映しました。",
              });
              onEncourage?.("good");
              // 次のステップへ
              setCurrent((c) => Math.min(c + 1, flow.length - 1));
            }}
            onError={(message) => {
              push({ kind: "error", title: "反映できませんでした", message });
              onEncourage?.("oops");
            }}
          />
        )}

        {flow[current]?.step === "listen_and_repeat" && (
  <ListenAndRepeat plan={plan} demand={demand} />
)}

        {flow[current]?.step === "roleplay_ai" && (
          <RoleplayBlock
            key={`rp-${flow[current].scene}`} // シーンが変わるときに内部状態をリセット
            scene={flow[current].scene}
          />
        )}

        {flow[current]?.step === "feedback" && <FeedbackBlock plan={plan} demand={demand} />}
      </div>
    </div>
  );
}

/** ====== ① 診断ミニテスト ====== */
function MiniDiagnostic({
  demand,
  setDemand,
  onDone,
  onError,
}: {
  demand: Demand;
  setDemand: React.Dispatch<React.SetStateAction<Demand>>;
  /** ← 親に「更新後の demand」を返す */
  onDone: (next: Demand) => void;
  onError: (message: string) => void;
}) {
  const goals: Demand["profile"]["useCase"][] = [
    "inbound_service",
    "business",
    "study_abroad",
    "daily_life",
  ];
  const scenesMaster = ["menu", "allergy", "payment", "directions"] as const;
  type Scene = (typeof scenesMaster)[number];

  // ローカルUI用の一時状態（フォームの値）
  const [goal, setGoal] = React.useState<Demand["profile"]["useCase"]>(
    demand.profile.useCase
  );
  const [cefr, setCefr] = React.useState<CEFR>(demand.level.cefr);
  const [scenes, setScenes] = React.useState<string[]>(
    demand.constraints.scenes.length ? demand.constraints.scenes : ["menu"]
  );

  const toggle = (s: Scene) =>
    setScenes((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );

  /** ← これが “apply()” 本体です */
  const apply = async () => {
    try {
      const chosenScenes = scenes.length ? scenes : ["menu"]; // 念のため1件保証
      const next: Demand = {
        ...demand,
        profile: { ...demand.profile, useCase: goal },
        level: { ...demand.level, cefr },
        constraints: { ...demand.constraints, scenes: chosenScenes },
      };

      // 自分の state を更新
      setDemand(next);
      // 親（SessionRunner 呼び出し元 = page.tsx）に通知
      onDone(next);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "不明なエラー";
      onError(msg);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border p-4">
      <div className="text-sm text-gray-600">ゴール・レベル・シーンを簡易診断します。</div>

      {/* 目的 */}
      <div className="mt-4">
        <label className="text-sm text-gray-600">主目的</label>
        <select
          className="mt-1 w-full rounded-lg border px-3 py-2"
          value={goal}
          onChange={(e) =>
            setGoal(e.target.value as Demand["profile"]["useCase"])
          }
        >
          <option value="inbound_service">インバウンド対応</option>
          <option value="business">ビジネス会話</option>
          <option value="study_abroad">留学準備</option>
          <option value="daily_life">日常会話</option>
        </select>
      </div>

      {/* レベル */}
      <div className="mt-4">
        <label className="text-sm text-gray-600">自己申告レベル</label>
        <select
          className="mt-1 w-full rounded-lg border px-3 py-2"
          value={cefr}
          onChange={(e) => setCefr(e.target.value as CEFR)}
        >
          {(["A1", "A2", "B1", "B2", "C1", "C2"] as CEFR[]).map((lv) => (
            <option key={lv} value={lv}>
              {cefrLabel[lv]}
            </option>
          ))}
        </select>
      </div>

      {/* シーン */}
      <div className="mt-4">
        <div className="text-sm text-gray-600">必要シーン（複数選択可）</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {scenesMaster.map((s) => {
            const selected = scenes.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggle(s)}
                className={`px-3 py-1 rounded-full text-sm border transition ${
                  selected
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-700 border-gray-300 hover:border-black"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* 適用 */}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={apply}
          className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:opacity-90"
        >
          この内容で開始
        </button>
        <div className="text-xs text-gray-500">
          現在の推奨レベル: {cefrLabel[cefr].split("：")[0]}
        </div>
      </div>
    </div>
  );
}

/** ====== ② 音読＆リピート（需要ベース＋TTS再生ボタン付き） ====== */
function ListenAndRepeat({ plan, demand }: { plan: Plan; demand: Demand }) {
  const { push } = useToast();
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [loadingIndex, setLoadingIndex] = React.useState<number | null>(null);
  const cacheRef = React.useRef<Map<string, string>>(new Map());

  type Phrase = { en: string; ja: string };

  // シーン別・難易度別の簡易フレーズ集（必要に応じて追記OK）
  const PACKS: Record<
    "menu" | "allergy" | "payment" | "directions",
    { A1: Phrase[]; A2: Phrase[]; B1: Phrase[]; B2: Phrase[]; C1: Phrase[]; C2: Phrase[] }
  > = {
    menu: {
      A1: [
        { en: "Welcome! How many?", ja: "いらっしゃいませ。何名様ですか？" },
        { en: "Here is the menu.", ja: "こちらがメニューです。" },
        { en: "Would you like water?", ja: "お水はいかがですか？" },
        { en: "Are you ready to order?", ja: "ご注文はお決まりですか？" },
        { en: "Anything to drink?", ja: "お飲み物はいかがですか？" },
        { en: "One moment, please.", ja: "少々お待ちください。" },
      ],
      A2: [
        { en: "Any recommendations?", ja: "おすすめはありますか？（→店側の応答想定）" },
        { en: "Today's special is ...", ja: "本日のおすすめは〜です。" },
        { en: "Would you like a set?", ja: "セットにされますか？" },
        { en: "How spicy do you like?", ja: "辛さはいかがなさいますか？" },
        { en: "Please enjoy your meal.", ja: "ごゆっくりどうぞ。" },
        { en: "Can I clear this plate?", ja: "お皿お下げしてもよろしいですか？" },
      ],
      B1: [
        { en: "Do you have any dietary preferences?", ja: "食の好みはありますか？" },
        { en: "This dish is popular among visitors.", ja: "こちらは観光客の方に人気です。" },
        { en: "It comes with soup and salad.", ja: "スープとサラダが付きます。" },
        { en: "Would you like to add a dessert?", ja: "デザートを追加されますか？" },
        { en: "Please let me know if you need anything.", ja: "何かありましたらお声がけください。" },
        { en: "How was everything?", ja: "お味はいかがでしたか？" },
      ],
      B2: [
        { en: "We can adjust the seasoning upon request.", ja: "ご希望があれば味付けを調整できます。" },
        { en: "We have vegetarian options available.", ja: "ベジタリアン向けの料理もございます。" },
        { en: "This pairs well with our house wine.", ja: "こちらはハウスワインによく合います。" },
        { en: "Would you like separate checks?", ja: "お会計は別々になさいますか？" },
        { en: "Please take your time deciding.", ja: "ごゆっくりお選びください。" },
        { en: "I’ll be back to take your order shortly.", ja: "少ししたらご注文を伺いに参ります。" },
      ],
      C1: [
        { en: "If you have any specific flavor preferences, let me know.", ja: "風味の好みがあればお知らせください。" },
        { en: "This dish features seasonal ingredients.", ja: "旬の食材を使った一品です。" },
        { en: "We can accommodate most requests.", ja: "ほとんどのご要望に対応可能です。" },
        { en: "You might enjoy comparing these two sauces.", ja: "この2つのソースを比べてみるのもおすすめです。" },
        { en: "Let me know if you'd like pairing suggestions.", ja: "ペアリングの提案が必要ならお声がけください。" },
        { en: "Shall I give you a moment to decide?", ja: "少しお時間をお取りしますか？" },
      ],
      C2: [
        { en: "We can tailor the dish to your taste profile.", ja: "お好みに合わせて味を仕立てられます。" },
        { en: "This is a delicate balance of umami and acidity.", ja: "旨味と酸味の繊細なバランスです。" },
        { en: "It’s a signature item with a sophisticated finish.", ja: "洗練された余韻のある看板料理です。" },
        { en: "Would you like detailed allergen information?", ja: "アレルゲン情報の詳細をご案内しましょうか？" },
        { en: "We can pace the courses at your preference.", ja: "コースの進行速度もご希望に合わせられます。" },
        { en: "Please feel free to ask nuanced questions.", ja: "細かい点でもご遠慮なくご質問ください。" },
      ],
    },
    allergy: {
      A1: [
        { en: "Do you have any allergies?", ja: "アレルギーはありますか？" },
        { en: "What are you allergic to?", ja: "何のアレルギーですか？" },
        { en: "This dish contains nuts.", ja: "この料理にはナッツが含まれます。" },
        { en: "This is dairy-free.", ja: "こちらは乳製品不使用です。" },
        { en: "We can remove eggs.", ja: "卵抜きにできます。" },
        { en: "Please be careful.", ja: "ご注意ください。" },
      ],
      A2: [
        { en: "Any gluten allergy?", ja: "グルテンのアレルギーはありますか？" },
        { en: "We can prepare a no-soy version.", ja: "大豆抜きの調理ができます。" },
        { en: "Cross-contamination is minimized.", ja: "コンタミネーションは最小限です。" },
        { en: "Let me confirm with the kitchen.", ja: "キッチンに確認します。" },
        { en: "This sauce contains fish.", ja: "このソースには魚が含まれます。" },
        { en: "We have a safe alternative.", ja: "安全な代替品がございます。" },
      ],
      B1: [
        { en: "We take allergies seriously.", ja: "当店はアレルギーに配慮しています。" },
        { en: "These items are prepared separately.", ja: "こちらは別調理で対応しています。" },
        { en: "Please inform us of even mild reactions.", ja: "軽度でも反応があれば必ずお知らせください。" },
        { en: "We can provide a full ingredient list.", ja: "原材料一覧をご用意できます。" },
        { en: "Would you prefer a plain seasoning?", ja: "シンプルな味付けをご希望ですか？" },
        { en: "We’ll mark your order as allergy-sensitive.", ja: "ご注文にはアレルギー配慮の印を付けます。" },
      ],
      B2: [
        { en: "There is a trace risk of cross-contact.", ja: "微量の接触リスクは残ります。" },
        { en: "We sanitize tools before preparation.", ja: "調理前に器具を消毒します。" },
        { en: "We can customize the marinade.", ja: "マリネの内容をカスタム可能です。" },
        { en: "Please confirm your specific restrictions.", ja: "具体的な制限事項をご確認ください。" },
        { en: "I’ll follow up with the chef immediately.", ja: "すぐにシェフと確認します。" },
        { en: "We can substitute with safe ingredients.", ja: "安全な食材に差し替え可能です。" },
      ],
      C1: [
        { en: "We maintain a strict allergen protocol.", ja: "厳格なアレルゲン対策を運用しています。" },
        { en: "Your safety takes priority over speed.", ja: "安全性を最優先し、提供速度より重視します。" },
        { en: "Let’s verify hidden allergens in condiments.", ja: "調味料の隠れアレルゲンも確認しましょう。" },
        { en: "We can document everything for you.", ja: "全項目を文書でお渡しできます。" },
        { en: "Would you like us to coordinate course flow?", ja: "コースの構成も配慮して進めましょうか？" },
        { en: "Please ask if anything is unclear.", ja: "不明点は何でもお尋ねください。" },
      ],
      C2: [
        { en: "We’ll implement advanced precautions for your case.", ja: "今回のケースに合わせ高度な予防策を取ります。" },
        { en: "We’ll brief the entire team immediately.", ja: "スタッフ全員に即時共有します。" },
        { en: "We can create a bespoke menu for safety.", ja: "安全を最優先に特別メニューを作成可能です。" },
        { en: "Kindly inform us of symptom onset patterns.", ja: "症状の出方も事前にお知らせください。" },
        { en: "We’ll keep communication transparent.", ja: "透明性の高い情報共有を徹底します。" },
        { en: "Your comfort is our highest concern.", ja: "安心して召し上がれる環境を最優先します。" },
      ],
    },
    payment: {
      A1: [
        { en: "Cash or card?", ja: "お支払いは現金とカードどちらですか？" },
        { en: "Please pay at the register.", ja: "レジでお支払いください。" },
        { en: "Here is your receipt.", ja: "こちらがレシートです。" },
        { en: "Please tap your card.", ja: "カードをタップしてください。" },
        { en: "Please enter your PIN.", ja: "暗証番号を入力してください。" },
        { en: "Thank you very much.", ja: "ありがとうございました。" },
      ],
      A2: [
        { en: "Would you like a receipt?", ja: "レシートは必要ですか？" },
        { en: "Do you need a tax-free form?", ja: "免税書類は必要ですか？" },
        { en: "We also accept mobile payments.", ja: "モバイル決済もご利用いただけます。" },
        { en: "Please sign here.", ja: "こちらにご署名ください。" },
        { en: "Your change is 500 yen.", ja: "お釣りは500円です。" },
        { en: "Have a great day.", ja: "良い一日を。" },
      ],
      B1: [
        { en: "Would you like separate or combined bills?", ja: "お会計は別々ですか、ご一緒ですか？" },
        { en: "There is a small service charge.", ja: "サービス料が少しかかります。" },
        { en: "We can provide an itemized receipt.", ja: "明細付きレシートをご用意できます。" },
        { en: "Please confirm the total amount.", ja: "合計金額をご確認ください。" },
        { en: "Refunds take 3–5 business days.", ja: "返金には3〜5営業日かかります。" },
        { en: "Let me know if you need a company invoice.", ja: "会社用の請求書が必要ならお知らせください。" },
      ],
      B2: {
        A1: [] as Phrase[], A2: [] as Phrase[], B1: [] as Phrase[],
        B2: [
          { en: "Would you like to split by items or evenly?", ja: "品目ごとに割りますか、等分にしますか？" },
          { en: "Please confirm the tip policy, if any.", ja: "チップの扱い（必要であれば）をご確認ください。" },
          { en: "Card authorization may take a moment.", ja: "カード承認に少し時間がかかる場合があります。" },
          { en: "We can reissue a detailed statement.", ja: "明細は再発行可能です。" },
          { en: "For large payments, ID may be required.", ja: "高額決済では身分証が必要な場合があります。" },
          { en: "Let us know if you need currency support.", ja: "通貨サポートが必要ならご連絡ください。" },
        ],
        C1: [
          { en: "We can customize the breakdown for accounting.", ja: "経理向けに内訳をカスタマイズできます。" },
          { en: "Exchange rate depends on your card issuer.", ja: "為替レートはカード発行会社によります。" },
          { en: "We can hold the receipt at the front desk.", ja: "レシートはフロントでお預かりできます。" },
          { en: "Let me ensure all charges are correct.", ja: "請求項目に誤りがないか確認します。" },
          { en: "We can schedule a later payment if needed.", ja: "必要に応じて後払いの手配も可能です。" },
          { en: "Please contact us if any discrepancy appears.", ja: "不一致があればご連絡ください。" },
        ],
        C2: [
          { en: "We can coordinate multi-party settlements.", ja: "複数名での精算調整にも対応します。" },
          { en: "Let us know preferred invoicing terms.", ja: "請求書の希望条件をお知らせください。" },
          { en: "We ensure compliance with tax requirements.", ja: "税要件の遵守を徹底しています。" },
          { en: "High-value transactions may need verification.", ja: "高額取引は確認が必要な場合があります。" },
          { en: "We’ll keep your billing details on file securely.", ja: "請求情報は安全に保管します。" },
          { en: "Please review the final statement at your convenience.", ja: "最終明細をご都合の良い時にご確認ください。" },
        ],
      } as any,
    } as any,
    directions: {
      A1: [
        { en: "Go straight, then turn left.", ja: "まっすぐ進んで左に曲がってください。" },
        { en: "It’s near the station.", ja: "駅の近くです。" },
        { en: "A taxi is easy from here.", ja: "ここからタクシーが便利です。" },
        { en: "Use Exit A.", ja: "A出口を使ってください。" },
        { en: "It takes five minutes on foot.", ja: "徒歩5分です。" },
        { en: "Please ask staff if lost.", ja: "迷ったらスタッフに聞いてください。" },
      ],
      A2: [
        { en: "Take the second right.", ja: "二つ目の角を右です。" },
        { en: "You’ll see a large sign.", ja: "大きな看板が見えます。" },
        { en: "It’s opposite the convenience store.", ja: "コンビニの向かいです。" },
        { en: "The bus stop is over there.", ja: "バス停はあちらです。" },
        { en: "Follow the river for two blocks.", ja: "川沿いに二ブロック進んでください。" },
        { en: "Ask the guard at the gate.", ja: "門の警備員にお尋ねください。" },
      ],
      B1: [
        { en: "It’s a short walk through the arcade.", ja: "アーケードを抜けるとすぐです。" },
        { en: "Cross at the next intersection.", ja: "次の交差点で渡ってください。" },
        { en: "There’s an elevator behind the lobby.", ja: "ロビーの裏にエレベーターがあります。" },
        { en: "Go up to the 3rd floor.", ja: "3階までお上がりください。" },
        { en: "You’ll find it beside the museum.", ja: "博物館の隣にあります。" },
        { en: "Landmarks are well signposted.", ja: "目印は案内板が整っています。" },
      ],
      B2: [
        { en: "If you reach the bridge, you’ve gone too far.", ja: "橋まで行くと行き過ぎです。" },
        { en: "A shuttle runs every 15 minutes.", ja: "15分おきにシャトルが出ています。" },
        { en: "Take the express elevator to the rooftop.", ja: "直通エレベーターで屋上へ上がってください。" },
        { en: "Use the underpass to cross safely.", ja: "安全のため地下道をご利用ください。" },
        { en: "The path is stair-free.", ja: "段差のないルートです。" },
        { en: "You’ll spot it after the glass building.", ja: "ガラス張りの建物の先に見つかります。" },
      ],
      C1: [
        { en: "Navigation apps suggest similar routes.", ja: "ナビアプリでも同様のルートが出ます。" },
        { en: "Traffic is light at this hour.", ja: "この時間帯は交通が空いています。" },
        { en: "You can enjoy the view along the river.", ja: "川沿いの景色も楽しめます。" },
        { en: "If you prefer less walking, take the tram.", ja: "歩行を減らすなら路面電車が便利です。" },
        { en: "Ask staff if you need printed directions.", ja: "紙の案内が必要ならお申し付けください。" },
        { en: "Let me mark it on your map.", ja: "地図に印を付けますね。" },
      ],
      C2: [
        { en: "The scenic route takes only a few minutes longer.", ja: "景観の良いルートでも数分の違いです。" },
        { en: "Accessibility is ensured along this path.", ja: "このルートはバリアフリーです。" },
        { en: "Landmarks are clearly visible even at night.", ja: "夜間でも目印がはっきり見えます。" },
        { en: "The signage is multilingual.", ja: "サインは多言語対応です。" },
        { en: "Local staff can assist if needed.", ja: "必要なら現地スタッフが手伝えます。" },
        { en: "I can draw a quick sketch for you.", ja: "簡単な略図も描けますよ。" },
      ],
    },
  };

  // 使うシーンを決定（診断/プランのいずれか）
  const selectedScenes = demand.constraints.scenes.length ? demand.constraints.scenes : ["menu"];
  const scene =
    (plan.todaySession.flow.find((s) => s.step === "roleplay_ai") as
      | { step: "roleplay_ai"; scene: string }
      | undefined)?.scene || (selectedScenes[0] as keyof typeof PACKS);

  // CEFRを安全に丸める
  const lv = (["A1", "A2", "B1", "B2", "C1", "C2"] as CEFR[]).includes(demand.level.cefr)
    ? demand.level.cefr
    : "A2";

  // まずはカリキュラム内に具体フレーズがあれば優先（無い想定）
  const phrasesFromPlan: Phrase[] =
    plan.weekly
      .flatMap((w) => w.microLessons)
      .filter((m) => (m as any).phrases)
      .flatMap((m) => ((m as any).phrases as Phrase[]))
      .slice(0, 8) || [];

  // 無ければローカルPACKSから
  const phrases: Phrase[] =
    phrasesFromPlan.length > 0
      ? phrasesFromPlan
      : (PACKS[scene as keyof typeof PACKS]?.[lv] ?? PACKS.menu[lv]).slice(0, 8);

  // 再生
  const play = async (text: string, idx: number) => {
    try {
      setLoadingIndex(idx);
      // メモリキャッシュ
      let url = cacheRef.current.get(text);
      if (!url) {
        const r = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice: "default" }),
        });
        if (!r.ok) throw new Error("TTS生成に失敗しました");
        const b = await r.blob();
        url = URL.createObjectURL(b);
        cacheRef.current.set(text, url);
      }
      const a = audioRef.current;
      if (a) {
        a.src = url;
        await a.play().catch(() => void 0);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "エラーが発生しました";
      push({ kind: "error", title: "再生できません", message: msg });
    } finally {
      setLoadingIndex(null);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border p-4">
      <div className="text-sm text-gray-600">
        重要フレーズを声に出して読みましょう。（シーン: {scene} / レベル: {lv}）
      </div>

      <ul className="mt-3 space-y-3">
        {phrases.map((p, i) => (
          <li key={i} className="text-sm leading-6">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="font-semibold">{p.en}</div>
                <div className="text-gray-600">{p.ja}</div>
              </div>
              <button
                type="button"
                onClick={() => play(p.en, i)}
                disabled={loadingIndex === i}
                className="shrink-0 rounded-md border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                aria-label={`Play phrase ${i + 1}`}
                title="英語を再生"
              >
                {loadingIndex === i ? "…再生中" : "▶︎ 再生"}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* 一つだけ使い回すオーディオ */}
      <audio ref={audioRef} className="mt-3 w-full" />
    </div>
  );
}

/** ====== ③ ロールプレイ最小実装（質問→TTS再生） ====== */
function RoleplayBlock({ scene }: { scene: string }) {
  const { push } = useToast();
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [question, setQuestion] = React.useState<string>("");

  const ask = async () => {
    try {
      // 1) 質問を生成
      const r1 = await fetch("/api/roleplay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene, lang: "ja" }),
      });
      const j1 = (await r1.json()) as { question?: string; error?: string };
      if (!r1.ok || !j1.question) throw new Error(j1.error || "AIの質問取得に失敗");

      setQuestion(j1.question);

      // 2) TTS
      const r2 = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: j1.question, voice: "default" }),
      });
      if (!r2.ok) throw new Error("TTS生成に失敗しました");
      const b = await r2.blob();
      const url = URL.createObjectURL(b);
      const a = audioRef.current;
      if (a) {
        a.src = url;
        await a.play().catch(() => void 0);
      }
      push({ kind: "success", title: "AIが最初の質問をしました", message: "聞き取って返答してみましょう。" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "エラーが発生しました";
      push({ kind: "error", title: "AIの質問取得に失敗", message: msg });
    }
  };

  return (
    <div className="mt-4 rounded-2xl border p-4">
      <div className="text-sm text-gray-600">AIが最初に質問します。聞いたあとに返答してください。</div>
      <button
        type="button"
        onClick={ask}
        className="mt-3 rounded-lg bg-black px-4 py-2 text-sm text-white hover:opacity-90"
      >
        🤖 最初の質問を聞く
      </button>

      <div className="mt-4 rounded-xl border p-4">
        <div className="text-sm text-gray-600">ロールプレイ（{scene}）</div>
        <audio ref={audioRef} controls className="mt-3 w-full" />
        {question && <p className="mt-2 text-sm text-gray-700">質問: {question}</p>}
      </div>
    </div>
  );
}

/** ====== ④ フィードバック（簡易） ====== */
function FeedbackBlock({ plan, demand }: { plan: Plan; demand: Demand }) {
  return (
    <div className="mt-4 rounded-2xl border p-4">
      <div className="text-sm text-gray-600">本日のまとめ</div>
      <ul className="mt-2 list-disc pl-5 text-sm space-y-1 text-gray-700">
        <li>推奨レベル: {demand.level.cefr}</li>
        <li>重点シーン: {demand.constraints.scenes.join(", ") || "-"}</li>
        <li>想定時間: {plan.todaySession.durationMin} 分</li>
      </ul>
    </div>
  );
}
