import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import heroImg from "@/assets/landing-hero.jpg";
import { armMusic, flushArmed, playTrack, setMusicMuted } from "@/lib/music";

const FEATURES = [
  { icon: "⚡", title: "Power-Ups", body: "Smash, Slow, Shield, Curve & Fire — grab them mid-rally to swing the game." },
  { icon: "✸", title: "Super Powers", body: "Meteor Strike, Mirror Wall, Phantom Clone, Chain Lightning — equip your ultimate." },
  { icon: "👑", title: "Boss Battles", body: "Bigger paddles. Brutal AI. Take down arena bosses for huge coin rewards." },
  { icon: "🏟", title: "8+ Arenas", body: "Midnight Blue, Volcano, Cyber Grid, Sky Temple — unlock new stages as you rank up." },
  { icon: "👥", title: "Local 2-Player", body: "Hand the controls to a friend on the same screen. Bragging rights on the line." },
  { icon: "🪙", title: "Shop & Ranks", body: "Earn coins, level Rookie → Arena God, equip paddles, ball trails & victory FX." },
];

const STAGES = [
  { name: "Midnight Blue", req: "Starter", colors: ["#0a1a3d", "#0e2a5e", "#FFFFFF"] },
  { name: "Championship Pro", req: "Lv 1", colors: ["#0b1d56", "#1e3a8a", "#FFD700"] },
  { name: "Emerald Court", req: "Lv 1", colors: ["#052e1f", "#064e3b", "#FCD34D"] },
  { name: "Neon Thunder", req: "Lv 6", colors: ["#020617", "#0a1a3d", "#3B82F6"] },
  { name: "Volcano", req: "Lv 11", colors: ["#1c0701", "#7c2d12", "#F97316"] },
  { name: "Inferno Forge", req: "Lv 11", colors: ["#0a0500", "#3b1a05", "#F97316"] },
  { name: "Sky Temple", req: "Lv 16", colors: ["#0b1233", "#1e2a6b", "#FCD34D"] },
  { name: "Cyber Grid", req: "Lv 1", colors: ["#020617", "#1e293b", "#22D3EE"] },
];

const RANKS = [
  { name: "Rookie", color: "#94A3B8" },
  { name: "Amateur", color: "#FCD34D" },
  { name: "Pro", color: "#22D3EE" },
  { name: "Champion", color: "#F472B6" },
  { name: "Legend", color: "#A855F7" },
  { name: "Arena God", color: "#FFD700" },
];

