import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRewards, getEquippedPreview, type MatchSummary, type GrantResult, rankFromLevel, levelFromXp } from "@/lib/rewards";
import { CoinChip, RankBar, DailyRewardModal, ShopScreen, PostMatchPayout } from "@/components/rewards/RewardsUI";
import { SUPERS, getSuper, superUnlockLabel, METER_MAX, METER_GAIN, type SuperId } from "@/lib/superPowers";
import { getAIParams, predictBallY, getSkillTier, recordMatchResult, type AIParams } from "@/lib/aiDifficulty";


type Screen = "start" | "modes" | "shop" | "settings" | "leaderboard" | "play" | "paused" | "end";
type Mode = "arcade" | "challenge" | "boss" | "twoplayer";
type Winner = "player" | "ai" | "p2" | null;
type PowerKind = "smash" | "slow" | "shield" | "curve" | "fire";

const WIN_SCORE_DEFAULT = 7;
const BASE_W = 1024;
const BASE_H = 640;
const PADDLE_W = 18;
const PADDLE_H = 100;
const BALL_R = 9;
const PADDLE_SPEED = 9;
const BALL_BASE_SPEED = 7;
const BALL_MAX_SPEED = 20;

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; }
interface TrailPoint { x: number; y: number; }
interface PowerUp { x: number; y: number; kind: PowerKind; bob: number; }
interface ActiveEffect { kind: PowerKind; owner: "player" | "ai"; until: number; }
interface LeaderEntry { name: string; score: number; mode: Mode; date: number; }

const POWER_COLORS: Record<PowerKind, string> = {
  smash: "#FFD700", slow: "#7DD3FC", shield: "#34D399", curve: "#C084FC", fire: "#FB7185",
};
const POWER_LABEL: Record<PowerKind, string> = {
  smash: "SMASH", slow: "SLOW", shield: "SHIELD", curve: "CURVE", fire: "FIRE",
};
const POWER_GLYPH: Record<PowerKind, string> = {
  smash: "⚡", slow: "◷", shield: "◉", curve: "↝", fire: "✸",
};

// ===== Lightweight settings save (audio + leaderboard only; rewards live in their own store) =====
const LS_KEY = "pca:settings:v1";
interface SettingsSave { music: boolean; sfx: boolean; haptics: boolean; leaderboard: LeaderEntry[] }
const defaultSettings: SettingsSave = { music: false, sfx: true, haptics: true, leaderboard: [] };
function loadSettings(): SettingsSave {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
    // migrate from legacy combined save
    const legacy = localStorage.getItem("pca:v2");
    if (legacy) {
      const v2 = JSON.parse(legacy);
      return { ...defaultSettings, music: !!v2.music, sfx: v2.sfx !== false, haptics: v2.haptics !== false, leaderboard: v2.leaderboard ?? [] };
    }
  } catch {}
  return defaultSettings;
}
function persistSettings(s: SettingsSave) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
}

