
# Super Powers + Adaptive AI Difficulty

Two upgrades to Paddle Clash Arena: a flashy **Super Power** system the player can trigger mid-match, and a **gradual AI difficulty curve** so the computer starts beatable and ramps up as the player progresses.

## 1. Super Powers (player-activated ultimates)

Separate from the existing pickup power-ups. Each player has a **Super Meter** that fills as they play; when full, they tap a key / on-screen button to unleash a Super Power.

**Meter fills from:**
- Each point won: +25%
- Each successful rally hit: +3%
- Power-up pickup: +10%
- Taking a hit (losing a point): +15% (catch-up help)

**Activation:** `Space` (P1) / `Enter` (P2), or tap the glowing meter on mobile. Meter empties on use.

**5 Super Powers** (player picks 1 as their "loadout" on the start screen; unlock more via the rewards system):

| Power | Effect | Duration |
|---|---|---|
| Meteor Smash | Next hit launches a fireball at 2.5x speed with screen shake + gold burst | 1 hit |
| Time Warp | Slows ball + opponent paddle to 40% speed | 4s |
| Mirror Wall | Player paddle grows 2x + auto-deflects at sharp angles | 5s |
| Phantom Clone | A second ghost paddle mirrors player movement, can also hit ball | 6s |
| Chain Lightning | Ball zig-zags unpredictably and ignores opponent paddle once | 1 hit |

Visual: full meter pulses gold, activation triggers a brief freeze-frame + flash, power name banner slides across screen.

**Unlocks** (tie into existing rewards):
- Meteor Smash: free (default)
- Time Warp: Rank 3
- Mirror Wall: 1500 coins
- Phantom Clone: Rank 8
- Chain Lightning: 3500 coins

## 2. Adaptive AI Difficulty

Replace the current fixed AI with a **dynamic skill model** that starts gentle and ramps up. Two axes drive it: **match progress** (within a single match) and **player skill** (across matches, stored locally).

**AI parameters that scale:**
- `reactionDelay` — frames before AI starts tracking ball (higher = slower)
- `trackingError` — random offset added to target Y position
- `maxSpeed` — paddle movement cap
- `predictionDepth` — 0 = follows current ball Y, 1 = predicts bounce point
- `smashChance` — odds of returning with extra velocity

**Per-mode base curves:**

```text
Arcade   start: very easy   →  ramps over first 5 points to medium
Challenge start: medium     →  ramps every 3 points, caps at hard
Boss     start: hard        →  flat hard, with scripted super-power uses
2P Local no AI
```

**Within a match (Arcade example):**
```text
Score state         reaction  error  speed  predict  smash
0-0 to 2-x          18 frames 80px   0.55   0        0%
3-x to 6-x          12 frames 50px   0.70   0.3      10%
7-x onward          7 frames  25px   0.85   0.7      25%
Match point (AI)    5 frames  15px   0.95   1.0      35%
```

**Player skill calibration (cross-match, localStorage):**
Track rolling win rate over last 10 matches.
- Win rate > 70%: shift all curves +1 tier (harder baseline)
- Win rate < 30%: shift all curves -1 tier (easier baseline, mercy mode)
- 30–70%: unchanged

Stored as `pca:ai:skill:v1` → `{ recentResults: ('W'|'L')[], tier: -1 | 0 | 1 | 2 }`.

**Rubber-banding (subtle, Arcade only):** if player is losing by 4+ points, AI's `trackingError` increases 30% for next 2 points. Disabled in Challenge / Boss for fairness.

## 3. UI additions

- **Super Meter**: vertical glowing bar next to each player's score, fills with gold gradient, pulses + emits sparks when full.
- **Super Power picker** on start screen: 5 cards (locked ones grayscale with unlock requirement).
- **Difficulty indicator**: small chip under AI score showing current tier (`EASY → NORMAL → HARD → ELITE`) that animates when it ramps up mid-match.
- **Activation banner**: full-width slide-in showing power name + icon when triggered.

## 4. Technical notes

- New file `src/lib/superPowers.ts` — power definitions, meter logic, active-effect state machine.
- New file `src/lib/aiDifficulty.ts` — `getAIParams(mode, score, playerSkillTier)` returning the param object each frame; `recordMatchResult(win)` updates rolling skill tier.
- Extend `src/lib/rewards.ts` `SHOP_ITEMS` with 4 super-power unlocks (coin-gated) + grant default `meteor_smash` to all players. Add `equipped.superPower` field with migration default.
- `src/components/PaddleClashArena.tsx`:
  - Add `superMeterP1`, `superMeterP2`, `activeEffects[]` to game state refs.
  - Per-frame: tick active effects, apply modifiers to ball/paddle physics before existing update.
  - Replace fixed AI block with `getAIParams(...)` call driven by current score + stored skill tier.
  - Wire `Space` / `Enter` keydown + on-canvas tap zones for activation.
  - On match end: call `recordMatchResult(playerWon)`.
- Render layer: meter bars, difficulty chip, activation banner, new particle bursts (reuse existing hit-spark system with new color palettes).

## Out of scope
- Online play, accounts, sharing super loadouts.
- New game modes beyond the existing four.
- Audio (can layer in later).
