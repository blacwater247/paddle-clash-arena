import { useCallback, useEffect, useMemo, useState } from "react";
import { SUPERS, getSuper, type SuperId } from "@/lib/superPowers";


// ====== TYPES ======
export type ItemCategory = "paddle" | "ball" | "table" | "victory";

export interface ItemPreview {
  a?: string; b?: string; glow?: string;
  top?: string; mid?: string; line?: string;
}
export interface ShopItem {
  id: string;
  category: ItemCategory;
  name: string;
  price: number;
  rankRequired?: number; // min level required
  preview: ItemPreview;
}

export interface DailyChallenge {
  id: string;
  label: string;
  target: number;
  progress: number;
  claimed: boolean;
  reward: number;
}

export interface RewardsData {
  coins: number;
  xp: number;
  wins: number;
  ownedItems: string[];
  equipped: { paddle: string; ball: string; table: string; victory: string; super: SuperId };
  ownedSupers: SuperId[];
  streak: { count: number; lastClaimDate: string | null };
  daily: { date: string; challenges: DailyChallenge[] } | null;
}


export interface MatchSummary {
  won: boolean;
  mode: "arcade" | "challenge" | "boss" | "twoplayer";
  score: number;
  opponentScore: number;
  pickups: number;
  maxRally: number;
  comeback: boolean; // was down 3+ and won
  perfect: boolean; // opponent scored 0
}

export interface GrantResult {
  coins: number;
  xp: number;
  leveledUp: boolean;
  prevLevel: number;
  newLevel: number;
  breakdown: { label: string; coins: number; xp: number }[];
}

// ====== RANKS / XP ======
export interface RankInfo { name: string; minLevel: number; color: string }
export const RANKS: RankInfo[] = [
  { name: "Rookie",     minLevel: 1,  color: "#94A3B8" },
  { name: "Amateur",    minLevel: 6,  color: "#FCD34D" },
  { name: "Pro",        minLevel: 11, color: "#22D3EE" },
  { name: "Champion",   minLevel: 16, color: "#F472B6" },
  { name: "Legend",     minLevel: 21, color: "#A855F7" },
  { name: "Arena God",  minLevel: 26, color: "#FFD700" },
];

export const MAX_LEVEL = 30;

export function xpToReachLevel(level: number): number {
  // total cumulative xp needed to BE at `level`
  if (level <= 1) return 0;
  let t = 0;
  for (let i = 1; i < level; i++) t += Math.round(100 * Math.pow(i, 1.4));
  return t;
}
export function levelFromXp(xp: number): number {
  let lvl = 1;
  while (lvl < MAX_LEVEL && xp >= xpToReachLevel(lvl + 1)) lvl++;
  return lvl;
}
export function rankFromLevel(level: number) {
  let r = RANKS[0];
  for (const x of RANKS) if (level >= x.minLevel) r = x;
  return r;
}

