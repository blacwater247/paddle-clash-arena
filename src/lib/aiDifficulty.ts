// Adaptive AI difficulty — scales by match progress and rolling player skill.

export type AIMode = "arcade" | "challenge" | "boss" | "twoplayer";
export type SkillTier = -1 | 0 | 1 | 2;

export interface AIParams {
  /** frames of reaction lag before AI tracks the new ball position */
  reactionDelay: number;
  /** random px jitter applied to target Y */
  trackingError: number;
  /** paddle max move speed per frame */
  maxSpeed: number;
  /** 0..1 — blend between current ball Y and predicted intercept Y */
  predictionDepth: number;
  /** 0..1 — odds of returning the ball with a smash speed bonus */
  smashChance: number;
  /** display label */
  tierLabel: string;
}

const SKILL_KEY = "pca:ai:skill:v1";

interface SkillSave {
  recent: ("W" | "L")[];
  tier: SkillTier;
}

function loadSkill(): SkillSave {
  if (typeof window === "undefined") return { recent: [], tier: 0 };
  try {
    const r = localStorage.getItem(SKILL_KEY);
    if (r) {
      const p = JSON.parse(r) as Partial<SkillSave>;
      const tier = (p.tier ?? 0) as SkillTier;
      return { recent: Array.isArray(p.recent) ? p.recent.slice(-10) as ("W"|"L")[] : [], tier };
    }
  } catch {}
  return { recent: [], tier: 0 };
}

function saveSkill(s: SkillSave) {
  try { localStorage.setItem(SKILL_KEY, JSON.stringify(s)); } catch {}
}

export function getSkillTier(): SkillTier {
  return loadSkill().tier;
}

export function recordMatchResult(won: boolean) {
  const s = loadSkill();
  s.recent = [...s.recent, won ? "W" : "L"].slice(-10);
  if (s.recent.length >= 5) {
    const wins = s.recent.filter(r => r === "W").length;
    const winRate = wins / s.recent.length;
    if (winRate > 0.7) s.tier = Math.min(2, (s.tier as number) + 1) as SkillTier;
    else if (winRate < 0.3) s.tier = Math.max(-1, (s.tier as number) - 1) as SkillTier;
  }
  saveSkill(s);
}

const ZERO: AIParams = {
  reactionDelay: 0, trackingError: 0, maxSpeed: 0,
  predictionDepth: 0, smashChance: 0, tierLabel: "",
};

export function getAIParams(
  mode: AIMode,
  playerScore: number,
  aiScore: number,
  winTarget: number,
  skillTier: SkillTier,
): AIParams {
  if (mode === "twoplayer") return ZERO;

  const high = Math.max(playerScore, aiScore);
  const aiMatchPoint = aiScore >= winTarget - 1;

  let p: AIParams;
  if (mode === "arcade") {
    if (high <= 2) {
      p = { reactionDelay: 18, trackingError: 80, maxSpeed: 5.5, predictionDepth: 0.0, smashChance: 0.00, tierLabel: "EASY" };
    } else if (high <= 6) {
      p = { reactionDelay: 12, trackingError: 50, maxSpeed: 7.0, predictionDepth: 0.3, smashChance: 0.10, tierLabel: "NORMAL" };
    } else {
      p = { reactionDelay: 7,  trackingError: 25, maxSpeed: 8.5, predictionDepth: 0.7, smashChance: 0.25, tierLabel: "HARD" };
    }
  } else if (mode === "challenge") {
    if (high <= 2) {
      p = { reactionDelay: 12, trackingError: 45, maxSpeed: 7.5, predictionDepth: 0.3, smashChance: 0.10, tierLabel: "NORMAL" };
    } else if (high <= 5) {
      p = { reactionDelay: 8,  trackingError: 25, maxSpeed: 8.5, predictionDepth: 0.6, smashChance: 0.20, tierLabel: "HARD" };
    } else {
      p = { reactionDelay: 5,  trackingError: 15, maxSpeed: 9.5, predictionDepth: 0.9, smashChance: 0.30, tierLabel: "ELITE" };
    }
  } else {
    // boss — flat, with sharper match-point
    p = { reactionDelay: 4, trackingError: 12, maxSpeed: 10, predictionDepth: 1, smashChance: 0.40, tierLabel: "BOSS" };
  }

  if (aiMatchPoint) {
    p = {
      ...p,
      reactionDelay: Math.max(3, p.reactionDelay - 2),
      trackingError: Math.max(8, p.trackingError - 10),
      maxSpeed: p.maxSpeed + 0.5,
      smashChance: Math.min(0.6, p.smashChance + 0.1),
    };
  }

  // skill-tier shift (rolling win-rate based)
  if (skillTier !== 0) {
    const t = skillTier as number;
    p = {
      ...p,
      reactionDelay: Math.max(2, Math.round(p.reactionDelay - t * 2)),
      trackingError: Math.max(5, p.trackingError - t * 12),
      maxSpeed: Math.min(12, p.maxSpeed + t * 0.6),
      smashChance: Math.max(0, Math.min(0.65, p.smashChance + t * 0.08)),
      predictionDepth: Math.max(0, Math.min(1, p.predictionDepth + t * 0.15)),
    };
  }

  // mercy rubber-band (arcade only)
  if (mode === "arcade" && aiScore - playerScore >= 4) {
    p = { ...p, trackingError: p.trackingError * 1.3, reactionDelay: p.reactionDelay + 2 };
  }

  return p;
}

/** Predict ball Y when it reaches `aiX`, accounting for top/bottom bounces. */
export function predictBallY(
  ballX: number, ballY: number, vx: number, vy: number,
  aiX: number, fieldH: number, ballR: number,
): number {
  if (vx === 0) return ballY;
  const dx = aiX - ballX;
  if (Math.sign(dx) !== Math.sign(vx)) return ballY;
  const t = dx / vx;
  let y = ballY + vy * t;
  // reflect off walls
  const span = fieldH - ballR * 2;
  if (span <= 0) return ballY;
  y -= ballR;
  let m = ((y % (2 * span)) + 2 * span) % (2 * span);
  if (m > span) m = 2 * span - m;
  return m + ballR;
}
