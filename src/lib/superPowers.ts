// Super Powers — player-activated ultimates separate from pickup power-ups.

export type SuperId = "meteor" | "timewarp" | "mirror" | "phantom" | "chain";

export type SuperUnlock =
  | { type: "free" }
  | { type: "rank"; level: number }
  | { type: "coins"; price: number };

export interface SuperDef {
  id: SuperId;
  name: string;
  short: string;
  glyph: string;
  color: string;
  desc: string;
  unlock: SuperUnlock;
  /** 0 = single-hit (consumed on next collision), >0 = ms duration */
  durationMs: number;
}

export const SUPERS: SuperDef[] = [
  {
    id: "meteor",
    name: "Meteor Smash",
    short: "Smash",
    glyph: "☄",
    color: "#FFD700",
    desc: "Next hit: 2.5x speed fireball",
    unlock: { type: "free" },
    durationMs: 0,
  },
  {
    id: "timewarp",
    name: "Time Warp",
    short: "Slow",
    glyph: "◷",
    color: "#7DD3FC",
    desc: "Slow ball + opponent 4s",
    unlock: { type: "rank", level: 3 },
    durationMs: 4000,
  },
  {
    id: "mirror",
    name: "Mirror Wall",
    short: "Wall",
    glyph: "▮",
    color: "#34D399",
    desc: "2x paddle size for 5s",
    unlock: { type: "coins", price: 1500 },
    durationMs: 5000,
  },
  {
    id: "phantom",
    name: "Phantom Clone",
    short: "Clone",
    glyph: "❖",
    color: "#C084FC",
    desc: "Mirror ghost paddle 6s",
    unlock: { type: "rank", level: 8 },
    durationMs: 6000,
  },
  {
    id: "chain",
    name: "Chain Lightning",
    short: "Chain",
    glyph: "⚡",
    color: "#FACC15",
    desc: "Next hit: zig-zag + pierce",
    unlock: { type: "coins", price: 3500 },
    durationMs: 0,
  },
];

export const SUPER_IDS = SUPERS.map(s => s.id) as SuperId[];

export function getSuper(id: SuperId): SuperDef {
  return SUPERS.find(s => s.id === id) ?? SUPERS[0];
}

export function isSuperUnlocked(
  id: SuperId,
  level: number,
  ownedSupers: SuperId[],
): boolean {
  const def = getSuper(id);
  if (def.unlock.type === "free") return true;
  if (def.unlock.type === "rank") return level >= def.unlock.level;
  return ownedSupers.includes(id); // coin-purchased
}

export function superUnlockLabel(def: SuperDef): string {
  if (def.unlock.type === "free") return "FREE";
  if (def.unlock.type === "rank") return `RANK L${def.unlock.level}`;
  return `${def.unlock.price.toLocaleString()} COINS`;
}

// Meter fill rules
export const METER_MAX = 100;
export const METER_GAIN = {
  pointWon: 25,
  rallyHit: 3,
  pickup: 10,
  pointLost: 15, // catch-up help
};