export default function LandingPage() {
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    // Select the stages track in the shared engine; will start when armed.
    playTrack("stages");

    const startOnInteract = () => {
      armMusic();
      flushArmed();
      setMusicMuted(false);
      setPlaying(true);
      cleanup();
    };
    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "touchstart"];
    events.forEach(ev =>
      window.addEventListener(ev, startOnInteract, { once: true, passive: true } as AddEventListenerOptions)
    );
    const cleanup = () => events.forEach(ev => window.removeEventListener(ev, startOnInteract));
    return cleanup;
    // Note: don't stopAllMusic on unmount — let the engine continue into /play seamlessly.
  }, []);

  const togglePreview = () => {
    armMusic();
    flushArmed();
    if (playing) { setMusicMuted(true); setPlaying(false); }
    else { setMusicMuted(false); setPlaying(true); }
  };


  return (
    <div className="min-h-screen bg-[#05070f] text-white overflow-hidden">
      {/* Top nav */}
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-display text-lg tracking-[0.25em] font-bold">
          <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee]" />
          PADDLE<span className="text-cyan-400">CLASH</span>
        </div>
        <nav className="hidden gap-8 text-sm uppercase tracking-widest text-white/60 md:flex">
          <a href="#features" className="hover:text-white">Features</a>
          <a href="#stages" className="hover:text-white">Stages</a>
          <a href="#boss" className="hover:text-white">Boss</a>
          <a href="#ranks" className="hover:text-white">Ranks</a>
        </nav>
        <Link
          to="/play"
          className="rounded-md border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-400/20"
        >
          Play
        </Link>
      </header>

      {/* HERO */}
      <section className="relative">
        <div
          className="absolute inset-0 -z-0 bg-cover bg-center opacity-60"
          style={{ backgroundImage: `url(${heroImg})` }}
        />
        <div className="absolute inset-0 -z-0 bg-gradient-to-b from-[#05070f]/40 via-[#05070f]/70 to-[#05070f]" />
        <div
          className="absolute inset-0 -z-0 opacity-20 mix-blend-screen"
          style={{
            backgroundImage:
              "linear-gradient(rgba(34,211,238,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.25) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative mx-auto max-w-5xl px-6 pt-12 pb-32 text-center md:pt-20 md:pb-44">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-cyan-300 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
            Now Playing — Season 1
          </div>
          <h1 className="font-display text-5xl font-black uppercase leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
            <span className="block text-white drop-shadow-[0_0_25px_rgba(34,211,238,0.4)]">PADDLE CLASH</span>
            <span className="block bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300 bg-clip-text text-transparent">
              ARENA
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-white/70 md:text-lg">
            Fast-paced arcade table tennis with super-powers, boss battles, and an original soundtrack.
            Rise from Rookie to Arena God.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/play"
              className="group relative inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-cyan-400 to-blue-500 px-8 py-4 font-display text-base font-bold uppercase tracking-widest text-black shadow-[0_0_40px_rgba(34,211,238,0.5)] transition hover:scale-[1.02] hover:shadow-[0_0_60px_rgba(34,211,238,0.8)]"
            >
              ▶ Play Now
            </Link>
            <a
              href="#features"
              className="rounded-md border border-white/20 bg-white/5 px-6 py-4 font-display text-sm font-bold uppercase tracking-widest text-white/80 backdrop-blur transition hover:bg-white/10"
            >
              How to Play
            </a>
            <button
              onClick={togglePreview}
              className="inline-flex items-center gap-2 rounded-md border border-yellow-400/30 bg-yellow-400/5 px-5 py-4 font-display text-sm font-bold uppercase tracking-widest text-yellow-300 transition hover:bg-yellow-400/15"
            >
              {playing ? "■ Stop" : "♪ Hear OST"}
            </button>
          </div>

          <div className="mt-14 flex flex-wrap justify-center gap-8 text-xs uppercase tracking-widest text-white/40">
            <div><span className="block font-display text-2xl text-white">7</span>Win Score</div>
            <div><span className="block font-display text-2xl text-white">4</span>Game Modes</div>
            <div><span className="block font-display text-2xl text-white">30</span>Rank Levels</div>
            <div><span className="block font-display text-2xl text-white">8+</span>Arenas</div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative mx-auto max-w-7xl px-6 py-24">
        <SectionTitle eyebrow="Loadout" title="Built for clutch moments" />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-6 transition hover:border-cyan-400/40"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded bg-cyan-400/10 text-xl text-cyan-300">
                {f.icon}
              </div>
              <h3 className="font-display text-lg font-bold uppercase tracking-wider text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{f.body}</p>
              <div className="pointer-events-none absolute -bottom-px left-0 h-px w-full bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent opacity-0 transition group-hover:opacity-100" />
            </div>
          ))}
        </div>
      </section>

      {/* STAGES */}
      <section id="stages" className="relative border-y border-white/5 bg-black/40 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionTitle eyebrow="Arenas" title="Eight stages. One king." />
          <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4">
            {STAGES.map(s => (
              <div key={s.name} className="group overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
                <div
                  className="relative h-32 w-full"
                  style={{
                    background: `linear-gradient(135deg, ${s.colors[0]} 0%, ${s.colors[1]} 100%)`,
                  }}
                >
                  <div
                    className="absolute left-1/2 top-1/2 h-[2px] w-[80%] -translate-x-1/2 -translate-y-1/2"
                    style={{ background: s.colors[2], boxShadow: `0 0 10px ${s.colors[2]}` }}
                  />
                  <div
                    className="absolute left-1/2 top-1/2 h-[60%] w-[2px] -translate-x-1/2 -translate-y-1/2"
                    style={{ background: `${s.colors[2]}80` }}
                  />
                </div>
                <div className="flex items-center justify-between p-3">
                  <div className="font-display text-xs font-bold uppercase tracking-wider text-white">{s.name}</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/40">{s.req}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOSS */}
      <section id="boss" className="relative mx-auto max-w-7xl px-6 py-24">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <SectionTitle eyebrow="Boss Mode" title="Beat the unbeatable" />
            <p className="mt-6 text-white/70">
              Boss matches throw bigger paddles, sharper AI reflexes, and a soundtrack
              that hits harder. Win and you walk away with{" "}
              <span className="font-display text-yellow-300">250 coins</span> plus a
              shot at the Arena God ladder.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3 text-center">
              <Stat n="2×" l="Paddle" />
              <Stat n="+50%" l="AI Reflex" />
              <Stat n="250" l="Coin Bounty" />
            </div>
            <Link
              to="/play"
              className="mt-8 inline-block rounded-md border border-rose-400/40 bg-rose-500/10 px-6 py-3 font-display text-sm font-bold uppercase tracking-widest text-rose-300 transition hover:bg-rose-500/20"
            >
              Challenge Boss →
            </Link>
          </div>
          <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-rose-500/20 bg-gradient-to-br from-rose-950/40 via-black to-black p-8">
            <div className="absolute inset-0 opacity-30" style={{
              backgroundImage: "radial-gradient(circle at 50% 50%, rgba(244,63,94,0.4), transparent 60%)"
            }} />
            <div className="relative flex h-full flex-col items-center justify-center text-center">
              <div className="font-display text-7xl">👑</div>
              <div className="mt-3 font-display text-3xl font-black uppercase tracking-widest text-rose-200">Boss</div>
              <div className="mt-1 text-xs uppercase tracking-[0.3em] text-rose-300/60">Final Round</div>
              <div className="mt-6 flex w-full max-w-xs flex-col gap-1.5">
                <div className="flex justify-between text-[10px] uppercase tracking-widest text-rose-300/60">
                  <span>HP</span><span>100%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-black/60">
                  <div className="h-full w-full bg-gradient-to-r from-rose-500 to-rose-300" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RANKS */}
      <section id="ranks" className="relative border-t border-white/5 bg-black/40 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionTitle eyebrow="Progression" title="Rookie to Arena God" />
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            {RANKS.map((r, i) => (
              <div key={r.name} className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-4 py-3">
                  <span className="h-2 w-2 rounded-full" style={{ background: r.color, boxShadow: `0 0 8px ${r.color}` }} />
                  <span className="font-display text-xs font-bold uppercase tracking-wider" style={{ color: r.color }}>
                    {r.name}
                  </span>
                </div>
                {i < RANKS.length - 1 && <span className="text-white/20">→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOUNDTRACK STRIP */}
      <section className="relative mx-auto max-w-5xl px-6 py-20 text-center">
        <SectionTitle eyebrow="Audio" title="An original soundtrack" />
        <p className="mt-6 text-white/60">
          Three custom tracks score every match — stages, boss fights, and the shop.
          Headphones recommended.
        </p>
        <button
          onClick={togglePreview}
          className="mt-8 inline-flex items-center gap-3 rounded-full border border-yellow-400/30 bg-yellow-400/5 px-6 py-3 font-display text-sm font-bold uppercase tracking-widest text-yellow-300 transition hover:bg-yellow-400/15"
        >
          {playing ? "■ Pause Preview" : "♪ Play OST Preview"}
        </button>
      </section>

      {/* FINAL CTA */}
      <section className="relative mx-auto max-w-4xl px-6 pb-24 text-center">
        <div className="relative overflow-hidden rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 via-blue-600/5 to-transparent p-12">
          <h2 className="font-display text-3xl font-black uppercase tracking-tight md:text-5xl">
            Drop in. <span className="text-cyan-300">Drop bombs.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/60">
            Free to play in your browser. No sign-up. First to 7 takes the round.
          </p>
          <Link
            to="/play"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-cyan-400 to-blue-500 px-10 py-4 font-display text-base font-bold uppercase tracking-widest text-black shadow-[0_0_40px_rgba(34,211,238,0.5)] transition hover:scale-[1.02]"
          >
            ▶ Enter Arena
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 text-center text-xs uppercase tracking-widest text-white/30">
        Paddle Clash Arena — Built for clutch moments.
      </footer>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-cyan-300/80">{eyebrow}</div>
      <h2 className="mt-3 font-display text-3xl font-black uppercase tracking-tight md:text-5xl">{title}</h2>
    </div>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] py-3">
      <div className="font-display text-2xl font-black text-white">{n}</div>
      <div className="mt-1 text-[10px] uppercase tracking-widest text-white/40">{l}</div>
    </div>
  );
}
