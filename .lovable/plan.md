## Feature: Ball Speed / Boost Meter

Add a compact, real-time speed indicator to the play-screen HUD so the player can see how fast the ball is currently moving.

### Design
- Position: bottom-center of the HUD overlay, just above the canvas (or integrated into the existing center column below the rally counter).
- Style: a thin horizontal bar (~120px wide, 4px tall) with a colored fill that shifts from cool blue (slow) through white to hot gold/orange (fast). A small numeric readout sits above or beside it.
- Label: "SPEED" in small uppercase tracking, plus the current speed as an integer (e.g. "12").

### Technical approach
- **Read speed in the game loop**: compute `Math.sqrt(ballVX^2 + ballVY^2)` every frame inside the existing `loop` function.
- **Throttle React sync**: update a new piece of component state (`ballSpeed`) only every ~6 frames, matching the existing super-meter throttle pattern (line ~785). This avoids perf overhead.
- **Render in HUD**: insert a new element inside the existing center-column HUD (between the rally counter and the AI tier label) that shows the label, numeric speed, and a horizontal progress-style bar filled proportionally to `(speed / BALL_MAX_SPEED)`.
- **Color interpolation**: the bar color interpolates from `oklch(0.7 0.22 245)` (blue) through white to `oklch(0.82 0.17 85)` (gold) based on the speed ratio.

### Files
- `src/components/PaddleClashArena.tsx` — add `ballSpeed` state, sync from loop, add HUD markup.

No new dependencies needed.
