// Soundtrack engine: 3 looping tracks (stages, boss, shop) with crossfade.
// Browser autoplay rules: only starts after a user gesture. Call armMusic()
// from any click handler before relying on playTrack().

import stagesAsset from "@/assets/music-stages.mp3.asset.json";
import bossAsset from "@/assets/music-boss.mp3.asset.json";
import shopAsset from "@/assets/music-shop.mp3.asset.json";

export type TrackId = "stages" | "boss" | "shop" | null;

const SRC: Record<Exclude<TrackId, null>, string> = {
  stages: stagesAsset.url,
  boss: bossAsset.url,
  shop: shopAsset.url,
};

interface Engine {
  audios: Partial<Record<Exclude<TrackId, null>, HTMLAudioElement>>;
  current: TrackId;
  volume: number;
  muted: boolean;
  armed: boolean;
  pendingFades: number[];
}

let engine: Engine | null = null;

function getEngine(): Engine | null {
  if (typeof window === "undefined") return null;
  if (!engine) {
    engine = { audios: {}, current: null, volume: 0.3, muted: false, armed: false, pendingFades: [] };
  }
  return engine;
}

function getAudio(id: Exclude<TrackId, null>): HTMLAudioElement | null {
  const e = getEngine(); if (!e) return null;
  let a = e.audios[id];
  if (!a) {
    a = new Audio(SRC[id]);
    a.loop = true;
    a.preload = "auto";
    a.volume = 0;
    e.audios[id] = a;
  }
  return a;
}

function clearFades() {
  const e = getEngine(); if (!e) return;
  e.pendingFades.forEach(id => window.clearInterval(id));
  e.pendingFades = [];
}

function fade(audio: HTMLAudioElement, to: number, ms: number, onDone?: () => void) {
  const e = getEngine(); if (!e) return;
  const steps = 14;
  const stepMs = Math.max(16, Math.floor(ms / steps));
  const from = audio.volume;
  let i = 0;
  const id = window.setInterval(() => {
    i++;
    audio.volume = Math.max(0, Math.min(1, from + (to - from) * (i / steps)));
    if (i >= steps) {
      window.clearInterval(id);
      e.pendingFades = e.pendingFades.filter(x => x !== id);
      onDone?.();
    }
  }, stepMs);
  e.pendingFades.push(id);
}

/** Mark that the user has interacted, so audio.play() is allowed. */
export function armMusic() {
  const e = getEngine(); if (!e) return;
  e.armed = true;
}

export function setMusicVolume(v: number) {
  const e = getEngine(); if (!e) return;
  e.volume = Math.max(0, Math.min(1, v));
  if (e.current && !e.muted) {
    const a = e.audios[e.current];
    if (a) a.volume = e.volume;
  }
}

export function setMusicMuted(muted: boolean) {
  const e = getEngine(); if (!e) return;
  e.muted = muted;
  if (e.current) {
    const a = e.audios[e.current];
    if (!a) return;
    if (muted) { a.volume = 0; }
    else { fade(a, e.volume, 250); }
  }
}

export function playTrack(id: TrackId) {
  const e = getEngine(); if (!e) return;
  if (!e.armed) { e.current = id; return; } // remember selection; will start when armed
  if (e.current === id) return;
  clearFades();
  const prev = e.current ? e.audios[e.current] : null;
  e.current = id;
  if (prev) fade(prev, 0, 350, () => { try { prev.pause(); } catch {} });
  if (id) {
    const next = getAudio(id);
    if (next) {
      next.volume = 0;
      const target = e.muted ? 0 : e.volume;
      const p = next.play();
      if (p && typeof p.catch === "function") p.catch(() => { /* autoplay blocked */ });
      fade(next, target, 400);
    }
  }
}

/** Call after first user gesture to start any pending track. */
export function flushArmed() {
  const e = getEngine(); if (!e || !e.armed || !e.current) return;
  const a = getAudio(e.current); if (!a) return;
  a.volume = 0;
  const target = e.muted ? 0 : e.volume;
  const p = a.play();
  if (p && typeof p.catch === "function") p.catch(() => {});
  fade(a, target, 400);
}

export function stopAllMusic() {
  const e = getEngine(); if (!e) return;
  clearFades();
  Object.values(e.audios).forEach(a => { if (a) { try { a.pause(); } catch {} a.volume = 0; } });
  e.current = null;
}
