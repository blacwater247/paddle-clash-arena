## Change
Increase ball speed constants and collision multipliers so the ball moves faster throughout the match.

## Current → New
| Constant | Current | New |
|----------|---------|-----|
| `BALL_BASE_SPEED` | 7 | 9 |
| `BALL_MAX_SPEED` | 20 | 26 |

## Collision speed multipliers (in PaddleClashArena.tsx around line 590)
- Normal bounce: `1.08` → `1.12`
- Smash power-up: `1.6` → `1.8`
- Fire power-up: `2.5` → `3.0`
- Curve power-up: `1.4` → `1.6`
- Shield deflect: `1.35` → `1.5`

The slow-powerup factor (`0.55`) stays unchanged — the user only asked to recalibrate base speed.

## Files
- `src/components/PaddleClashArena.tsx` — update constants and collision math only.