// ====== SHOP CATALOG ======
export const SHOP_ITEMS: ShopItem[] = [
  // PADDLES — originals
  { id: "paddle:classic",   category: "paddle", name: "Classic Gold",  price: 0,     preview: { a: "#1a1a1a", b: "#FFD700", glow: "#FFD700" } },
  { id: "paddle:lightning", category: "paddle", name: "Lightning",     price: 500,   preview: { a: "#3b1f00", b: "#FCD34D", glow: "#FBBF24" } },
  { id: "paddle:neon",      category: "paddle", name: "Neon Pulse",    price: 1000,  preview: { a: "#082f49", b: "#22D3EE", glow: "#22D3EE" } },
  { id: "paddle:crimson",   category: "paddle", name: "Crimson Edge",  price: 1500,  preview: { a: "#3f0a0a", b: "#F43F5E", glow: "#F43F5E" } },
  { id: "paddle:inferno",   category: "paddle", name: "Inferno",       price: 3000,  preview: { a: "#450a0a", b: "#FB923C", glow: "#F97316" } },
  { id: "paddle:galaxy",    category: "paddle", name: "Galaxy",        price: 5000,  rankRequired: 16, preview: { a: "#1e1b4b", b: "#A855F7", glow: "#C084FC" } },
  { id: "paddle:prismatic", category: "paddle", name: "Prismatic",     price: 10000, rankRequired: 21, preview: { a: "#0f172a", b: "#FFFFFF", glow: "#22D3EE" } },
  // PADDLES — Super Power series
  { id: "paddle:thunder_strike", category: "paddle", name: "Thunder Strike", price: 2000, preview: { a: "#0a0a0a", b: "#3B82F6", glow: "#60A5FA" } },
  { id: "paddle:flame_smash",    category: "paddle", name: "Flame Smash",    price: 2500, preview: { a: "#1a0a00", b: "#FB923C", glow: "#F97316" } },
  { id: "paddle:phantom_curve",  category: "paddle", name: "Phantom Curve",  price: 4000, rankRequired: 11, preview: { a: "#1a0a2e", b: "#C4B5FD", glow: "#A78BFA" } },
  { id: "paddle:titan_shield",   category: "paddle", name: "Titan Shield",   price: 6000, rankRequired: 16, preview: { a: "#1a1408", b: "#FCD34D", glow: "#FFD700" } },
  // BALL TRAILS
  { id: "ball:default",   category: "ball", name: "Electric Blue", price: 0,    preview: { glow: "#60A5FA" } },
  { id: "ball:fire",      category: "ball", name: "Fireball",      price: 300,  preview: { glow: "#FB923C" } },
  { id: "ball:electric",  category: "ball", name: "Lightning",     price: 600,  preview: { glow: "#FACC15" } },
  { id: "ball:rainbow",   category: "ball", name: "Rainbow",       price: 1200, preview: { glow: "#F472B6" } },
  { id: "ball:comet",     category: "ball", name: "Comet",         price: 2500, preview: { glow: "#22D3EE" } },
  { id: "ball:void",      category: "ball", name: "Void",          price: 4000, rankRequired: 16, preview: { glow: "#A855F7" } },
  // TABLES — originals
  { id: "table:midnight", category: "table", name: "Midnight Blue", price: 0,    preview: { top: "#0a1a3d", mid: "#0e2a5e", line: "#FFFFFF" } },
  { id: "table:emerald",  category: "table", name: "Emerald Court", price: 800,  preview: { top: "#052e1f", mid: "#064e3b", line: "#FCD34D" } },
  { id: "table:royal",    category: "table", name: "Royal Violet",  price: 1200, preview: { top: "#1e1b4b", mid: "#3730a3", line: "#FDE68A" } },
  { id: "table:void",     category: "table", name: "Void Black",    price: 2000, preview: { top: "#000000", mid: "#171717", line: "#22D3EE" } },
  { id: "table:sunset",   category: "table", name: "Sunset Arena",  price: 1500, preview: { top: "#3a0a3a", mid: "#7c2d12", line: "#FBBF24" } },
  { id: "table:cyber",    category: "table", name: "Cyber Grid",    price: 2500, preview: { top: "#020617", mid: "#1e293b", line: "#22D3EE" } },
  { id: "table:volcano",  category: "table", name: "Volcano",       price: 3500, rankRequired: 11, preview: { top: "#1c0701", mid: "#7c2d12", line: "#F97316" } },
  // TABLES — Pro Arena series
  { id: "table:championship", category: "table", name: "Championship Pro", price: 1800, preview: { top: "#0b1d56", mid: "#1e3a8a", line: "#FFD700" } },
  { id: "table:neon_thunder", category: "table", name: "Neon Thunder",     price: 2800, rankRequired: 6,  preview: { top: "#020617", mid: "#0a1a3d", line: "#3B82F6" } },
  { id: "table:inferno_forge",category: "table", name: "Inferno Forge",    price: 4200, rankRequired: 11, preview: { top: "#0a0500", mid: "#3b1a05", line: "#F97316" } },
  { id: "table:sky_temple",   category: "table", name: "Sky Temple",       price: 5500, rankRequired: 16, preview: { top: "#0b1233", mid: "#1e2a6b", line: "#FCD34D" } },
  // VICTORY FX
  { id: "victory:default",   category: "victory", name: "Gold Flash",       price: 0,    preview: { glow: "#FFD700" } },
  { id: "victory:confetti",  category: "victory", name: "Confetti",         price: 800,  preview: { glow: "#F472B6" } },
  { id: "victory:lightning", category: "victory", name: "Lightning Storm",  price: 1500, preview: { glow: "#FACC15" } },
  { id: "victory:fireworks", category: "victory", name: "Fireworks",        price: 2500, rankRequired: 11, preview: { glow: "#22D3EE" } },
];

