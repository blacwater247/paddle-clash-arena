import { useCallback, useEffect, useRef, useState } from "react";

type Screen = "start" | "play" | "end";
type Winner = "player" | "ai" | null;

const WIN_SCORE = 7;
const BASE_W = 1024;
const BASE_H = 640;
const PADDLE_W = 18;
const PADDLE_H = 100;
const BALL_R = 9;
const PADDLE_SPEED = 9;
const BALL_BASE_SPEED = 7;
const BALL_MAX_SPEED = 18;
const AI_SPEED = 6.2;

interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; max: number; color: string;
}
interface TrailPoint { x: number; y: number; life: number; }

export default function PaddleClashArena() {
  const [screen, setScreen] = useState<Screen>("start");
  const [winner, setWinner] = useState<Winner>(null);
  const [scores, setScores] = useState({ player: 0, ai: 0 });
  const [musicOn, setMusicOn] = useState(false);
  const [sfxOn, setSfxOn] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  // Game state in refs (no re-render per frame)
  const state = useRef({
    playerY: BASE_H / 2 - PADDLE_H / 2,
    aiY: BASE_H / 2 - PADDLE_H / 2,
    ballX: BASE_W / 2,
    ballY: BASE_H / 2,
    ballVX: BALL_BASE_SPEED,
    ballVY: 2,
    shake: 0,
    trail: [] as TrailPoint[],
    particles: [] as Particle[],
    flash: 0,
    flashColor: "#FFD700",
    scoredCooldown: 0,
    keys: { up: false, down: false },
    pointerY: null as number | null,
    scores: { player: 0, ai: 0 },
    running: false,
    scale: 1,
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const musicNodesRef = useRef<{ osc: OscillatorNode; gain: GainNode; interval: number } | null>(null);

  const getAudio = () => {
    if (!audioCtxRef.current) {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
      if (Ctx) audioCtxRef.current = new Ctx();
    }
    return audioCtxRef.current;
  };

  const beep = useCallback((freq: number, dur = 0.08, type: OscillatorType = "square", vol = 0.15) => {
    if (!sfxOn) return;
    const ctx = getAudio();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
  }, [sfxOn]);

  const startMusic = useCallback(() => {
    const ctx = getAudio();
    if (!ctx || musicNodesRef.current) return;
    const notes = [220, 277, 330, 277, 247, 330, 392, 330];
    let i = 0;
    const gain = ctx.createGain();
    gain.gain.value = 0.04;
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = notes[0];
    osc.connect(gain);
    osc.start();
    const interval = window.setInterval(() => {
      i = (i + 1) % notes.length;
      osc.frequency.setValueAtTime(notes[i], ctx.currentTime);
    }, 280);
    musicNodesRef.current = { osc, gain, interval };
  }, []);

  const stopMusic = useCallback(() => {
    const n = musicNodesRef.current;
    if (!n) return;
    clearInterval(n.interval);
    try { n.osc.stop(); } catch {}
    n.gain.disconnect();
    musicNodesRef.current = null;
  }, []);

  useEffect(() => {
    if (musicOn && screen === "play") startMusic();
    else stopMusic();
    return () => stopMusic();
  }, [musicOn, screen, startMusic, stopMusic]);

  const resetBall = useCallback((toward: 1 | -1) => {
    const s = state.current;
    s.ballX = BASE_W / 2;
    s.ballY = BASE_H / 2;
    const angle = (Math.random() * 0.6 - 0.3);
    s.ballVX = toward * BALL_BASE_SPEED * Math.cos(angle);
    s.ballVY = BALL_BASE_SPEED * Math.sin(angle) + (Math.random() - 0.5) * 2;
    s.trail = [];
  }, []);

  const startGame = useCallback(() => {
    state.current.scores = { player: 0, ai: 0 };
    state.current.playerY = BASE_H / 2 - PADDLE_H / 2;
    state.current.aiY = BASE_H / 2 - PADDLE_H / 2;
    setScores({ player: 0, ai: 0 });
    setWinner(null);
    resetBall(Math.random() > 0.5 ? 1 : -1);
    state.current.running = true;
    setScreen("play");
    getAudio()?.resume();
  }, [resetBall]);

  const spawnHitParticles = (x: number, y: number, color: string) => {
    const s = state.current;
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 5;
      s.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0, max: 24 + Math.random() * 14, color,
      });
    }
  };

  // Input
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") state.current.keys.up = true;
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") state.current.keys.down = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") state.current.keys.up = false;
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") state.current.keys.down = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const parent = containerRef.current;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const scale = Math.min(rect.width / BASE_W, rect.height / BASE_H);
      const w = BASE_W * scale;
      const h = BASE_H * scale;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
      state.current.scale = scale;
    };
    resize();
    window.addEventListener("resize", resize);

    const drawPaddle = (x: number, y: number, color1: string, color2: string, glow: string) => {
      ctx.save();
      ctx.shadowColor = glow;
      ctx.shadowBlur = 25;
      const grad = ctx.createLinearGradient(x, y, x + PADDLE_W, y);
      grad.addColorStop(0, color1);
      grad.addColorStop(1, color2);
      ctx.fillStyle = grad;
      const r = 6;
      ctx.beginPath();
      ctx.roundRect(x, y, PADDLE_W, PADDLE_H, r);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = glow;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    };

    const loop = () => {
      const s = state.current;
      // Update
      if (s.running) {
        // Player control: keys + pointer
        if (s.pointerY !== null) {
          const target = s.pointerY - PADDLE_H / 2;
          s.playerY += (target - s.playerY) * 0.35;
        }
        if (s.keys.up) s.playerY -= PADDLE_SPEED;
        if (s.keys.down) s.playerY += PADDLE_SPEED;
        s.playerY = Math.max(0, Math.min(BASE_H - PADDLE_H, s.playerY));

        // AI follow with ease + reaction delay
        const aiCenter = s.aiY + PADDLE_H / 2;
        const target = s.ballY + (Math.random() - 0.5) * 30;
        const diff = target - aiCenter;
        const move = Math.max(-AI_SPEED, Math.min(AI_SPEED, diff * 0.12));
        s.aiY += move;
        s.aiY = Math.max(0, Math.min(BASE_H - PADDLE_H, s.aiY));

        // Ball
        s.ballX += s.ballVX;
        s.ballY += s.ballVY;

        // Walls
        if (s.ballY - BALL_R < 0) {
          s.ballY = BALL_R; s.ballVY = -s.ballVY;
          beep(440, 0.05, "square", 0.08);
        }
        if (s.ballY + BALL_R > BASE_H) {
          s.ballY = BASE_H - BALL_R; s.ballVY = -s.ballVY;
          beep(440, 0.05, "square", 0.08);
        }

        // Paddle collision - player
        if (
          s.ballVX < 0 &&
          s.ballX - BALL_R < 40 + PADDLE_W &&
          s.ballX - BALL_R > 30 &&
          s.ballY > s.playerY &&
          s.ballY < s.playerY + PADDLE_H
        ) {
          const hit = (s.ballY - (s.playerY + PADDLE_H / 2)) / (PADDLE_H / 2);
          const speed = Math.min(BALL_MAX_SPEED, Math.hypot(s.ballVX, s.ballVY) * 1.08);
          const angle = hit * 0.9;
          s.ballVX = Math.cos(angle) * speed;
          s.ballVY = Math.sin(angle) * speed;
          s.ballX = 40 + PADDLE_W + BALL_R;
          s.shake = Math.min(12, speed * 0.6);
          spawnHitParticles(s.ballX, s.ballY, "#FFD700");
          beep(660 + Math.abs(hit) * 200, 0.06, "square", 0.18);
        }
        // Paddle collision - AI
        if (
          s.ballVX > 0 &&
          s.ballX + BALL_R > BASE_W - 40 - PADDLE_W &&
          s.ballX + BALL_R < BASE_W - 30 &&
          s.ballY > s.aiY &&
          s.ballY < s.aiY + PADDLE_H
        ) {
          const hit = (s.ballY - (s.aiY + PADDLE_H / 2)) / (PADDLE_H / 2);
          const speed = Math.min(BALL_MAX_SPEED, Math.hypot(s.ballVX, s.ballVY) * 1.08);
          const angle = Math.PI - hit * 0.9;
          s.ballVX = Math.cos(angle) * speed;
          s.ballVY = Math.sin(angle) * speed;
          s.ballX = BASE_W - 40 - PADDLE_W - BALL_R;
          s.shake = Math.min(12, speed * 0.6);
          spawnHitParticles(s.ballX, s.ballY, "#60A5FA");
          beep(520 + Math.abs(hit) * 200, 0.06, "square", 0.18);
        }

        // Score
        if (s.ballX < -20) {
          s.scores.ai += 1;
          setScores({ ...s.scores });
          s.flash = 30; s.flashColor = "#EF4444";
          beep(180, 0.3, "sawtooth", 0.2);
          if (s.scores.ai >= WIN_SCORE) {
            s.running = false;
            setWinner("ai");
            setScreen("end");
          } else resetBall(1);
        } else if (s.ballX > BASE_W + 20) {
          s.scores.player += 1;
          setScores({ ...s.scores });
          s.flash = 30; s.flashColor = "#FFD700";
          beep(880, 0.25, "triangle", 0.22);
          beep(1320, 0.18, "triangle", 0.18);
          if (s.scores.player >= WIN_SCORE) {
            s.running = false;
            setWinner("player");
            setScreen("end");
          } else resetBall(-1);
        }

        // Trail
        s.trail.push({ x: s.ballX, y: s.ballY, life: 0 });
        if (s.trail.length > 18) s.trail.shift();
        s.trail.forEach((t) => (t.life += 1));

        // Particles
        s.particles.forEach((p) => {
          p.x += p.vx; p.y += p.vy; p.vx *= 0.92; p.vy *= 0.92; p.life += 1;
        });
        s.particles = s.particles.filter((p) => p.life < p.max);

        if (s.shake > 0) s.shake *= 0.85;
        if (s.flash > 0) s.flash -= 1;
      }

      // Draw
      ctx.save();
      const shakeX = (Math.random() - 0.5) * s.shake;
      const shakeY = (Math.random() - 0.5) * s.shake;
      ctx.translate(shakeX, shakeY);

      // Table background
      const bg = ctx.createLinearGradient(0, 0, 0, BASE_H);
      bg.addColorStop(0, "#0a1a3d");
      bg.addColorStop(0.5, "#0e2a5e");
      bg.addColorStop(1, "#0a1a3d");
      ctx.fillStyle = bg;
      ctx.fillRect(-20, -20, BASE_W + 40, BASE_H + 40);

      // Subtle grid texture
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1;
      for (let i = 0; i < BASE_W; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, BASE_H); ctx.stroke();
      }
      for (let j = 0; j < BASE_H; j += 40) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(BASE_W, j); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Boundary lines
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 4;
      ctx.strokeRect(8, 8, BASE_W - 16, BASE_H - 16);

      // Center dashed line
      ctx.setLineDash([14, 14]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.moveTo(BASE_W / 2, 12); ctx.lineTo(BASE_W / 2, BASE_H - 12);
      ctx.stroke();
      ctx.setLineDash([]);

      // Net
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "#C0C7D4";
      ctx.fillRect(BASE_W / 2 - 3, 20, 6, BASE_H - 40);
      ctx.fillStyle = "#FFFFFF";
      for (let y = 24; y < BASE_H - 24; y += 10) {
        ctx.fillRect(BASE_W / 2 - 2, y, 4, 2);
      }
      ctx.fillStyle = "#9CA3AF";
      ctx.fillRect(BASE_W / 2 - 5, 14, 10, 8);
      ctx.fillRect(BASE_W / 2 - 5, BASE_H - 22, 10, 8);
      ctx.restore();

      // Trail
      s.trail.forEach((t, i) => {
        const a = (i / s.trail.length) * 0.6;
        ctx.fillStyle = `rgba(96, 165, 250, ${a})`;
        ctx.shadowColor = "#60A5FA";
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(t.x, t.y, BALL_R * (i / s.trail.length) * 1.2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      // Paddles
      drawPaddle(30, s.playerY, "#1a1a1a", "#FFD700", "#FFD700");
      drawPaddle(BASE_W - 30 - PADDLE_W, s.aiY, "#7f1d1d", "#E5E7EB", "#D1D5DB");

      // Ball
      ctx.save();
      ctx.shadowColor = "#60A5FA";
      ctx.shadowBlur = 28;
      const bgrad = ctx.createRadialGradient(s.ballX, s.ballY, 1, s.ballX, s.ballY, BALL_R);
      bgrad.addColorStop(0, "#FFFFFF");
      bgrad.addColorStop(0.7, "#E0F2FE");
      bgrad.addColorStop(1, "#60A5FA");
      ctx.fillStyle = bgrad;
      ctx.beginPath();
      ctx.arc(s.ballX, s.ballY, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Particles
      s.particles.forEach((p) => {
        const a = 1 - p.life / p.max;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = a;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 * a + 1, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Score flash overlay
      if (s.flash > 0) {
        ctx.globalAlpha = (s.flash / 30) * 0.25;
        ctx.fillStyle = s.flashColor;
        ctx.fillRect(0, 0, BASE_W, BASE_H);
        ctx.globalAlpha = 1;
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [beep, resetBall]);

  // Pointer handlers on canvas
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const y = ((e.clientY - rect.top) / rect.height) * BASE_H;
    state.current.pointerY = y;
  };
  const onPointerLeave = () => { state.current.pointerY = null; };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-[oklch(0.65_0.22_255/0.25)] blur-3xl" />
        <div className="absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-[oklch(0.82_0.17_85/0.2)] blur-3xl" />
      </div>

      {/* HUD */}
      {screen === "play" && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-6 pt-4 sm:px-10">
          <div className="flex flex-col items-start">
            <span className="text-xs tracking-[0.3em] text-[oklch(0.82_0.17_85)] text-glow-gold">PLAYER</span>
            <span className="text-5xl font-black text-foreground text-glow-gold sm:text-6xl">{scores.player}</span>
          </div>
          <div className="flex flex-col items-center pt-2">
            <span className="text-[10px] tracking-[0.4em] text-muted-foreground">FIRST TO {WIN_SCORE}</span>
            <div className="mt-1 h-1 w-32 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-gradient-to-r from-[oklch(0.82_0.17_85)] to-[oklch(0.7_0.22_245)] transition-all"
                style={{ width: `${(Math.max(scores.player, scores.ai) / WIN_SCORE) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs tracking-[0.3em] text-[oklch(0.7_0.22_245)] text-glow-electric">A.I.</span>
            <span className="text-5xl font-black text-foreground text-glow-electric sm:text-6xl">{scores.ai}</span>
          </div>
        </div>
      )}

      {/* Audio toggles */}
      <div className="absolute right-4 top-4 z-30 flex gap-2 sm:right-6">
        <button
          onClick={() => setMusicOn((v) => !v)}
          className="rounded-md border border-border bg-card/70 px-3 py-1.5 text-[10px] font-bold tracking-widest text-foreground backdrop-blur transition hover:border-[oklch(0.82_0.17_85)]"
        >
          MUSIC {musicOn ? "ON" : "OFF"}
        </button>
        <button
          onClick={() => setSfxOn((v) => !v)}
          className="rounded-md border border-border bg-card/70 px-3 py-1.5 text-[10px] font-bold tracking-widest text-foreground backdrop-blur transition hover:border-[oklch(0.7_0.22_245)]"
        >
          SFX {sfxOn ? "ON" : "OFF"}
        </button>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="absolute inset-0 flex items-center justify-center p-4 sm:p-8">
        <canvas
          ref={canvasRef}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          className="touch-none rounded-2xl border-2 border-[oklch(0.82_0.17_85/0.4)] shadow-[0_0_60px_oklch(0.65_0.22_255/0.4)]"
        />
      </div>

      {/* Start screen */}
      {screen === "start" && (
        <Overlay>
          <h1 className="mb-2 text-center text-5xl font-black uppercase tracking-[0.15em] text-foreground text-glow-gold sm:text-7xl">
            Paddle <span className="text-[oklch(0.7_0.22_245)] text-glow-electric">Clash</span> Arena
          </h1>
          <p className="mb-8 text-center text-sm tracking-[0.3em] text-muted-foreground sm:text-base">
            FIRST TO {WIN_SCORE} POINTS WINS
          </p>
          <div className="mb-10 grid max-w-md gap-2 text-center text-xs leading-relaxed text-muted-foreground sm:text-sm">
            <p><span className="text-[oklch(0.82_0.17_85)]">MOUSE / TOUCH</span> — move your paddle</p>
            <p><span className="text-[oklch(0.82_0.17_85)]">↑ / ↓  or  W / S</span> — keyboard control</p>
            <p>Hit the ball past the AI to score. Ball gets faster every hit.</p>
          </div>
          <button onClick={startGame} className="btn-arcade text-lg">Start Game</button>
        </Overlay>
      )}

      {/* End screen */}
      {screen === "end" && (
        <Overlay>
          <p className="mb-2 text-sm tracking-[0.4em] text-muted-foreground">MATCH OVER</p>
          <h2
            className={`mb-2 text-center text-6xl font-black uppercase tracking-widest sm:text-8xl ${
              winner === "player"
                ? "text-[oklch(0.82_0.17_85)] text-glow-gold"
                : "text-[oklch(0.65_0.24_25)]"
            }`}
            style={{ textShadow: winner === "ai" ? "0 0 30px oklch(0.6 0.24 25 / 0.7)" : undefined }}
          >
            {winner === "player" ? "Victory" : "Defeat"}
          </h2>
          <p className="mb-10 text-2xl font-bold tracking-[0.2em] text-foreground sm:text-3xl">
            {scores.player} <span className="text-muted-foreground">—</span> {scores.ai}
          </p>
          <button onClick={startGame} className="btn-arcade text-lg">Play Again</button>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-background/85 backdrop-blur-md">
      <div className="flex flex-col items-center px-6 animate-fade-in">{children}</div>
    </div>
  );
}