export default function PaddleClashArena() {
  const rewards = useRewards();
  const rewardsRef = useRef(rewards);
  useEffect(() => { rewardsRef.current = rewards; }, [rewards]);

  const [screen, setScreen] = useState<Screen>("start");
  const [mode, setMode] = useState<Mode>("arcade");
  const [winner, setWinner] = useState<Winner>(null);
  const [scores, setScores] = useState({ player: 0, ai: 0 });
  const [settings, setSettings] = useState<SettingsSave>(() => loadSettings());
  const [activeBadges, setActiveBadges] = useState<{ kind: PowerKind; owner: "player" | "ai"; ms: number }[]>([]);
  const [rally, setRally] = useState(0);
  const [showDaily, setShowDaily] = useState(false);
  const [matchPayout, setMatchPayout] = useState<GrantResult | null>(null);
  const [superMeter, setSuperMeter] = useState({ p1: 0, p2: 0 });
  const [aiTierLabel, setAiTierLabel] = useState("");
  const [superBanner, setSuperBanner] = useState<{ id: SuperId; ts: number } | null>(null);


  useEffect(() => { persistSettings(settings); }, [settings]);

  // Auto-open daily reward on first start screen visit if available
  const dailyAutoShown = useRef(false);
  useEffect(() => {
    if (screen === "start" && rewards.canClaimDaily && !dailyAutoShown.current) {
      dailyAutoShown.current = true;
      const t = setTimeout(() => setShowDaily(true), 400);
      return () => clearTimeout(t);
    }
  }, [screen, rewards.canClaimDaily]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const state = useRef({
    playerY: BASE_H / 2 - PADDLE_H / 2,
    aiY: BASE_H / 2 - PADDLE_H / 2,
    ballX: BASE_W / 2,
    ballY: BASE_H / 2,
    ballVX: BALL_BASE_SPEED,
    ballVY: 2,
    ballSpin: 0,
    ballFire: false,
    shake: 0,
    trail: [] as TrailPoint[],
    particles: [] as Particle[],
    flash: 0,
    flashColor: "#FFD700",
    keys: { up: false, down: false, up2: false, down2: false },
    pointerY: null as number | null,
    pointerY2: null as number | null,
    touchP1: null as number | null,
    touchP2: null as number | null,
    scores: { player: 0, ai: 0 },
    running: false,
    paused: false,
    powerups: [] as PowerUp[],
    effects: [] as ActiveEffect[],
    spawnAt: 0,
    rally: 0,
    maxRally: 0,
    netWave: 0,
    timeScale: 1,
    smashFor: null as null | "player" | "ai",
    mode: "arcade" as Mode,
    paddleId: "paddle:classic",
    tableId: "table:midnight",
    ballId: "ball:default",
    sfx: true,
    haptics: true,
    winTarget: WIN_SCORE_DEFAULT,
    bossPhase: 0,
    scale: 1,
    pickups: 0,
    startPlayerScore: 0,
    wasDownBy3: false,
    // ===== Adaptive AI =====
    skillTier: 0 as -1 | 0 | 1 | 2,
    aiParams: { reactionDelay: 12, trackingError: 50, maxSpeed: 7, predictionDepth: 0.3, smashChance: 0.1, tierLabel: "NORMAL" } as AIParams,
    aiTargetBuf: [] as number[], // recent ball Y readings; reaction delay reads from tail
    aiSmashNext: false,
    // ===== Super Powers =====
    superId: "meteor" as SuperId,
    superMeterP1: 0,
    superMeterP2: 0,
    activeSuperP1: null as { id: SuperId; until?: number; pendingHit?: boolean } | null,
    activeSuperP2: null as { id: SuperId; until?: number; pendingHit?: boolean } | null,
    chainOnBall: null as null | "player" | "ai", // which player launched the chain shot
  });


  // Sync rewards equipped + settings into game state
  useEffect(() => {
    state.current.paddleId = rewards.data.equipped.paddle;
    state.current.tableId = rewards.data.equipped.table;
    state.current.ballId = rewards.data.equipped.ball;
    state.current.superId = rewards.data.equipped.super;
  }, [rewards.data.equipped]);

  useEffect(() => {
    state.current.sfx = settings.sfx;
    state.current.haptics = settings.haptics;
  }, [settings]);

  // Audio
  const audioCtxRef = useRef<AudioContext | null>(null);
  const musicNodesRef = useRef<{ osc: OscillatorNode; gain: GainNode; interval: number } | null>(null);
  const getAudio = () => {
    if (!audioCtxRef.current && typeof window !== "undefined") {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
      if (Ctx) audioCtxRef.current = new Ctx();
    }
    return audioCtxRef.current;
  };
  const beep = useCallback((freq: number, dur = 0.08, type: OscillatorType = "square", vol = 0.15) => {
    if (!state.current.sfx) return;
    const ctx = getAudio(); if (!ctx) return;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  }, []);
  const haptic = (ms = 10) => {
    if (!state.current.haptics) return;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(ms); } catch {}
    }
  };
  const startMusic = useCallback(() => {
    const ctx = getAudio(); if (!ctx || musicNodesRef.current) return;
    const notes = [220, 277, 330, 277, 247, 330, 392, 330];
    let i = 0;
    const gain = ctx.createGain(); gain.gain.value = 0.04; gain.connect(ctx.destination);
    const osc = ctx.createOscillator(); osc.type = "triangle"; osc.frequency.value = notes[0];
    osc.connect(gain); osc.start();
    const interval = window.setInterval(() => {
      i = (i + 1) % notes.length;
      osc.frequency.setValueAtTime(notes[i], ctx.currentTime);
    }, 280);
    musicNodesRef.current = { osc, gain, interval };
  }, []);
  const stopMusic = useCallback(() => {
    const n = musicNodesRef.current; if (!n) return;
    clearInterval(n.interval);
    try { n.osc.stop(); } catch {}
    n.gain.disconnect();
    musicNodesRef.current = null;
  }, []);
  useEffect(() => {
    if (settings.music && screen === "play") startMusic(); else stopMusic();
    return () => stopMusic();
  }, [settings.music, screen, startMusic, stopMusic]);

  const resetBall = useCallback((toward: 1 | -1) => {
    const s = state.current;
    s.ballX = BASE_W / 2; s.ballY = BASE_H / 2;
    const angle = (Math.random() * 0.6 - 0.3);
    s.ballVX = toward * BALL_BASE_SPEED * Math.cos(angle);
    s.ballVY = BALL_BASE_SPEED * Math.sin(angle) + (Math.random() - 0.5) * 2;
    s.ballSpin = 0;
    s.ballFire = false;
    s.trail = [];
    s.rally = 0;
    setRally(0);
    s.smashFor = null;
    s.timeScale = 1;
  }, []);

  const configureMode = (m: Mode) => {
    const s = state.current;
    s.mode = m;
    if (m === "arcade")    { s.winTarget = 7; }
    if (m === "challenge") { s.winTarget = 9; }
    if (m === "boss")      { s.winTarget = 11; s.bossPhase = 0; }
    if (m === "twoplayer") { s.winTarget = 7; }
    s.skillTier = getSkillTier();
    s.aiParams = getAIParams(m, 0, 0, s.winTarget, s.skillTier);
    s.aiTargetBuf = [];
    s.aiSmashNext = false;
  };


  const startGame = useCallback((m: Mode) => {
    configureMode(m);
    setMode(m);
    state.current.scores = { player: 0, ai: 0 };
    state.current.playerY = BASE_H / 2 - PADDLE_H / 2;
    state.current.aiY = BASE_H / 2 - PADDLE_H / 2;
    state.current.powerups = [];
    state.current.effects = [];
    state.current.spawnAt = performance.now() + 4000;
    state.current.pickups = 0;
    state.current.maxRally = 0;
    state.current.wasDownBy3 = false;
    // reset super state for new match
    state.current.superMeterP1 = 0;
    state.current.superMeterP2 = 0;
    state.current.activeSuperP1 = null;
    state.current.activeSuperP2 = null;
    state.current.chainOnBall = null;
    setSuperMeter({ p1: 0, p2: 0 });
    setSuperBanner(null);
    setAiTierLabel(state.current.aiParams.tierLabel);
    setScores({ player: 0, ai: 0 });
    setWinner(null);
    setMatchPayout(null);
    setActiveBadges([]);
    resetBall(Math.random() > 0.5 ? 1 : -1);

    state.current.running = true;
    state.current.paused = false;
    setScreen("play");
    getAudio()?.resume();
  }, [resetBall]);

  const togglePause = () => {
    if (screen !== "play" && screen !== "paused") return;
    if (state.current.paused) {
      state.current.paused = false;
      setScreen("play");
    } else {
      state.current.paused = true;
      setScreen("paused");
    }
  };

  const spawnHitParticles = (x: number, y: number, color: string, count = 16) => {
    const s = state.current;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 6;
      s.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0, max: 24 + Math.random() * 18, color, size: 2 + Math.random() * 2,
      });
    }
  };
  const spawnSparkLine = (x: number, y: number, color: string) => {
    const s = state.current;
    for (let i = 0; i < 6; i++) {
      s.particles.push({
        x, y, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 3,
        life: 0, max: 16, color, size: 4,
      });
    }
  };

  // ===== Super activation =====
  const activateSuper = useCallback((player: "p1" | "p2") => {
    const s = state.current;
    if (!s.running || s.paused) return;
    const meterKey = player === "p1" ? "superMeterP1" : "superMeterP2";
    const activeKey = player === "p1" ? "activeSuperP1" : "activeSuperP2";
    if (s[meterKey] < METER_MAX) return;
    if (s[activeKey]) return;
    const def = getSuper(s.superId);
    s[meterKey] = 0;
    setSuperMeter({ p1: s.superMeterP1, p2: s.superMeterP2 });

    if (def.id === "meteor" || def.id === "chain") {
      s[activeKey] = { id: def.id, pendingHit: true };
    } else {
      s[activeKey] = { id: def.id, until: performance.now() + def.durationMs };
    }
    s.flash = 26; s.flashColor = def.color;
    s.shake = 10;
    spawnHitParticles(player === "p1" ? 60 : BASE_W - 60, BASE_H / 2, def.color, 36);
    beep(900, 0.12, "triangle", 0.22);
    beep(1400, 0.10, "triangle", 0.18);
    haptic(30);
    setSuperBanner({ id: def.id, ts: performance.now() });
    setTimeout(() => setSuperBanner(null), 1500);
  }, [beep]);


  // Input
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "ArrowUp") state.current.keys.up = true;
      if (k === "ArrowDown") state.current.keys.down = true;
      if (k === "w" || k === "W") state.current.keys.up2 = true;
      if (k === "s" || k === "S") state.current.keys.down2 = true;
      if (state.current.mode !== "twoplayer") {
        if (k === "w" || k === "W") state.current.keys.up = true;
        if (k === "s" || k === "S") state.current.keys.down = true;
      }
      if (k === "Escape" || k === "p" || k === "P") {
        if (screen === "play" || screen === "paused") togglePause();
      }
      if (screen === "play") {
        if (k === " " || k === "Spacebar") { e.preventDefault(); activateSuper("p1"); }
        if (k === "Enter" && state.current.mode === "twoplayer") { e.preventDefault(); activateSuper("p2"); }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "ArrowUp") state.current.keys.up = false;
      if (k === "ArrowDown") state.current.keys.down = false;
      if (k === "w" || k === "W") { state.current.keys.up2 = false; state.current.keys.up = false; }
      if (k === "s" || k === "S") { state.current.keys.down2 = false; state.current.keys.down = false; }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [screen, activateSuper]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;

    const resize = () => {
      const parent = containerRef.current; if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const scale = Math.min(rect.width / BASE_W, rect.height / BASE_H);
      const w = BASE_W * scale, h = BASE_H * scale;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
      state.current.scale = scale;
    };
    resize();
    window.addEventListener("resize", resize);
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);

    const drawPaddle = (x: number, y: number, paddleId: string, variant: "player" | "ai", shielded: boolean, h: number = PADDLE_H, alpha: number = 1) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      const skin = getEquippedPreview(paddleId, "paddle:classic");
      const a = variant === "ai" ? "#3b0a0a" : (skin.a ?? "#1a1a1a");
      const b = variant === "ai" ? "#E5E7EB" : (skin.b ?? "#FFD700");
      const glow = variant === "ai" ? "#F87171" : (skin.glow ?? "#FFD700");
      ctx.shadowColor = glow; ctx.shadowBlur = 28;
      const grad = ctx.createLinearGradient(x, y, x + PADDLE_W, y);
      grad.addColorStop(0, a); grad.addColorStop(1, b);
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.roundRect(x, y, PADDLE_W, h, 7); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = glow; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = glow;
      ctx.globalAlpha = alpha * 0.55;
      ctx.fillRect(x + PADDLE_W / 2 - 1, y + 8, 2, h - 16);
      ctx.globalAlpha = alpha;
      if (shielded) {
        ctx.strokeStyle = POWER_COLORS.shield;
        ctx.lineWidth = 3;
        ctx.shadowColor = POWER_COLORS.shield; ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.roundRect(x - 6, y - 6, PADDLE_W + 12, h + 12, 12);
        ctx.stroke();
      }
      ctx.restore();
    };


    const endMatch = (w: Winner) => {
      const s = state.current;
      s.running = false;
      setWinner(w);
      // Build match summary & grant rewards
      const summary: MatchSummary = {
        won: w === "player",
        mode: s.mode,
        score: s.scores.player,
        opponentScore: s.scores.ai,
        pickups: s.pickups,
        maxRally: s.maxRally,
        comeback: s.wasDownBy3 && w === "player",
        perfect: s.scores.ai === 0 && w === "player",
      };
      // Skip rewards for 2-player local mode (no individual progression)
      if (s.mode !== "twoplayer") {
        const result = rewardsRef.current.grantMatchRewards(summary);
        setMatchPayout(result);
        // Update rolling player-skill tier (affects future matches)
        recordMatchResult(w === "player");
      } else {
        setMatchPayout(null);
      }

      // Leaderboard entry (only for solo wins)
      if (w === "player" && s.mode !== "twoplayer") {
        setSettings(prev => {
          const entry: LeaderEntry = {
            name: rewardsRef.current.rank.name.toUpperCase(),
            score: s.scores.player * 100 + s.maxRally * 5 + (s.mode === "boss" ? 500 : s.mode === "challenge" ? 250 : 0),
            mode: s.mode, date: Date.now(),
          };
          const lb = [...prev.leaderboard, entry].sort((a, b) => b.score - a.score).slice(0, 10);
          return { ...prev, leaderboard: lb };
        });
      }
      setScreen("end");
    };

    const loop = (tms: number) => {
      const s = state.current;
      const dtScale = s.timeScale;

      if (s.running && !s.paused) {
        // Inputs → Player1
        if (s.pointerY !== null) {
          const t = s.pointerY - PADDLE_H / 2;
          s.playerY += (t - s.playerY) * 0.35;
        }
        if (s.touchP1 !== null) {
          const t = s.touchP1 - PADDLE_H / 2;
          s.playerY += (t - s.playerY) * 0.4;
        }
        if (s.keys.up) s.playerY -= PADDLE_SPEED;
        if (s.keys.down) s.playerY += PADDLE_SPEED;
        s.playerY = Math.max(0, Math.min(BASE_H - PADDLE_H, s.playerY));

        // P2 / AI
        if (s.mode === "twoplayer") {
          if (s.pointerY2 !== null) {
            const t = s.pointerY2 - PADDLE_H / 2;
            s.aiY += (t - s.aiY) * 0.35;
          }
          if (s.touchP2 !== null) {
            const t = s.touchP2 - PADDLE_H / 2;
            s.aiY += (t - s.aiY) * 0.4;
          }
          if (s.keys.up2) s.aiY -= PADDLE_SPEED;
          if (s.keys.down2) s.aiY += PADDLE_SPEED;
        } else {
          // Adaptive AI: refresh params each frame so curve responds to score
          s.aiParams = getAIParams(s.mode, s.scores.player, s.scores.ai, s.winTarget, s.skillTier);
          const ap = s.aiParams;

          // Track ball with reaction delay buffer
          s.aiTargetBuf.push(s.ballY);
          if (s.aiTargetBuf.length > 60) s.aiTargetBuf.shift();
          const delayedBallY = s.aiTargetBuf[Math.max(0, s.aiTargetBuf.length - 1 - ap.reactionDelay)] ?? s.ballY;

          // Blend current vs predicted intercept
          const predicted = predictBallY(s.ballX, delayedBallY, s.ballVX, s.ballVY, BASE_W - 30 - PADDLE_W, BASE_H, BALL_R);
          const blendedTarget = delayedBallY * (1 - ap.predictionDepth) + predicted * ap.predictionDepth;
          const target = blendedTarget + (Math.random() - 0.5) * ap.trackingError;

          const aiCenter = s.aiY + PADDLE_H / 2;
          const diff = target - aiCenter;
          const move = Math.max(-ap.maxSpeed, Math.min(ap.maxSpeed, diff * 0.18));
          // Time Warp slows opponent (AI)
          const nowTW = performance.now();
          const twP1 = s.activeSuperP1?.id === "timewarp" && (s.activeSuperP1.until ?? 0) > nowTW;
          s.aiY += move * dtScale * (twP1 ? 0.45 : 1);
        }


        s.aiY = Math.max(0, Math.min(BASE_H - PADDLE_H, s.aiY));

        const playerEff = s.effects.find(e => e.owner === "player");
        const aiEff = s.effects.find(e => e.owner === "ai");
        if (playerEff?.kind === "curve" || aiEff?.kind === "curve") {
          s.ballVY += s.ballSpin * 0.06;
        }
        const slowActive = s.effects.some(e => e.kind === "slow");

        // ===== Super: Time Warp (slows ball + opponent) =====
        const nowTs = performance.now();
        const tw1 = s.activeSuperP1?.id === "timewarp" && (s.activeSuperP1.until ?? 0) > nowTs;
        const tw2 = s.activeSuperP2?.id === "timewarp" && (s.activeSuperP2.until ?? 0) > nowTs;
        const ballSlowFactor = (tw1 || tw2) ? 0.45 : (slowActive ? 0.55 : 1);
        const effectiveDt = ballSlowFactor < 1 ? dtScale * ballSlowFactor : dtScale;

        // ===== Super: Chain Lightning (ball zig-zag while in flight) =====
        if (s.chainOnBall) {
          s.ballVY += Math.sin(tms * 0.018) * 1.1;
        }

        s.ballX += s.ballVX * effectiveDt;
        s.ballY += s.ballVY * effectiveDt;

        if (s.ballY - BALL_R < 0) { s.ballY = BALL_R; s.ballVY = -s.ballVY; beep(440, 0.04, "square", 0.07); }
        if (s.ballY + BALL_R > BASE_H) { s.ballY = BASE_H - BALL_R; s.ballVY = -s.ballVY; beep(440, 0.04, "square", 0.07); }

        // Mirror Wall: paddle height multiplier
        const mirrorP1 = s.activeSuperP1?.id === "mirror" && (s.activeSuperP1.until ?? 0) > nowTs;
        const mirrorP2 = s.activeSuperP2?.id === "mirror" && (s.activeSuperP2.until ?? 0) > nowTs;
        const playerH = mirrorP1 ? PADDLE_H * 2 : PADDLE_H;
        const aiH = (s.mode === "twoplayer" && mirrorP2) ? PADDLE_H * 2 : PADDLE_H;

        const collide = (paddleX: number, paddleY: number, side: "player" | "ai", pH: number) => {
          const isPlayer = side === "player";
          const dirIn = isPlayer ? s.ballVX < 0 : s.ballVX > 0;
          const xCond = isPlayer
            ? (s.ballX - BALL_R < paddleX + PADDLE_W && s.ballX - BALL_R > paddleX - 6)
            : (s.ballX + BALL_R > paddleX && s.ballX + BALL_R < paddleX + PADDLE_W + 6);
          if (!dirIn || !xCond) return false;
          if (s.ballY < paddleY || s.ballY > paddleY + pH) return false;

          // Chain Lightning pierce
          if (s.chainOnBall === "player" && side === "ai") {
            s.chainOnBall = null;
            spawnHitParticles(s.ballX, s.ballY, "#FACC15", 24);
            beep(1200, 0.08, "sawtooth", 0.2);
            return false;
          }
          if (s.chainOnBall === "ai" && side === "player") {
            s.chainOnBall = null;
            spawnHitParticles(s.ballX, s.ballY, "#FACC15", 24);
            return false;
          }

          const hit = (s.ballY - (paddleY + pH / 2)) / (pH / 2);
          let speed = Math.min(BALL_MAX_SPEED, Math.hypot(s.ballVX, s.ballVY) * 1.08);
          const eff = s.effects.find(e => e.owner === side);
          if (eff?.kind === "smash") {
            speed = Math.min(BALL_MAX_SPEED + 4, speed * 1.6);
            s.smashFor = side;
          }
          if (eff?.kind === "fire") s.ballFire = true;
          if (eff?.kind === "curve") s.ballSpin = hit * 4;
          else s.ballSpin = 0;

          // Super: Meteor Smash / Chain on next hit
          const sup = isPlayer ? s.activeSuperP1 : (s.mode === "twoplayer" ? s.activeSuperP2 : null);
          let superTriggered: SuperId | null = null;
          if (sup?.pendingHit && sup.id === "meteor") {
            speed = Math.min(BALL_MAX_SPEED + 8, speed * 2.5);
            s.ballFire = true;
            s.smashFor = side;
            s.shake = 22;
            superTriggered = "meteor";
            if (isPlayer) s.activeSuperP1 = null; else s.activeSuperP2 = null;
          }
          if (sup?.pendingHit && sup.id === "chain") {
            speed = Math.min(BALL_MAX_SPEED + 4, speed * 1.4);
            s.chainOnBall = side;
            superTriggered = "chain";
            if (isPlayer) s.activeSuperP1 = null; else s.activeSuperP2 = null;
          }

          // AI smash from adaptive difficulty
          if (side === "ai" && s.mode !== "twoplayer" && Math.random() < s.aiParams.smashChance) {
            speed = Math.min(BALL_MAX_SPEED + 2, speed * 1.35);
          }

          const angle = isPlayer ? hit * 0.95 : Math.PI - hit * 0.95;
          s.ballVX = Math.cos(angle) * speed;
          s.ballVY = Math.sin(angle) * speed;
          s.ballX = isPlayer ? paddleX + PADDLE_W + BALL_R : paddleX - BALL_R;
          s.shake = Math.max(s.shake, Math.min(20, speed * 0.7));

          const skinPreview = getEquippedPreview(s.paddleId, "paddle:classic");
          const col = isPlayer ? (skinPreview.glow ?? "#FFD700") : "#F87171";
          const particleCount = superTriggered === "meteor" ? 40 : (eff?.kind === "smash" ? 28 : 16);
          spawnHitParticles(s.ballX, s.ballY, superTriggered === "chain" ? "#FACC15" : col, particleCount);
          if (eff?.kind === "smash" || superTriggered === "meteor") spawnSparkLine(s.ballX, s.ballY, "#FFD700");
          beep(580 + Math.abs(hit) * 220, 0.06, "square", 0.18);
          haptic(superTriggered ? 30 : (eff?.kind === "smash" ? 24 : 10));

          if (eff && (eff.kind === "smash" || eff.kind === "curve")) {
            s.effects = s.effects.filter(e => e !== eff);
          }

          // Super meter gain on rally hit
          if (s.mode !== "twoplayer") {
            if (isPlayer) s.superMeterP1 = Math.min(METER_MAX, s.superMeterP1 + METER_GAIN.rallyHit);
          } else {
            if (isPlayer) s.superMeterP1 = Math.min(METER_MAX, s.superMeterP1 + METER_GAIN.rallyHit);
            else          s.superMeterP2 = Math.min(METER_MAX, s.superMeterP2 + METER_GAIN.rallyHit);
          }

          s.rally += 1;
          if (s.rally > s.maxRally) {
            s.maxRally = s.rally;
            rewardsRef.current.recordRally(s.rally);
          }
          setRally(s.rally);
          return true;
        };

        const hitP = collide(30, s.playerY, "player", playerH);
        const hitA = !hitP && collide(BASE_W - 30 - PADDLE_W, s.aiY, "ai", aiH);

        // Phantom Clone: mirror ghost paddle
        const phP1 = s.activeSuperP1?.id === "phantom" && (s.activeSuperP1.until ?? 0) > nowTs;
        const phP2 = s.mode === "twoplayer" && s.activeSuperP2?.id === "phantom" && (s.activeSuperP2.until ?? 0) > nowTs;
        if (!hitP && !hitA && phP1) {
          const ghostY = BASE_H - s.playerY - PADDLE_H;
          collide(30, ghostY, "player", PADDLE_H);
        }
        if (!hitP && !hitA && phP2) {
          const ghostY = BASE_H - s.aiY - PADDLE_H;
          collide(BASE_W - 30 - PADDLE_W, ghostY, "ai", PADDLE_H);
        }


        // Powerup pickup
        s.powerups = s.powerups.filter(pu => {
          pu.bob += 0.08;
          const dx = s.ballX - pu.x, dy = s.ballY - pu.y;
          if (dx * dx + dy * dy < (BALL_R + 18) ** 2) {
            const owner: "player" | "ai" = s.ballVX > 0 ? "player" : "ai";
            const dur = pu.kind === "shield" ? 6000 : pu.kind === "slow" || pu.kind === "fire" ? 4500 : 8000;
            s.effects.push({ kind: pu.kind, owner, until: performance.now() + dur });
            setActiveBadges(prev => [...prev, { kind: pu.kind, owner, ms: dur }]);
            spawnHitParticles(pu.x, pu.y, POWER_COLORS[pu.kind], 20);
            beep(880, 0.18, "triangle", 0.2);
            haptic(15);
            if (owner === "player" && s.mode !== "twoplayer") {
              s.pickups += 1;
              rewardsRef.current.grantPickup();
              s.superMeterP1 = Math.min(METER_MAX, s.superMeterP1 + METER_GAIN.pickup);
            } else if (s.mode === "twoplayer") {
              if (owner === "player") s.superMeterP1 = Math.min(METER_MAX, s.superMeterP1 + METER_GAIN.pickup);
              else                    s.superMeterP2 = Math.min(METER_MAX, s.superMeterP2 + METER_GAIN.pickup);
            }
            return false;

          }
          return true;
        });

        if (tms > s.spawnAt && s.powerups.length < 2) {
          const pool: PowerKind[] = ["smash", "slow", "shield", "curve", "fire"];
          const kind = pool[Math.floor(Math.random() * pool.length)];
          s.powerups.push({
            x: BASE_W * 0.3 + Math.random() * BASE_W * 0.4,
            y: 80 + Math.random() * (BASE_H - 160),
            kind, bob: Math.random() * Math.PI * 2,
          });
          s.spawnAt = tms + 6000 + Math.random() * 4000;
        }

        const now = performance.now();
        const before = s.effects.length;
        s.effects = s.effects.filter(e => e.until > now);
        if (before !== s.effects.length) {
          setActiveBadges(s.effects.map(e => ({ kind: e.kind, owner: e.owner, ms: e.until - now })));
          if (!s.effects.some(e => e.kind === "fire")) s.ballFire = false;
        }

        // Score
        if (s.ballX < -20) {
          const shieldP = s.effects.find(e => e.owner === "player" && e.kind === "shield");
          if (shieldP) {
            s.effects = s.effects.filter(e => e !== shieldP);
            setActiveBadges(s.effects.map(e => ({ kind: e.kind, owner: e.owner, ms: e.until - now })));
            resetBall(1);
            beep(520, 0.15, "triangle", 0.22);
            s.flash = 18; s.flashColor = POWER_COLORS.shield;
          } else {
            s.scores.ai += 1;
            setScores({ ...s.scores });
            s.flash = 32; s.flashColor = "#EF4444";
            beep(180, 0.3, "sawtooth", 0.2);
            haptic(30);
            // Meter: player lost a point → catch-up gain
            s.superMeterP1 = Math.min(METER_MAX, s.superMeterP1 + METER_GAIN.pointLost);
            if (s.mode === "twoplayer") s.superMeterP2 = Math.min(METER_MAX, s.superMeterP2 + METER_GAIN.pointWon);
            if (s.scores.ai - s.scores.player >= 3) s.wasDownBy3 = true;
            if (s.scores.ai >= s.winTarget) endMatch("ai");
            else resetBall(1);
          }
        } else if (s.ballX > BASE_W + 20) {
          const shieldA = s.effects.find(e => e.owner === "ai" && e.kind === "shield");
          if (shieldA) {
            s.effects = s.effects.filter(e => e !== shieldA);
            setActiveBadges(s.effects.map(e => ({ kind: e.kind, owner: e.owner, ms: e.until - now })));
            resetBall(-1);
            beep(520, 0.15, "triangle", 0.22);
            s.flash = 18; s.flashColor = POWER_COLORS.shield;
          } else {
            s.scores.player += 1;
            setScores({ ...s.scores });
            s.flash = 34; s.flashColor = "#FFD700";
            beep(880, 0.22, "triangle", 0.22);
            beep(1320, 0.16, "triangle", 0.18);
            haptic(20);
            // Meter: point won
            s.superMeterP1 = Math.min(METER_MAX, s.superMeterP1 + METER_GAIN.pointWon);
            if (s.mode === "twoplayer") s.superMeterP2 = Math.min(METER_MAX, s.superMeterP2 + METER_GAIN.pointLost);
            if (s.mode !== "twoplayer") rewardsRef.current.recordPoint();
            if (s.scores.player >= s.winTarget) endMatch("player");
            else resetBall(-1);
          }
        }


        s.trail.push({ x: s.ballX, y: s.ballY });
        if (s.trail.length > 22) s.trail.shift();

        s.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vx *= 0.92; p.vy *= 0.92; p.life += 1; });
        s.particles = s.particles.filter(p => p.life < p.max);

        if (s.ballFire) {
          s.particles.push({
            x: s.ballX, y: s.ballY,
            vx: -s.ballVX * 0.05 + (Math.random() - 0.5),
            vy: -s.ballVY * 0.05 + (Math.random() - 0.5),
            life: 0, max: 22, color: Math.random() > 0.5 ? "#FBBF24" : "#F97316", size: 4,
          });
        }

        if (s.shake > 0) s.shake *= 0.85;
        if (s.flash > 0) s.flash -= 1;
        s.netWave += 0.05;

        // Sync super meter / AI tier label to component state (cheap throttle every ~6 frames)
        if ((tms | 0) % 6 === 0) {
          setSuperMeter(prev => {
            if (prev.p1 === s.superMeterP1 && prev.p2 === s.superMeterP2) return prev;
            return { p1: s.superMeterP1, p2: s.superMeterP2 };
          });
          setAiTierLabel(prev => prev === s.aiParams.tierLabel ? prev : s.aiParams.tierLabel);
        }
      }


      // ====== Draw ======
      ctx.save();
      const shakeX = (Math.random() - 0.5) * s.shake;
      const shakeY = (Math.random() - 0.5) * s.shake;
      ctx.translate(shakeX, shakeY);

      const table = getEquippedPreview(s.tableId, "table:midnight");
      const bg = ctx.createLinearGradient(0, 0, 0, BASE_H);
      bg.addColorStop(0, table.top ?? "#0a1a3d");
      bg.addColorStop(0.5, table.mid ?? "#0e2a5e");
      bg.addColorStop(1, table.top ?? "#0a1a3d");
      ctx.fillStyle = bg;
      ctx.fillRect(-20, -20, BASE_W + 40, BASE_H + 40);

      ctx.save();
      ctx.globalAlpha = 0.18;
      const lg1 = ctx.createRadialGradient(BASE_W * 0.2, BASE_H * 0.5, 20, BASE_W * 0.2, BASE_H * 0.5, 380);
      lg1.addColorStop(0, "#FFD70066"); lg1.addColorStop(1, "transparent");
      ctx.fillStyle = lg1; ctx.fillRect(0, 0, BASE_W, BASE_H);
      const lg2 = ctx.createRadialGradient(BASE_W * 0.8, BASE_H * 0.5, 20, BASE_W * 0.8, BASE_H * 0.5, 380);
      lg2.addColorStop(0, "#60A5FA66"); lg2.addColorStop(1, "transparent");
      ctx.fillStyle = lg2; ctx.fillRect(0, 0, BASE_W, BASE_H);
      ctx.restore();

      const lineColor = table.line ?? "#FFFFFF";
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = lineColor; ctx.lineWidth = 1;
      for (let i = 0; i < BASE_W; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, BASE_H); ctx.stroke(); }
      for (let j = 0; j < BASE_H; j += 40) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(BASE_W, j); ctx.stroke(); }
      ctx.globalAlpha = 1;

      ctx.strokeStyle = lineColor; ctx.lineWidth = 4;
      ctx.strokeRect(8, 8, BASE_W - 16, BASE_H - 16);

      ctx.setLineDash([14, 14]); ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.beginPath(); ctx.moveTo(BASE_W / 2, 12); ctx.lineTo(BASE_W / 2, BASE_H - 12); ctx.stroke();
      ctx.setLineDash([]);

      ctx.save();
      ctx.shadowColor = "#FFFFFF"; ctx.shadowBlur = 10;
      ctx.globalAlpha = 0.85;
      for (let y = 20; y < BASE_H - 20; y += 8) {
        const wob = Math.sin(s.netWave + y * 0.05) * 1.5;
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillRect(BASE_W / 2 - 2 + wob, y, 4, 4);
      }
      ctx.fillStyle = "#D1D5DB";
      ctx.fillRect(BASE_W / 2 - 6, 14, 12, 8);
      ctx.fillRect(BASE_W / 2 - 6, BASE_H - 22, 12, 8);
      ctx.restore();

      s.powerups.forEach(pu => {
        const r = 18 + Math.sin(pu.bob) * 2;
        ctx.save();
        ctx.shadowColor = POWER_COLORS[pu.kind]; ctx.shadowBlur = 24;
        ctx.fillStyle = POWER_COLORS[pu.kind] + "22";
        ctx.beginPath(); ctx.arc(pu.x, pu.y, r + 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = POWER_COLORS[pu.kind];
        ctx.beginPath(); ctx.arc(pu.x, pu.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#0a1a3d";
        ctx.font = "bold 20px Orbitron, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(POWER_GLYPH[pu.kind], pu.x, pu.y + 1);
        ctx.restore();
      });

      const ballSkin = getEquippedPreview(s.ballId, "ball:default");
      const trailColor = s.ballFire ? "#FB923C" : (ballSkin.glow ?? "#60A5FA");
      s.trail.forEach((t, i) => {
        const a = (i / s.trail.length) * 0.7;
        ctx.fillStyle = s.ballFire ? `rgba(251, 146, 60, ${a})` : trailColor;
        ctx.globalAlpha = s.ballFire ? 1 : a;
        ctx.shadowColor = trailColor; ctx.shadowBlur = 22;
        ctx.beginPath();
        ctx.arc(t.x, t.y, BALL_R * (i / s.trail.length) * 1.3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      const playerShield = s.effects.some(e => e.owner === "player" && e.kind === "shield");
      const aiShield = s.effects.some(e => e.owner === "ai" && e.kind === "shield");
      const nowDr = performance.now();
      const drMirrorP1 = s.activeSuperP1?.id === "mirror" && (s.activeSuperP1.until ?? 0) > nowDr;
      const drMirrorP2 = s.mode === "twoplayer" && s.activeSuperP2?.id === "mirror" && (s.activeSuperP2.until ?? 0) > nowDr;
      const drPhantomP1 = s.activeSuperP1?.id === "phantom" && (s.activeSuperP1.until ?? 0) > nowDr;
      const drPhantomP2 = s.mode === "twoplayer" && s.activeSuperP2?.id === "phantom" && (s.activeSuperP2.until ?? 0) > nowDr;
      drawPaddle(30, s.playerY, s.paddleId, "player", playerShield, drMirrorP1 ? PADDLE_H * 2 : PADDLE_H);
      drawPaddle(BASE_W - 30 - PADDLE_W, s.aiY, s.paddleId, "ai", aiShield, drMirrorP2 ? PADDLE_H * 2 : PADDLE_H);
      if (drPhantomP1) {
        drawPaddle(30, BASE_H - s.playerY - PADDLE_H, s.paddleId, "player", false, PADDLE_H, 0.45);
      }
      if (drPhantomP2) {
        drawPaddle(BASE_W - 30 - PADDLE_W, BASE_H - s.aiY - PADDLE_H, s.paddleId, "ai", false, PADDLE_H, 0.45);
      }


      ctx.save();
      const ballColor = s.ballFire ? "#FBBF24" : (ballSkin.glow ?? "#60A5FA");
      ctx.shadowColor = ballColor; ctx.shadowBlur = 32;
      const bgrad = ctx.createRadialGradient(s.ballX, s.ballY, 1, s.ballX, s.ballY, BALL_R);
      bgrad.addColorStop(0, "#FFFFFF");
      bgrad.addColorStop(0.6, s.ballFire ? "#FEF3C7" : "#E0F2FE");
      bgrad.addColorStop(1, ballColor);
      ctx.fillStyle = bgrad;
      ctx.beginPath(); ctx.arc(s.ballX, s.ballY, BALL_R, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      s.particles.forEach(p => {
        const a = 1 - p.life / p.max;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = a;
        ctx.shadowColor = p.color; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a + 1, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;

      if (s.flash > 0) {
        ctx.globalAlpha = (s.flash / 34) * 0.28;
        ctx.fillStyle = s.flashColor;
        ctx.fillRect(0, 0, BASE_W, BASE_H);
        ctx.globalAlpha = 1;
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener("resize", resize); ro.disconnect(); };
  }, [beep, resetBall]);

  // Pointer / touch
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * BASE_W;
    const y = ((e.clientY - rect.top) / rect.height) * BASE_H;
    if (state.current.mode === "twoplayer") {
      if (x < BASE_W / 2) state.current.pointerY = y; else state.current.pointerY2 = y;
    } else {
      state.current.pointerY = y;
    }
  };
  const onPointerLeave = () => { state.current.pointerY = null; state.current.pointerY2 = null; };
  const onTouchZone = (e: React.TouchEvent<HTMLDivElement>, side: "p1" | "p2") => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) { if (side === "p1") state.current.touchP1 = null; else state.current.touchP2 = null; return; }
    const ry = ((touch.clientY - rect.top) / rect.height) * BASE_H;
    if (side === "p1") state.current.touchP1 = ry; else state.current.touchP2 = ry;
  };

  const updateSettings = (patch: Partial<SettingsSave>) => setSettings(prev => ({ ...prev, ...patch }));

  const playerBadges = activeBadges.filter(b => b.owner === "player");
  const aiBadges = activeBadges.filter(b => b.owner === "ai");

  // Live coin counter shown during play (from rewards.coins)
  const liveCoins = rewards.coins;

  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden bg-background">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-[oklch(0.65_0.22_255/0.25)] blur-3xl" />
        <div className="absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-[oklch(0.82_0.17_85/0.2)] blur-3xl" />
      </div>

      {/* HUD */}
      {(screen === "play" || screen === "paused") && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-4 pt-3 sm:px-8 sm:pt-4">
          <div className="flex flex-col items-start">
            <span className="text-[10px] tracking-[0.3em] text-[oklch(0.82_0.17_85)] text-glow-gold sm:text-xs">
              {mode === "twoplayer" ? "P1" : "PLAYER"}
            </span>
            <AnimatedNumber value={scores.player} className="text-4xl font-black text-foreground text-glow-gold sm:text-6xl" />
            <div className="mt-1 flex gap-1">
              {playerBadges.map((b, i) => (
                <span key={i} className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: POWER_COLORS[b.kind] + "33", color: POWER_COLORS[b.kind] }}>
                  {POWER_LABEL[b.kind]}
                </span>
              ))}
            </div>
            <SuperMeterButton
              value={superMeter.p1}
              superId={rewards.data.equipped.super}
              onActivate={() => activateSuper("p1")}
              label="SPACE"
            />
          </div>
          <div className="flex flex-col items-center pt-1">
            <span className="text-[9px] tracking-[0.3em] text-muted-foreground sm:text-[10px]">
              {mode.toUpperCase()} · FIRST TO {state.current.winTarget}
            </span>
            <div className="mt-1 h-1 w-28 overflow-hidden rounded-full bg-muted sm:w-40">
              <div
                className="h-full bg-gradient-to-r from-[oklch(0.82_0.17_85)] to-[oklch(0.7_0.22_245)] transition-all"
                style={{ width: `${(Math.max(scores.player, scores.ai) / state.current.winTarget) * 100}%` }}
              />
            </div>
            {rally > 2 && (
              <span className="mt-1 text-[10px] font-bold tracking-[0.2em] text-[oklch(0.82_0.17_85)]">
                RALLY × {rally}
              </span>
            )}
            {mode !== "twoplayer" && aiTierLabel && (
              <span
                key={aiTierLabel}
                className="mt-1 rounded-full border border-[oklch(0.7_0.22_245/0.5)] bg-[oklch(0.7_0.22_245/0.12)] px-2 py-0.5 text-[9px] font-black tracking-[0.3em] text-[oklch(0.7_0.22_245)] animate-fade-in"
              >
                AI · {aiTierLabel}
              </span>
            )}
            {mode !== "twoplayer" && (
              <div className="mt-2 pointer-events-auto">
                <CoinChip coins={liveCoins} glow={false} />
              </div>
            )}
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] tracking-[0.3em] text-[oklch(0.7_0.22_245)] text-glow-electric sm:text-xs">
              {mode === "twoplayer" ? "P2" : mode === "boss" ? "BOSS" : "A.I."}
            </span>
            <AnimatedNumber value={scores.ai} className="text-4xl font-black text-foreground text-glow-electric sm:text-6xl" />
            <div className="mt-1 flex justify-end gap-1">
              {aiBadges.map((b, i) => (
                <span key={i} className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: POWER_COLORS[b.kind] + "33", color: POWER_COLORS[b.kind] }}>
                  {POWER_LABEL[b.kind]}
                </span>
              ))}
            </div>
            {mode === "twoplayer" && (
              <SuperMeterButton
                value={superMeter.p2}
                superId={rewards.data.equipped.super}
                onActivate={() => activateSuper("p2")}
                label="ENTER"
                align="end"
              />
            )}
          </div>
        </div>
      )}

      {/* Super Activation Banner */}
      {superBanner && (screen === "play" || screen === "paused") && (
        <SuperBanner id={superBanner.id} key={superBanner.ts} />
      )}


      {(screen === "play" || screen === "paused") && (
        <div className="absolute right-3 bottom-3 z-30 flex gap-2 sm:right-6 sm:bottom-6">
          <IconBtn onClick={() => updateSettings({ sfx: !settings.sfx })} label={settings.sfx ? "SFX" : "MUTE"} />
          <IconBtn onClick={togglePause} label={state.current.paused ? "▶" : "II"} />
        </div>
      )}

      <div ref={containerRef} className="absolute inset-0 flex items-center justify-center p-2 sm:p-6">
        <canvas
          ref={canvasRef}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          className="touch-none rounded-2xl border-2 border-[oklch(0.82_0.17_85/0.4)] shadow-[0_0_60px_oklch(0.65_0.22_255/0.4)]"
        />
      </div>

      {screen === "play" && (
        <>
          <div
            className="absolute inset-y-0 left-0 z-10 w-1/2 sm:hidden"
            onTouchStart={(e) => onTouchZone(e, "p1")}
            onTouchMove={(e) => onTouchZone(e, "p1")}
            onTouchEnd={() => { state.current.touchP1 = null; }}
          />
          {mode === "twoplayer" && (
            <div
              className="absolute inset-y-0 right-0 z-10 w-1/2 sm:hidden"
              onTouchStart={(e) => onTouchZone(e, "p2")}
              onTouchMove={(e) => onTouchZone(e, "p2")}
              onTouchEnd={() => { state.current.touchP2 = null; }}
            />
          )}
        </>
      )}

      {/* ===== START ===== */}
      {screen === "start" && (
        <Overlay>
          {/* Top-right coin chip */}
          <div className="absolute right-4 top-4 sm:right-8 sm:top-6">
            <CoinChip coins={rewards.coins} />
          </div>

          <Title />

          <div className="mt-6">
            <RankBar r={rewards} />
          </div>

          <div className="mt-6 w-full max-w-md">
            <SuperPicker r={rewards} />
          </div>


          <div className="mt-6 flex flex-col gap-3 sm:gap-4">
            <button onClick={() => setScreen("modes")} className="btn-arcade text-base sm:text-lg">Play</button>
            <MenuBtn onClick={() => setScreen("shop")}>Shop</MenuBtn>
            {rewards.canClaimDaily && (
              <button
                onClick={() => setShowDaily(true)}
                className="relative rounded-lg border border-[oklch(0.82_0.17_85)] bg-[oklch(0.82_0.17_85/0.15)] px-6 py-3 text-sm font-black tracking-[0.2em] uppercase text-[oklch(0.82_0.17_85)] backdrop-blur transition hover:bg-[oklch(0.82_0.17_85/0.25)]"
              >
                ★ Daily Reward
                <span className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-[oklch(0.82_0.17_85)]" />
              </button>
            )}
            <MenuBtn onClick={() => setScreen("leaderboard")}>Leaderboard</MenuBtn>
            <MenuBtn onClick={() => setScreen("settings")}>Settings</MenuBtn>
          </div>

          <div className="mt-8 flex items-center gap-4 text-[10px] tracking-[0.4em] text-muted-foreground">
            <span>WINS · {rewards.data.wins}</span>
            <span>·</span>
            <span>STREAK · {rewards.data.streak.count}</span>
          </div>

          {rewards.data.daily && !rewards.data.daily.challenge.claimed && (
            <div className="mt-5 w-full max-w-xs rounded-lg border border-[oklch(0.7_0.22_245/0.4)] bg-card/50 p-3 text-center">
              <p className="text-[9px] tracking-[0.3em] text-[oklch(0.7_0.22_245)]">DAILY CHALLENGE</p>
              <p className="mt-0.5 text-xs font-bold text-foreground">{rewards.data.daily.challenge.label}</p>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-[oklch(0.7_0.22_245)]" style={{ width: `${(rewards.data.daily.challenge.progress / rewards.data.daily.challenge.target) * 100}%` }} />
              </div>
              <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">
                {rewards.data.daily.challenge.progress}/{rewards.data.daily.challenge.target} · +{rewards.data.daily.challenge.reward}
              </p>
              {rewards.data.daily.challenge.progress >= rewards.data.daily.challenge.target && (
                <button
                  onClick={() => rewards.claimChallenge()}
                  className="mt-2 w-full rounded bg-[oklch(0.82_0.17_85)] py-1 text-[10px] font-black tracking-widest text-background"
                >
                  CLAIM +{rewards.data.daily.challenge.reward}
                </button>
              )}
            </div>
          )}
        </Overlay>
      )}

      {/* Daily Modal */}
      {showDaily && screen === "start" && (
        <DailyRewardModal r={rewards} onClose={() => setShowDaily(false)} />
      )}

      {/* ===== MODES ===== */}
      {screen === "modes" && (
        <Overlay>
          <h2 className="mb-6 text-2xl font-black uppercase tracking-[0.2em] text-foreground text-glow-gold sm:text-4xl">Choose Mode</h2>
          <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
            <ModeCard title="Arcade" desc="Classic. First to 7. +50 coins." accent="gold" onClick={() => startGame("arcade")} />
            <ModeCard title="Challenge" desc="Sharper AI. First to 9. +100." accent="electric" onClick={() => startGame("challenge")} />
            <ModeCard title="Boss Match" desc="Elite AI. First to 11. +250." accent="red" onClick={() => startGame("boss")} />
            <ModeCard title="2 Player Local" desc="Split touch. W/S vs ↑/↓." accent="violet" onClick={() => startGame("twoplayer")} />
          </div>
          <BackBtn onClick={() => setScreen("start")} />
        </Overlay>
      )}

      {/* ===== SHOP ===== */}
      {screen === "shop" && (
        <Overlay>
          <ShopScreen r={rewards} onBack={() => setScreen("start")} />
        </Overlay>
      )}

      {/* ===== SETTINGS ===== */}
      {screen === "settings" && (
        <Overlay>
          <h2 className="mb-6 text-2xl font-black uppercase tracking-[0.2em] text-foreground text-glow-gold sm:text-4xl">Settings</h2>
          <div className="flex w-full max-w-sm flex-col gap-3">
            <Toggle label="Sound Effects" value={settings.sfx} onChange={v => updateSettings({ sfx: v })} />
            <Toggle label="Music" value={settings.music} onChange={v => updateSettings({ music: v })} />
            <Toggle label="Haptics" value={settings.haptics} onChange={v => updateSettings({ haptics: v })} />
            <button
              onClick={() => { if (confirm("Reset ALL progress, coins, unlocks, and leaderboard?")) { rewards.reset(); setSettings(defaultSettings); } }}
              className="mt-4 rounded-lg border border-destructive/40 px-4 py-2 text-xs font-bold tracking-widest text-destructive hover:bg-destructive/10"
            >
              RESET PROGRESS
            </button>
          </div>
          <BackBtn onClick={() => setScreen("start")} />
        </Overlay>
      )}

      {/* ===== LEADERBOARD ===== */}
      {screen === "leaderboard" && (
        <Overlay>
          <h2 className="mb-6 text-2xl font-black uppercase tracking-[0.2em] text-foreground text-glow-gold sm:text-4xl">Leaderboard</h2>
          <div className="w-full max-w-md rounded-xl border border-border bg-card/40 p-4">
            {settings.leaderboard.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Win a match to make the board.</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {settings.leaderboard.map((e, i) => (
                  <li key={i} className="flex items-center justify-between rounded-md bg-background/40 px-3 py-2 text-sm">
                    <span className="flex items-center gap-3">
                      <span className="w-6 text-[oklch(0.82_0.17_85)] font-black">#{i + 1}</span>
                      <span className="font-bold tracking-widest">{e.name}</span>
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{e.mode}</span>
                    </span>
                    <span className="font-black text-foreground text-glow-gold">{e.score}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <BackBtn onClick={() => setScreen("start")} />
        </Overlay>
      )}

      {/* ===== PAUSED ===== */}
      {screen === "paused" && (
        <Overlay>
          <h2 className="mb-6 text-3xl font-black uppercase tracking-[0.25em] text-foreground text-glow-gold sm:text-5xl">Paused</h2>
          <div className="flex flex-col gap-3">
            <button onClick={togglePause} className="btn-arcade">Resume</button>
            <MenuBtn onClick={() => { state.current.running = false; state.current.paused = false; setScreen("start"); }}>Main Menu</MenuBtn>
          </div>
        </Overlay>
      )}

      {/* ===== END ===== */}
      {screen === "end" && (
        <Overlay>
          <p className="mb-2 text-xs tracking-[0.4em] text-muted-foreground">MATCH OVER</p>
          <h2
            className={`mb-2 text-center text-5xl font-black uppercase tracking-widest sm:text-7xl ${
              winner === "player" ? "text-[oklch(0.82_0.17_85)] text-glow-gold" : "text-[oklch(0.65_0.24_25)]"
            }`}
            style={{ textShadow: winner === "ai" ? "0 0 30px oklch(0.6 0.24 25 / 0.7)" : undefined }}
          >
            {winner === "player" ? (mode === "twoplayer" ? "P1 Wins" : "Victory") : (mode === "twoplayer" ? "P2 Wins" : "Defeat")}
          </h2>
          <p className="mb-6 text-xl font-bold tracking-[0.2em] text-foreground sm:text-2xl">
            {scores.player} <span className="text-muted-foreground">—</span> {scores.ai}
          </p>

          {matchPayout && <PostMatchPayout result={matchPayout} />}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button onClick={() => startGame(mode)} className="btn-arcade">Play Again</button>
            <MenuBtn onClick={() => setScreen("shop")}>Shop</MenuBtn>
            <MenuBtn onClick={() => setScreen("modes")}>Change Mode</MenuBtn>
            <MenuBtn onClick={() => setScreen("start")}>Main Menu</MenuBtn>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function Title() {
  return (
    <div className="text-center">
      <p className="mb-2 text-[10px] tracking-[0.5em] text-muted-foreground sm:text-xs">PREMIUM · ARCADE · TABLE TENNIS</p>
      <h1 className="flex flex-col items-center gap-1 font-black uppercase text-foreground">
        <span className="text-4xl leading-none tracking-[0.12em] text-glow-gold sm:text-7xl">
          Paddle <span className="text-[oklch(0.7_0.22_245)] text-glow-electric">Clash</span>
        </span>
        <span className="text-3xl tracking-[0.4em] sm:text-5xl">Arena</span>
      </h1>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center overflow-y-auto bg-background/90 px-6 py-10 backdrop-blur-md">
      <div className="flex flex-col items-center animate-fade-in">{children}</div>
    </div>
  );
}

function MenuBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-border bg-card/60 px-6 py-3 text-sm font-bold tracking-[0.2em] uppercase text-foreground backdrop-blur transition hover:border-[oklch(0.82_0.17_85)] hover:bg-card"
    >
      {children}
    </button>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-8 text-[11px] tracking-[0.4em] text-muted-foreground hover:text-foreground"
    >
      ← BACK
    </button>
  );
}

function IconBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="min-w-12 rounded-md border border-border bg-card/70 px-3 py-2 text-xs font-bold tracking-widest text-foreground backdrop-blur transition hover:border-[oklch(0.82_0.17_85)]"
    >
      {label}
    </button>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex items-center justify-between rounded-lg border border-border bg-card/60 px-4 py-3 text-left"
    >
      <span className="text-sm font-bold tracking-widest uppercase text-foreground">{label}</span>
      <span className={`relative h-6 w-11 rounded-full transition ${value ? "bg-[oklch(0.82_0.17_85)]" : "bg-muted"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition-all ${value ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function ModeCard({ title, desc, accent, onClick }: { title: string; desc: string; accent: "gold" | "electric" | "red" | "violet"; onClick: () => void }) {
  const colors = {
    gold: "oklch(0.82 0.17 85)", electric: "oklch(0.7 0.22 245)",
    red: "oklch(0.65 0.24 25)", violet: "oklch(0.65 0.22 305)",
  };
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-xl border border-border bg-card/60 p-5 text-left transition hover:scale-[1.02]"
      style={{ boxShadow: `inset 0 0 0 1px ${colors[accent]}33` }}
    >
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl opacity-40 transition group-hover:opacity-80" style={{ background: colors[accent] }} />
      <h3 className="relative text-xl font-black uppercase tracking-widest" style={{ color: colors[accent], textShadow: `0 0 16px ${colors[accent]}66` }}>{title}</h3>
      <p className="relative mt-1 text-xs text-muted-foreground">{desc}</p>
    </button>
  );
}

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [pop, setPop] = useState(false);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) { setPop(true); const t = setTimeout(() => setPop(false), 280); prev.current = value; return () => clearTimeout(t); }
  }, [value]);
  return <span className={`${className ?? ""} inline-block transition-transform ${pop ? "scale-125" : "scale-100"}`}>{value}</span>;
}

// ===== Super HUD components =====
function SuperMeterButton({
  value, superId, onActivate, label, align = "start",
}: {
  value: number; superId: SuperId; onActivate: () => void; label: string; align?: "start" | "end";
}) {
  const def = getSuper(superId);
  const ready = value >= METER_MAX;
  const pct = Math.min(100, (value / METER_MAX) * 100);
  return (
    <button
      onClick={onActivate}
      disabled={!ready}
      className={`pointer-events-auto mt-2 flex items-center gap-2 rounded-md border px-2 py-1 backdrop-blur transition ${
        ready
          ? "border-[color:var(--super-c)] bg-[color:var(--super-c)]/15 shadow-[0_0_18px_color-mix(in_oklab,var(--super-c)_60%,transparent)] animate-pulse"
          : "border-border bg-card/50 opacity-80"
      } ${align === "end" ? "flex-row-reverse" : ""}`}
      style={{ ["--super-c" as string]: def.color }}
      aria-label={`Activate ${def.name}`}
    >
      <span className="text-base leading-none" style={{ color: def.color, textShadow: ready ? `0 0 10px ${def.color}` : undefined }}>
        {def.glyph}
      </span>
      <div className="flex flex-col">
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:w-24">
          <div className="h-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${def.color}, #FFD700)` }} />
        </div>
        <span className="mt-0.5 text-[8px] tracking-[0.25em] text-muted-foreground">
          {ready ? `READY · ${label}` : def.short.toUpperCase()}
        </span>
      </div>
    </button>
  );
}

function SuperBanner({ id }: { id: SuperId }) {
  const def = getSuper(id);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-1/3 z-40 flex justify-center">
      <div
        className="rounded-xl border-2 px-6 py-3 backdrop-blur-md animate-fade-in"
        style={{
          borderColor: def.color,
          background: `${def.color}22`,
          boxShadow: `0 0 48px ${def.color}88`,
        }}
      >
        <p className="text-center text-[10px] tracking-[0.5em]" style={{ color: def.color }}>SUPER POWER</p>
        <p className="text-center text-3xl font-black uppercase tracking-[0.18em] text-foreground sm:text-4xl"
           style={{ textShadow: `0 0 18px ${def.color}` }}>
          {def.glyph} {def.name}
        </p>
      </div>
    </div>
  );
}

