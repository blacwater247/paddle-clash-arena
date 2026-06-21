# Plan: Landing Page + Pro-Gamer Music System

## 1. Landing Page (new `/` route)

Move the current game from `/` to `/play`, and make `/` a marketing-style landing page styled for a pro-gamer audience.

Sections:
- **Hero** — Animated arena background, big logo "PADDLE CLASH ARENA", tagline, primary CTA "Play Now" → `/play`, secondary "How to Play".
- **Feature grid** — Power-ups, Super Powers, Boss Battles, Stages/Arenas, 2-Player, Shop & Ranks.
- **Stages showcase** — Carousel of arena tables (Midnight, Volcano, Cyber Grid, Sky Temple…) with names + unlock level.
- **Boss preview** — Tease of boss matches with stats (HP, special moves).
- **Ranks ladder** — Rookie → Arena God progression visual.
- **Soundtrack strip** — "Featuring an original soundtrack" with a 🔊 preview button (plays a short clip of the stage track).
- **Final CTA + footer**.

Visual direction: dark slate background, neon cyan/gold accents, sharp angular cards, subtle scanlines/grid, Orbitron/Rajdhani-style display font for headings (loaded via `<link>` in `__root.tsx`).

SEO: route-specific `head()` with title, description, OG tags, og:image (generated hero image).

## 2. In-Game Music System

Three uploaded tracks become the soundtrack, uploaded as CDN assets via `lovable-assets`:

| Track file | Role in game |
|---|---|
| `DIFFENERENT STAGES.mp3` | Default match music (Arcade / Challenge / 2-Player) |
| `BOSS LEVEL AND DIFFERENT STAGES.mp3` | Boss matches |
| `WHEN SHOPPING MUSIIC.mp3` | Shop / Rewards UI screen |

Implementation:
- New `src/lib/music.ts` — singleton `HTMLAudioElement` per track, with `playTrack(id)`, `stop()`, `setVolume()`, crossfade on switch, loop=true, respects `settings.musicMuted` and `settings.musicVolume` (default 0.5).
- Hydration-safe: only starts after first user interaction (browser autoplay policy) — listen for first click on the Play/Start button.
- Hook `useGameMusic(screen, mode)` inside `PaddleClashArena` picks the right track:
  - `screen === "shop"` → shopping track
  - `screen === "playing" && mode === "boss"` → boss track
  - `screen === "playing"` (other modes) → stages track
  - otherwise → fade out (menu silence)
- Landing page: silent by default; soundtrack preview button plays a 15-second sample of the stages track.

## 3. Settings additions

Extend `useSettings` (in `PaddleClashArena.tsx`) with `musicMuted: boolean` and `musicVolume: number`. Add a 🎵 toggle + volume slider in the in-game header next to existing SFX controls. Persist to localStorage with same hydration-safe pattern already used.

## 4. Routing

- `src/routes/index.tsx` → new `LandingPage` component (file `src/components/LandingPage.tsx`).
- `src/routes/play.tsx` → renders `PaddleClashArena` (move existing meta there, update canonical).
- Update internal links and the "Play" CTA to use `<Link to="/play">`.
- Update `sitemap[.]xml.ts` to include both routes.

## Technical notes

- Asset uploads: `lovable-assets create --file /mnt/user-uploads/<name>.mp3 --filename <slug>.mp3 > src/assets/<slug>.mp3.asset.json`, then import the JSON for `audio.src = asset.url`.
- All audio code runs only after mount + first user gesture to avoid SSR/autoplay issues (same hydration pattern as recent rewards fix).
- Hero og:image generated via imagegen (premium tier for legible logo text).
- No changes to game logic, rewards, AI, or super-powers — purely additive.

## Out of scope

- New stage/boss content (existing tables and boss mode remain as-is).
- Per-stage unique tracks beyond the three provided.
- Online multiplayer / accounts.
