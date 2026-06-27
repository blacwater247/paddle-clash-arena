## Goal

Add an Android Capacitor wrapper alongside the existing iOS one, and prep the site for Google Search Console verification.

## 1. Android Capacitor wrapper

- Install `@capacitor/android` as a dev dependency.
- Update `capacitor.config.ts` to add an `android` block (background color, `allowMixedContent: false`, `webContentsDebuggingEnabled: false` for release).
- Create `ANDROID_BUILD.md` with the same shape as `IOS_BUILD.md`:
  - Prereqs: Android Studio, JDK 21, Android SDK, a Google Play Console account ($25 one-time) for store submission.
  - Generate project: `npm run build && npx cap add android && npx cap sync android && npx cap open android`.
  - Configure in Android Studio: applicationId, version code/name, signing config, landscape orientation, replace launcher icons under `android/app/src/main/res/mipmap-*`.
  - Run on emulator or device.
  - Release: build a signed `.aab`, upload to Play Console, fill store listing, submit for review.
  - Update flow: `git pull && npm install && npm run build && npx cap sync android`, bump versionCode/versionName.
- No code changes inside the game — the existing web app loads as-is. Status bar and haptics plugins already installed work on Android too.

## 2. Google Search Console prep

- Add a Google Site Verification meta tag to `src/routes/__root.tsx` `head().meta`. Placeholder content value the user pastes from GSC, e.g.:
  ```
  { name: "google-site-verification", content: "REPLACE_WITH_GSC_TOKEN" }
  ```
  Once the user gives the token I swap it in; deploy; then either they click Verify in GSC or I run the verification API and add the site.
- Confirm `public/robots.txt` allows crawling and points at the sitemap.
- Confirm `src/routes/sitemap[.]xml.ts` lists `/` and `/play` with `BASE_URL = "https://paddle-clash-arena.lovable.app"`.
- Re-check root metadata (title, description, canonical/og:url for `/` and `/play`) is GSC-friendly — leaf canonicals on `index.tsx` and `play.tsx`, not the root.

## Files to change

- `package.json` (via `bun add -d @capacitor/android`)
- `capacitor.config.ts` — add `android` block
- `ANDROID_BUILD.md` — new
- `src/routes/__root.tsx` — add `google-site-verification` meta entry
- `public/robots.txt` and `src/routes/sitemap[.]xml.ts` — verify/adjust if needed
- `src/routes/index.tsx` / `src/routes/play.tsx` — add leaf canonical if missing

## What I need from you next

After you approve, share the **Google Search Console verification token** (the `content="..."` value from the meta-tag method) so I can drop it into the head. The Android project itself (`android/` folder) is generated on your machine with `npx cap add android` — Lovable can't run Android Studio for you, same as iOS.
