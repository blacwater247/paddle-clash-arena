## Problem

Mid-match, the game jumps back to the start screen instead of letting the match finish. There's no code path in `PaddleClashArena.tsx` that calls `setScreen("start")` during play — `endMatch` only sets `"end"`, and pause only toggles `"play"` ↔ `"paused"`. So the screen is being reset because **the component (or its parent) is remounting**, which throws `useState<Screen>("start")` back to its initial value.

Two strong suspects, both introduced in the recent Super Powers / Adaptive AI / new shop items work:

### Suspect 1 — Hydration mismatch triggers tree regeneration
The current runtime error log shows:

```
Hydration failed because the server rendered text didn't match the client.
CoinChip coins={358}  (client)  vs  200 (server)
```

React's response is "this tree will be regenerated on the client". On the very first client render after hydration that's a partial unmount/remount of the subtree containing `PaddleClashArena`, which resets `screen` to `"start"`. The mismatch comes from `useRewards()` reading `localStorage` synchronously during render — SSR sees defaults (200 coins), client sees the saved value (358 coins).

### Suspect 2 — Throw inside `endMatch` / super-power effect crashes the loop
If `getSuper(s.superId)`, `recordMatchResult`, `grantMatchRewards`, or the new Mirror Wall / Phantom Clone / Chain Lightning branches throw, the React error boundary above this route can unmount `PaddleClashArena`. Next render → fresh `useState("start")`. Likely triggers: `equipped.super` missing from older saved data (migration gap), or `activeSuperP1.until` being read when `pendingHit` is set, etc.

## Fix

### 1. Eliminate the SSR/CSR hydration mismatch (root cause #1)
- Change `useRewards()` (and any `localStorage`-reading state) to initialize with the **default** value, then hydrate from `localStorage` inside a `useEffect`. Render coins / XP / owned items as `0` / empty on the server pass, then update once on the client.
- Same treatment for `useSettings()` and `getSkillTier()` if they read storage during render.
- Verify by reloading mid-match: the runtime hydration error should be gone.

### 2. Guard the super-power / rewards code paths (root cause #2)
- In `rewards.ts`, harden the localStorage migration: when loading old saves missing `equipped.super` / `ownedSupers`, fill in `{ super: "meteor", ownedSupers: ["meteor"] }` before returning. Same for any new SHOP_ITEMS the user hasn't seen.
- In `PaddleClashArena.tsx` `activateSuper` and per-frame effect tick, fall back to `getSuper("meteor")` if `getSuper(s.superId)` returns undefined, and skip effects whose `until` is undefined for time-based powers.
- Wrap `endMatch`'s reward block in a `try/catch` that still calls `setScreen("end")` even if reward grant throws, so a single bad reward can never bounce the player to start.

### 3. Add a top-level error boundary that does NOT remount the whole arena
Wrap `PaddleClashArena` in a small error boundary (or use the existing one) that shows an inline "Something broke — return to menu" panel **without** discarding the canvas tree, so even a thrown render error can't silently reset `screen` to `"start"`.

### 4. Verify
- Reload the app, start an Arcade match, play past several rallies, ensure no runtime errors in console.
- Fill the super meter, activate the super, keep playing — match must continue.
- Reach the win target — confirm the End screen shows (not Start).
- Test in Challenge and Boss modes too.

## Out of scope

- No gameplay/balance changes.
- No UI redesign of HUD, shop, or end screen.
- No new powers or new shop items.
