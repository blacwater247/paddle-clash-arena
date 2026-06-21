## Goal
When a visitor opens the landing page (`/`), the stages OST should start playing automatically. The "♪ Hear OST / ■ Stop" button stays as a manual toggle.

## The browser-autoplay reality
Chrome/Safari/Firefox block `audio.play()` until the user interacts with the page. We can't bypass this — but we can:
1. Try to play immediately on mount (works if the user has previously interacted with the site, or in browsers with relaxed policies).
2. If that promise rejects, attach a one-shot listener (`pointerdown` / `keydown` / `touchstart` / `scroll`) that starts playback on the very first interaction and then removes itself.

This gives "music plays as soon as possible" without a console error.

## Changes — `src/components/LandingPage.tsx` only
- Move audio creation out of `togglePreview` into a `useEffect` that runs on mount:
  - Create the `Audio(stagesAsset.url)`, set `volume = 0.5`, `loop = true`.
  - Call `play()`. On success → `setPlaying(true)`.
  - On rejection → register `pointerdown`/`keydown`/`touchstart`/`scroll` listeners (passive, `once: true`) that call `play()` and set `playing` to true.
- On unmount: pause audio and remove any pending listeners.
- `togglePreview` keeps working: pauses if playing, resumes if stopped. The label still flips between "♪ Hear OST" and "■ Stop".
- Loop the preview so it doesn't end after one play (remove the `onended` reset, since it's now looping).

## Out of scope
- No changes to the in-game music engine (`src/lib/music.ts`) or `/play` route — those already arm on user interaction inside the game.
- No new global mute / settings UI on the landing page (existing toggle button is the control).

## Caveat to share with the user
Some browsers (notably Safari on iOS and Chrome on a cold first visit) will refuse autoplay outright. In that case the track will start the instant the visitor clicks, taps, or scrolls anywhere — which is the closest "automatic" behavior the web platform allows.