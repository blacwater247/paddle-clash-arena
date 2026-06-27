## Problem

Two independent audio systems play the same `stages.mp3`:

- `src/components/LandingPage.tsx` constructs its own `new Audio(stagesAsset.url)` at volume `0.5`.
- `src/components/PaddleClashArena.tsx` uses the shared engine in `src/lib/music.ts` (also default volume `0.5`), which calls `playTrack("stages" | "boss" | "shop")`.

When navigating between `/` and `/play` (or when autoplay finally unlocks after a gesture), both instances can be active at once, producing the overlap. Volume is also too loud.

## Fix

1. **Unify on the shared engine in `LandingPage.tsx`:**
   - Remove the local `new Audio(...)` + `audioRef` + manual play/pause logic.
   - On mount: `armMusic()` after first user gesture (pointerdown/keydown/touchstart), then `flushArmed()`; call `playTrack("stages")`. Also call `playTrack("stages")` directly inside the gesture handler so the first user click both arms and starts.
   - The "Hear OST" / "Pause Preview" buttons toggle via `setMusicMuted(true|false)` (track keeps looping in the engine, so navigating to `/play` seamlessly continues the same `stages` track instead of starting a second one).
   - On unmount: do NOT call `stopAllMusic()` — let the engine keep ownership so the arena route can continue the same track without restarting.

2. **Lower default volume** in `src/lib/music.ts`: change initial `volume: 0.5` to `volume: 0.3`. This is the single source of truth now that the landing page uses the engine.

3. **Arena already calls `playTrack("stages" | "boss" | "shop")`** based on screen/mode — no change needed there. Since the engine early-returns when `current === id`, navigating from landing → /play (both on "stages") will not restart or double-play.

## Files

- `src/components/LandingPage.tsx` — replace local audio with shared engine calls; button toggles muted state.
- `src/lib/music.ts` — default `volume: 0.3`.

No changes to game logic, rewards, HUD, or routing.