function SuperPicker({ r }: { r: ReturnType<typeof useRewards> }) {
  const equipped = r.data.equipped.super;
  return (
    <div className="flex flex-col items-center">
      <p className="mb-2 text-[10px] tracking-[0.4em] text-muted-foreground">SUPER POWER</p>
      <div className="grid w-full grid-cols-5 gap-2">
        {SUPERS.map(def => {
          const owned = r.isSuperOwned(def.id);
          const isEquipped = equipped === def.id;
          const canBuy = def.unlock.type === "coins" && r.canPurchaseSuper(def.id).ok;
          const click = () => {
            if (owned) r.equipSuper(def.id);
            else if (canBuy) r.purchaseSuper(def.id);
          };
          return (
            <button
              key={def.id}
              onClick={click}
              disabled={!owned && !canBuy}
              className={`group relative flex flex-col items-center rounded-lg border p-2 transition ${
                isEquipped
                  ? "border-[color:var(--c)] bg-[color:var(--c)]/15 shadow-[0_0_18px_color-mix(in_oklab,var(--c)_50%,transparent)]"
                  : owned
                    ? "border-border bg-card/50 hover:border-[color:var(--c)]"
                    : "border-border bg-card/20 opacity-60"
              }`}
              style={{ ["--c" as string]: def.color }}
              title={def.desc}
            >
              <span className="text-xl leading-none" style={{ color: def.color, textShadow: owned ? `0 0 10px ${def.color}` : undefined }}>
                {def.glyph}
              </span>
              <span className="mt-1 text-[9px] font-black tracking-wider text-foreground">{def.short.toUpperCase()}</span>
              <span className="text-[8px] tracking-wider text-muted-foreground">
                {isEquipped ? "EQUIPPED" : owned ? "EQUIP" : superUnlockLabel(def)}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[9px] text-muted-foreground">
        Tap to {SUPERS.some(s => !r.isSuperOwned(s.id)) ? "equip / buy" : "equip"} · Activate in-game with SPACE
      </p>
    </div>
  );
}

