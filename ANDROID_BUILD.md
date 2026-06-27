# Building Paddle Clash Arena for Android (Google Play)

This project is wrapped with [Capacitor](https://capacitorjs.com/) so it
can ship as a native Android app. Building for Android **requires
[Android Studio](https://developer.android.com/studio)** — it cannot be
done from the Lovable cloud editor. Works on macOS, Windows, or Linux.

## One-time setup

1. Install **Android Studio** (latest stable). On first launch let it
   download the Android SDK, Platform Tools, and an emulator image.
2. Install **JDK 21** (Android Studio bundles a compatible JDK — use
   Studio's bundled JDK in Settings → Build Tools → Gradle if unsure).
3. Create a **[Google Play Console](https://play.google.com/console)**
   account ($25 one-time fee) to publish to the Play Store.

## Get the code on your machine

1. In Lovable, click **GitHub → Connect** and push the project to a repo.
2. On your machine:
   ```bash
   git clone <your-repo-url>
   cd <your-repo>
   npm install
   ```

## Generate the Android project

```bash
npm run build              # builds the web app into dist/
npx cap add android        # creates the android/ folder (run once)
npx cap sync android       # copies web build + plugins into the Android project
npx cap open android       # opens Android Studio
```

After any code change, repeat:
```bash
npm run build && npx cap sync android
```

## Configure in Android Studio

1. Open `android/app/build.gradle` and confirm:
   - `applicationId "app.lovable.paddleclasharena"` (change if you want
     a different package name — this is permanent once published).
   - Bump `versionCode` (integer) and `versionName` (string) for every
     release.
2. **Launcher icon**: replace the PNGs under
   `android/app/src/main/res/mipmap-*` with your 1024×1024 icon resized
   for each density, or use **Image Asset Studio** (right-click `res/`
   → New → Image Asset).
3. **Orientation** (landscape recommended for this game): in
   `android/app/src/main/AndroidManifest.xml`, set
   `android:screenOrientation="landscape"` on the `<activity>` tag.
4. **App name**: edit `android/app/src/main/res/values/strings.xml`
   (`app_name`).

## Run on emulator or device

- **Emulator:** pick an AVD from the device dropdown and press ▶.
- **Real device:** enable Developer Options + USB Debugging on the
  phone, plug it in, pick the device, press ▶.

## Sign a release build

1. In Android Studio: **Build → Generate Signed Bundle / APK → Android
   App Bundle (.aab)**.
2. Create a new keystore (keep the `.jks` file and passwords safe —
   losing them means you can never update the app again).
3. Pick the **release** build variant and finish.
4. The signed `.aab` lands in
   `android/app/release/app-release.aab`.

## Submit to Google Play

1. In [Play Console](https://play.google.com/console), create a new
   app, fill out the store listing, content rating, data safety, and
   target audience sections.
2. Under **Production → Create new release**, upload the `.aab` from
   the step above, write release notes, and submit for review.
3. First reviews typically take 1–7 days.

## Updating the app later

Every time you make changes in Lovable:
1. Pull the latest code on your machine: `git pull`
2. `npm install && npm run build && npx cap sync android`
3. Bump `versionCode` + `versionName` in `android/app/build.gradle`.
4. Generate a new signed `.aab` and upload it as a new release in
   Play Console.
