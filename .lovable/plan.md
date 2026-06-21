## Goal
Wrap the existing Paddle Clash Arena web game in Capacitor so you can build a native iOS app and submit it to the Apple App Store.

## Important note about the Lovable environment
Lovable runs a Linux-based cloud editor. Building and submitting an iOS app **requires a Mac with Xcode** — there is no way around this (Apple's rule, not Lovable's). What I can do here is set up the project correctly so that, once you export the code to your own Mac, the iOS build "just works".

The flow will be:
1. I prepare the Capacitor setup inside the Lovable project.
2. You export the project to GitHub → clone it to a Mac.
3. On the Mac, run a few commands to generate the native iOS project, open it in Xcode, and submit to App Store Connect.

## What I'll change in the project

### 1. Add Capacitor dependencies
- `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`
- `@capacitor/status-bar`, `@capacitor/haptics` (nice-to-have for the game feel)

### 2. Add `capacitor.config.ts` at project root
- `appId`: `app.lovable.paddleclasharena` (you can change this later)
- `appName`: `Paddle Clash Arena`
- `webDir`: `dist` (TanStack Start build output)
- iOS settings: background color matching the game, allow inline media

### 3. Mobile-friendly tweaks to the game (frontend only)
- Lock orientation hints (landscape works best for paddle play)
- Disable iOS rubber-band scroll / text selection on the canvas
- Add safe-area padding so the score/overlay aren't under the notch
- Add `viewport-fit=cover` and `apple-mobile-web-app-capable` meta tags
- Optional: trigger a light haptic via `@capacitor/haptics` on paddle hits

### 4. Add a short `IOS_BUILD.md` with the exact Mac commands
```
npm install
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```
Plus notes on: setting your Apple Team ID in Xcode, app icon, launch screen, and using Xcode's "Archive → Distribute App" to upload to App Store Connect.

## What I will NOT do (and can't from here)
- Run `npx cap add ios` (needs macOS/Xcode)
- Generate the Xcode project, `.ipa`, or upload to App Store Connect
- Create your Apple Developer account ($99/yr — required for App Store)
- Make app icons / screenshots (can generate PNGs if you want, but Xcode imports them)

## Open questions before I build
1. App name on the home screen — keep **"Paddle Clash Arena"** or shorten (iOS truncates ~12 chars)?
2. Force **landscape only**, or allow portrait too?
3. Want me to add **haptic feedback** on paddle hits and scoring?
4. Should I generate an **app icon** (1024×1024) now, or will you supply one?