export function getItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find(i => i.id === id);
}
export function getEquippedPreview(id: string, fallbackId: string): ItemPreview {
  return (getItem(id) ?? getItem(fallbackId)!).preview;
}

// ====== DAILY ======
export const DAILY_REWARDS = [50, 100, 200, 350, 500, 750, 1500];

const CHALLENGE_POOL: Omit<DailyChallenge, "progress" | "claimed">[] = [
  { id: "wins3",    label: "Win 3 matches",         target: 3,  reward: 300 },
  { id: "points15", label: "Score 15 points total", target: 15, reward: 300 },
  { id: "pickup5",  label: "Collect 5 power-ups",   target: 5,  reward: 300 },
  { id: "rally10",  label: "Reach a 10-hit rally",  target: 10, reward: 350 },
  { id: "boss",     label: "Win a Boss match",      target: 1,  reward: 500 },
];

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function yesterdayKey(): string {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function pickDailyChallenges(): DailyChallenge[] {
  return CHALLENGE_POOL.map(c => ({ ...c, progress: 0, claimed: false }));
}

// ====== PERSISTENCE & MIGRATION ======
const LS_KEY = "pca:rewards:v1";
const LEGACY_KEY = "pca:v2";

export const defaultRewards: RewardsData = {
  coins: 200, // welcome bonus
  xp: 0,
  wins: 0,
  ownedItems: ["paddle:classic", "ball:default", "table:midnight", "victory:default"],
  equipped: { paddle: "paddle:classic", ball: "ball:default", table: "table:midnight", victory: "victory:default", super: "meteor" },
  ownedSupers: ["meteor"],
  streak: { count: 0, lastClaimDate: null },
  daily: null,
};

export function loadRewards(): RewardsData {
  if (typeof window === "undefined") return defaultRewards;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<RewardsData>;
      const ownedSupers = Array.from(new Set([
        ...((parsed.ownedSupers ?? []) as SuperId[]),
        ...defaultRewards.ownedSupers,
      ]));
      return {
        ...defaultRewards,
        ...parsed,
        equipped: { ...defaultRewards.equipped, ...(parsed.equipped ?? {}) },
        streak: { ...defaultRewards.streak, ...(parsed.streak ?? {}) },
        ownedItems: Array.from(new Set([...(parsed.ownedItems ?? []), ...defaultRewards.ownedItems])),
        ownedSupers,
      };
    }
    // Migrate from legacy save (wins + paddle + table)
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const v2 = JSON.parse(legacy) as { wins?: number; paddle?: string; table?: string };
      const wins = v2.wins ?? 0;
      const owned = new Set(defaultRewards.ownedItems);
      // grandfather unlocks proportional to wins
      if (wins >= 3) owned.add("paddle:lightning");
      if (wins >= 5) owned.add("paddle:neon");
      if (wins >= 8) owned.add("paddle:crimson");
      if (wins >= 2) owned.add("table:emerald");
      if (wins >= 4) owned.add("table:royal");
      if (wins >= 7) owned.add("table:void");
      const eqPaddle = v2.paddle ? `paddle:${v2.paddle}` : "paddle:classic";
      const eqTable = v2.table ? `table:${v2.table}` : "table:midnight";
      return {
        ...defaultRewards,
        wins,
        coins: defaultRewards.coins + wins * 75,
        xp: wins * 80,
        ownedItems: Array.from(owned),
        equipped: { ...defaultRewards.equipped, paddle: owned.has(eqPaddle) ? eqPaddle : "paddle:classic", table: owned.has(eqTable) ? eqTable : "table:midnight" },
      };
    }
  } catch {}
  return defaultRewards;
}
export function saveRewards(d: RewardsData) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch {}
}

