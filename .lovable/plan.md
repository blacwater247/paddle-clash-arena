## Goal
Make Paddle Clash Arena fully usable on phones — both the landing page (`/`) and the game (`/play`) — without changing gameplay or business logic.

## What's broken on mobile today
1. **Global `body { overflow: hidden }` + `touch-action: none`** in `src/styles.css` kills vertical scrolling. The landing page is long (Hero → Features → Stages → Boss → Ranks → OST → CTA → Footer) so phone users can't reach anything below the hero.
2. **Landing page**: no mobile nav, hero stat row wraps awkwardly on small widths, CTA buttons stretch full-width-ish but stat labels and section paddings (`py-24`) are too tall for phones.
3. **Game HUD** (`PaddleClashArena.tsx`): top bar packs Back / Score / Speed / Super meters / Rally — already has `sm:` tweaks but the start/modes/shop/settings overlays use desktop spacing (`text-3xl`, big paddings) that overflow narrow screens.
4. **Orientation**: game is designed for landscape (1024×640 base) but phones open the landing page in portrait, then `/play` in portrait too. No prompt to rotate.
5. **Capacitor wrappers** (iOS + Android docs) already recommend landscape but the web app doesn't enforce or hint it.
6. **Safe areas**: `body` already pads `env(safe-area-inset-*)`, but absolutely-positioned overlays in the game (Back button, HUD) sit under the notch on iPhone.

## Plan

### 1. Scoping CSS so scroll works on content pages but not the game canvas
File: `src/styles.css`
- Remove the global `body { overflow: hidden }` and `touch-action: none`.
- Add a new utility class `.app-lock` that applies `overflow: hidden; touch-action: none; overscroll-behavior: none;` and attach it only to the game container in `PaddleClashArena.tsx` (the existing `h-[100dvh] w-screen` root).
- Keep `canvas { touch-action: none }` so paddle drags don't scroll the page.
- Keep `env(safe-area-inset-*)` body padding.

### 2. Landing page mobile polish
File: `src/components/LandingPage.tsx`
- Hero: drop `pt-12 pb-32 → pt-8 pb-20`, `text-5xl → text-4xl` on phones; collapse stat row into a 2×2 grid under `sm:`.
- CTA buttons: stack vertically full-width on mobile (`flex-col sm:flex-row`, `w-full sm:w-auto`).
- Reduce section `py-24 → py-14 sm:py-24` on Features, Stages, Boss, Ranks.
- Stages: keep 2-col grid on phones, shrink card height `h-32 → h-24 sm:h-32`.
- Boss section: stack columns on mobile (already `md:grid-cols-2` — confirm image block shrinks to `aspect-[4/3]` on phones).
- Header: hide nav links on phones (already `hidden md:flex`), keep Play button — make logo + Play fit narrower viewport (smaller text, less padding).
- Final CTA card padding `p-12 → p-6 sm:p-12`.

### 3. Game screen mobile polish
File: `src/components/PaddleClashArena.tsx`
- Wrap the root container with `app-lock` class plus `pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]` so HUD/Back button clear the notch.
- Start / Modes / Shop / Settings / Leaderboard / End overlays: convert oversized headings (`text-3xl`/`text-5xl`) to responsive (`text-2xl sm:text-4xl`), shrink button padding, allow vertical scroll inside overlays (`overflow-y-auto` already on shop — apply to all).
- Add a small **"Rotate your device for best play"** hint that appears only when `window.innerHeight > window.innerWidth` AND viewport width < 640px. Dismissible. Doesn't block play.
- Touch paddle control already works (`pointerY`/`touchP1`); confirm the touch zones cover the full left/right halves on small screens — already the case.

### 4. Capacitor / native shell
Files: `capacitor.config.ts` (no change needed) + `IOS_BUILD.md` / `ANDROID_BUILD.md` (already document landscape lock).
- No code change required; the rotate hint covers web users who can't lock orientation.

### 5. Verify
- Use `preview_ui--set_preview_device_viewport` → mobile, scroll through landing page end-to-end, then enter `/play` and confirm: HUD readable, Back button tappable above notch, paddle drag works, no horizontal scroll, overlays scroll when tall.
- Build runs clean.

## Out of scope
- Gameplay tuning, AI, music, rewards logic.
- Native splash screens / app icons (handled in the Capacitor docs).
- PWA install prompt (separate request).
