// data/pingpong/maps.ts
export type NodeId = "start" | "fork1L" | "fork1R" | "treasure" | "gate" | "boss" | "goal";

export type MapNode = {
  prompt: string;
  next?: NodeId[];
  quiz?: string;                 // 固定文言（クエストUIに表示）
  pos: { r: number; c: number }; // ミニマップ位置
  monster?: "slime" | "sprite" | "goblin" | "shadow";
};

export type LevelMap = Record<NodeId, MapNode>;

// ベースMAP（L1）
const BASE: LevelMap = {
  start:    { prompt: "Welcome! Ready?",         next: ["fork1L", "fork1R"], pos: { r: 1, c: 2 }, monster: "slime" },
  fork1L:   { prompt: "Turn left.",              next: ["treasure"],         pos: { r: 1, c: 3 }, monster: "sprite" },
  fork1R:   { prompt: "Turn right.",             next: ["gate"],             pos: { r: 1, c: 4 }, monster: "goblin" },
  treasure: { prompt: "You found a key!",        next: ["gate"],             pos: { r: 3, c: 5 }, monster: "sprite" },
  gate:     { prompt: "A gate blocks the way.",  next: ["boss"],             pos: { r: 3, c: 3 }, monster: "goblin" },
  boss:     { prompt: "Final Boss! 3 short Qs.", next: ["goal"],             pos: { r: 5, c: 3 }, monster: "shadow" },
  goal:     { prompt: "Clear! Take your reward!",                            pos: { r: 6, c: 3 }, monster: "slime" },
};

// レベル別に少しずつ配置や流れを変えて“別MAP”感を出す
export const LEVEL_MAPS: Record<number, LevelMap> = {
  1: BASE,
  2: {
    ...BASE,
    start:    { ...BASE.start,    pos: { r: 1, c: 3 } },
    fork1L:   { ...BASE.fork1L,   pos: { r: 2, c: 4 } },
    fork1R:   { ...BASE.fork1R,   pos: { r: 2, c: 2 } },
    treasure: { ...BASE.treasure, pos: { r: 4, c: 5 } },
    gate:     { ...BASE.gate,     pos: { r: 4, c: 3 } },
    boss:     { ...BASE.boss,     pos: { r: 5, c: 4 } },
    goal:     { ...BASE.goal,     pos: { r: 6, c: 4 } },
  },
  3: {
    ...BASE,
    start:    { ...BASE.start,    pos: { r: 1, c: 4 } },
    fork1L:   { ...BASE.fork1L,   pos: { r: 2, c: 5 } },
    fork1R:   { ...BASE.fork1R,   pos: { r: 2, c: 3 } },
    treasure: { ...BASE.treasure, pos: { r: 3, c: 5 } },
    gate:     { ...BASE.gate,     pos: { r: 3, c: 4 } },
    boss:     { ...BASE.boss,     pos: { r: 5, c: 5 } },
    goal:     { ...BASE.goal,     pos: { r: 6, c: 5 } },
  },
  4: {
    ...BASE,
    start:    { ...BASE.start,    pos: { r: 2, c: 2 } },
    fork1L:   { ...BASE.fork1L,   pos: { r: 2, c: 3 } },
    fork1R:   { ...BASE.fork1R,   pos: { r: 1, c: 4 } },
    treasure: { ...BASE.treasure, pos: { r: 4, c: 4 } },
    gate:     { ...BASE.gate,     pos: { r: 4, c: 2 } },
    boss:     { ...BASE.boss,     pos: { r: 5, c: 2 } },
    goal:     { ...BASE.goal,     pos: { r: 6, c: 2 } },
  },
  5: {
    ...BASE,
    start:    { ...BASE.start,    pos: { r: 1, c: 2 } },
    fork1L:   { ...BASE.fork1L,   pos: { r: 2, c: 2 } },
    fork1R:   { ...BASE.fork1R,   pos: { r: 2, c: 4 } },
    treasure: { ...BASE.treasure, pos: { r: 3, c: 5 } },
    gate:     { ...BASE.gate,     pos: { r: 4, c: 3 } },
    boss:     { ...BASE.boss,     pos: { r: 5, c: 4 } },
    goal:     { ...BASE.goal,     pos: { r: 6, c: 4 } },
  },
  6: {
    ...BASE,
    start:    { ...BASE.start,    pos: { r: 1, c: 5 } },
    fork1L:   { ...BASE.fork1L,   pos: { r: 2, c: 4 } },
    fork1R:   { ...BASE.fork1R,   pos: { r: 2, c: 5 } },
    treasure: { ...BASE.treasure, pos: { r: 3, c: 3 } },
    gate:     { ...BASE.gate,     pos: { r: 4, c: 3 } },
    boss:     { ...BASE.boss,     pos: { r: 5, c: 3 } },
    goal:     { ...BASE.goal,     pos: { r: 6, c: 3 } },
  },
};