// ====== HOOK ======
export function useRewards() {
  // Start with defaults on both server and first client render to avoid
  // SSR/CSR hydration mismatches; hydrate from localStorage after mount.
  const [data, setData] = useState<RewardsData>(defaultRewards);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setData(loadRewards());
    setHydrated(true);
  }, []);

  // Daily challenge auto-rotates per day (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    const today = todayKey();
    if (!data.daily || data.daily.date !== today) {
      setData(d => ({ ...d, daily: { date: today, challenges: pickDailyChallenges() } }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => { if (hydrated) saveRewards(data); }, [data, hydrated]);

  const level = useMemo(() => levelFromXp(data.xp), [data.xp]);
  const rank = useMemo(() => rankFromLevel(level), [level]);
  const xpFloor = useMemo(() => xpToReachLevel(level), [level]);
  const xpCeil = useMemo(() => xpToReachLevel(level + 1), [level]);

  const canClaimDaily = data.streak.lastClaimDate !== todayKey();
  const streakDay = useMemo(() => {
    const today = todayKey();
    const last = data.streak.lastClaimDate;
    if (last === today) return ((data.streak.count - 1) % 7) + 1;
    if (last === yesterdayKey()) return (data.streak.count % 7) + 1;
    return 1;
  }, [data.streak]);

  const claimDaily = useCallback((): number => {
    if (!canClaimDaily) return 0;
    const today = todayKey();
    const wasYesterday = data.streak.lastClaimDate === yesterdayKey();
    const newCount = wasYesterday ? data.streak.count + 1 : 1;
    const dayIdx = ((newCount - 1) % 7);
    const reward = DAILY_REWARDS[dayIdx];
    setData(d => ({
      ...d,
      coins: d.coins + reward,
      streak: { count: newCount, lastClaimDate: today },
      // 7-day bonus: also unlock exclusive paddle if not owned
      ownedItems: dayIdx === 6 && !d.ownedItems.includes("paddle:galaxy")
        ? [...d.ownedItems, "paddle:galaxy"]
        : d.ownedItems,
    }));
    return reward;
  }, [canClaimDaily, data.streak]);

  const isOwned = useCallback((id: string) => data.ownedItems.includes(id), [data.ownedItems]);

  const canPurchase = useCallback((id: string): { ok: boolean; reason?: string } => {
    const item = getItem(id); if (!item) return { ok: false, reason: "Unknown item" };
    if (isOwned(id)) return { ok: false, reason: "Already owned" };
    if (item.rankRequired && level < item.rankRequired) return { ok: false, reason: `Level ${item.rankRequired}+` };
    if (data.coins < item.price) return { ok: false, reason: "Not enough coins" };
    return { ok: true };
  }, [data.coins, isOwned, level]);

  const purchase = useCallback((id: string): boolean => {
    const item = getItem(id); if (!item) return false;
    const check = canPurchase(id); if (!check.ok) return false;
    setData(d => ({
      ...d,
      coins: d.coins - item.price,
      ownedItems: [...d.ownedItems, id],
    }));
    return true;
  }, [canPurchase]);

  const equip = useCallback((id: string) => {
    const item = getItem(id); if (!item || !isOwned(id)) return;
    setData(d => ({ ...d, equipped: { ...d.equipped, [item.category]: id } }));
  }, [isOwned]);

  const bumpChallenge = (daily: RewardsData["daily"], id: string, delta: number) => {
    if (!daily) return daily;
    const challenges = daily.challenges.map(ch =>
      ch.id === id && !ch.claimed
        ? { ...ch, progress: Math.min(ch.target, ch.progress + delta) }
        : ch
    );
    return { ...daily, challenges };
  };
  const setChallengeProgress = (daily: RewardsData["daily"], id: string, value: number) => {
    if (!daily) return daily;
    const challenges = daily.challenges.map(ch =>
      ch.id === id && !ch.claimed && value > ch.progress
        ? { ...ch, progress: Math.min(ch.target, value) }
        : ch
    );
    return { ...daily, challenges };
  };

  const grantPickup = useCallback(() => {
    setData(d => ({ ...d, coins: d.coins + 2, xp: d.xp + 3, daily: bumpChallenge(d.daily, "pickup5", 1) }));
  }, []);

  const recordPoint = useCallback(() => {
    setData(d => ({ ...d, coins: d.coins + 5, daily: bumpChallenge(d.daily, "points15", 1) }));
  }, []);

  const recordRally = useCallback((rally: number) => {
    setData(d => ({ ...d, daily: setChallengeProgress(d.daily, "rally10", rally) }));
  }, []);

  const grantMatchRewards = useCallback((m: MatchSummary): GrantResult => {
    const breakdown: GrantResult["breakdown"] = [];
    let coins = 0, xp = 0;
    const winCoins = m.won ? (m.mode === "boss" ? 250 : m.mode === "challenge" ? 100 : m.mode === "twoplayer" ? 75 : 50) : 20;
    coins += winCoins; xp += m.won ? 80 : 25;
    breakdown.push({ label: m.won ? "Match Win" : "Match Played", coins: winCoins, xp: m.won ? 80 : 25 });

    if (m.perfect && m.won) { coins += 200; xp += 60; breakdown.push({ label: "Perfect Game", coins: 200, xp: 60 }); }
    if (m.comeback && m.won) { coins += 150; xp += 40; breakdown.push({ label: "Comeback", coins: 150, xp: 40 }); }
    if (m.maxRally >= 8) { const c = m.maxRally * 5; coins += c; breakdown.push({ label: `Best Rally x${m.maxRally}`, coins: c, xp: 0 }); }

    const prevLevel = levelFromXp(data.xp);
    const newXp = data.xp + xp;
    const newLevel = levelFromXp(newXp);
    let bonus = 0;
    if (newLevel > prevLevel) {
      bonus = (newLevel - prevLevel) * 500;
      breakdown.push({ label: `Rank Up x${newLevel - prevLevel}`, coins: bonus, xp: 0 });
    }

    setData(d => {
      let daily = d.daily;
      if (m.won) daily = bumpChallenge(daily, "wins3", 1);
      if (m.won && m.mode === "boss") daily = setChallengeProgress(daily, "boss", 1);
      return {
        ...d,
        coins: d.coins + coins + bonus,
        xp: newXp,
        wins: d.wins + (m.won ? 1 : 0),
        daily,
      };
    });

    return { coins: coins + bonus, xp, leveledUp: newLevel > prevLevel, prevLevel, newLevel, breakdown };
  }, [data.xp]);

  const claimChallenge = useCallback((id: string): number => {
    if (!data.daily) return 0;
    const ch = data.daily.challenges.find(c => c.id === id);
    if (!ch || ch.claimed || ch.progress < ch.target) return 0;
    setData(d => ({
      ...d,
      coins: d.coins + ch.reward,
      daily: d.daily
        ? { ...d.daily, challenges: d.daily.challenges.map(c => c.id === id ? { ...c, claimed: true } : c) }
        : null,
    }));
    return ch.reward;
  }, [data.daily]);

  // ===== SUPER POWERS =====
  const isSuperOwned = useCallback((id: SuperId): boolean => {
    const def = getSuper(id);
    if (def.unlock.type === "free") return true;
    if (def.unlock.type === "rank") return level >= def.unlock.level;
    return data.ownedSupers.includes(id);
  }, [data.ownedSupers, level]);

  const canPurchaseSuper = useCallback((id: SuperId): { ok: boolean; reason?: string } => {
    const def = getSuper(id);
    if (def.unlock.type !== "coins") return { ok: false, reason: "Unlocked by rank" };
    if (data.ownedSupers.includes(id)) return { ok: false, reason: "Owned" };
    if (data.coins < def.unlock.price) return { ok: false, reason: "Not enough coins" };
    return { ok: true };
  }, [data.coins, data.ownedSupers]);

  const purchaseSuper = useCallback((id: SuperId): boolean => {
    const def = getSuper(id);
    if (def.unlock.type !== "coins") return false;
    if (data.ownedSupers.includes(id)) return false;
    if (data.coins < def.unlock.price) return false;
    setData(d => ({
      ...d,
      coins: d.coins - (def.unlock as { type: "coins"; price: number }).price,
      ownedSupers: [...d.ownedSupers, id],
    }));
    return true;
  }, [data.coins, data.ownedSupers]);

  const equipSuper = useCallback((id: SuperId) => {
    if (!isSuperOwned(id)) return;
    setData(d => ({ ...d, equipped: { ...d.equipped, super: id } }));
  }, [isSuperOwned]);

  const reset = useCallback(() => setData(defaultRewards), []);

  return {
    data, level, rank, xpFloor, xpCeil,
    coins: data.coins, xp: data.xp,
    canClaimDaily, streakDay,
    claimDaily, claimChallenge,
    grantMatchRewards, grantPickup, recordPoint, recordRally,
    isOwned, canPurchase, purchase, equip,
    isSuperOwned, canPurchaseSuper, purchaseSuper, equipSuper,
    reset,
  };
}

export type UseRewards = ReturnType<typeof useRewards>;
