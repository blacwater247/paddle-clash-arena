# Building Paddle Clash Arena for iOS (App Store)

This project is wrapped with [Capacitor](https://capacitorjs.com/) so it can
ship as a native iOS app. Building for iOS **requires a Mac with Xcode** —
this cannot be done from the Lovable cloud editor or on Windows/Linux.

## One-time setup (on your Mac)

1. Install Xcode from the Mac App Store, then open it once and accept the license.
2. Install CocoaPods: `sudo gem install cocoapods` (or `brew install cocoapods`).
3. Create a free [Apple Developer account](https://developer.apple.com/). To
   submit to the App Store you'll need the paid program ($99/year).

## Get the code on your Mac

1. In Lovable, click **GitHub → Connect** and push the project to a repo.
2. On your Mac:
   ```bash
   git clone <your-repo-url>
   cd <your-repo>
   npm install
   ```

## Generate the iOS project

```bash
npm run build            # builds the web app into dist/
npx cap add ios          # creates the ios/ folder (run once)
npx cap sync ios         # copies web build + plugins into the iOS project
npx cap open ios         # opens Xcode
```

After any code change, repeat:
```bash
npm run build && npx cap sync ios
```

## Configure in Xcode

1. Select the **App** target → **Signing & Capabilities**.
2. Pick your **Team** (your Apple Developer account).
3. Change the **Bundle Identifier** if you want something other than
   `app.lovable.paddleclasharena`.
4. Set **Deployment Info → Device Orientation** to your preference
   (landscape is recommended for this game).
5. Replace the default app icon in `ios/App/App/Assets.xcassets/AppIcon.appiconset`
   with a 1024×1024 PNG (and the smaller sizes Xcode will request).

## Run on a device or simulator

- **Simulator:** pick an iPhone in the toolbar and press ▶.
- **Real iPhone:** plug it in, trust the computer, pick your device, press ▶.

## Submit to the App Store

1. In Xcode: **Product → Archive**.
2. When the Organizer opens: **Distribute App → App Store Connect → Upload**.
3. In [App Store Connect](https://appstoreconnect.apple.com/), create the app
   record, fill in screenshots/description, and submit for review.

## Updating the app later

Every time you make changes in Lovable:
1. Pull the latest code on your Mac: `git pull`
2. `npm install && npm run build && npx cap sync ios`
3. Bump the version + build number in Xcode → **Archive → Distribute** again.
