# Build the Play Store file (.aab) yourself

This folder is a complete Android project that opens your website full-screen (a Trusted Web Activity). You build it with **Android Studio**, Google's own free tool. No third-party website and no AI ever touches your signing key: the key is created on your computer.

## One-time setup
1. Install Android Studio from https://developer.android.com/studio (official Google site). Accept the defaults; it installs the Android SDK and Java for you.
2. Get this folder on your computer: it is `android/` inside your GitHub project (`C:\Users\ADMIN\Downloads\work\docufast\android` after `git pull`).

## Website address
Already set to `docufast-app.vercel.app` in `android/app/build.gradle`. If you ever move to your own domain, change the line `def SITE_HOST = "..."` (no `https://`, no slash at the end) and build again.

## Build
1. Android Studio → **Open** → choose the `android` folder → wait until the bottom bar finishes ("Gradle sync").
   If it offers to *upgrade the Android Gradle Plugin*, click **Update**.
2. Menu **Build → Generate Signed App Bundle / APK…** → **Android App Bundle** → Next.
3. **Key store path → Create new…**
   - Save it somewhere safe (not inside the project), for example `C:\Keys\docufast-upload.jks`
   - Choose a strong password (same for key password), alias `docufast`, validity 25+ years, fill your name/organisation. OK.
4. Next → choose **release** → Create. After a minute Android Studio shows "locate". The file is:
   `android/app/release/app-release.aab`  ← this is what you upload to Play Console.
5. **Back up the `.jks` file and its passwords in two places** (for example a USB drive and your email drafts or a password manager). If you lose it you cannot update through that key (Play can reset an upload key, but it takes days).

## Verify (removes the browser bar)
1. In Play Console, after uploading the `.aab`: *Test and release → App integrity → App signing* → copy the **SHA-256 certificate fingerprint** of the *App signing key certificate*.
2. Put it in `public/.well-known/assetlinks.json` in place of `REPLACE_WITH_PLAY_APP_SIGNING_SHA256` (and the upload-key fingerprint in place of the other line; get it by running `keytool -list -v -keystore C:\Keys\docufast-upload.jks` and copying the SHA256 line, same format `AA:BB:…`).
3. `git add .`, `git commit`, `git push`; when Vercel is Ready, open `https://docufast-app.vercel.app/.well-known/assetlinks.json` to see it.

## For every later release
Increase `versionCode` by 1 in `app/build.gradle` and repeat "Build". Website changes alone need no new upload.

## Known limits
- "Use my location" works only if the phone's browser allows it. If it doesn't, the customer types the address (the app already offers this).
- Not tested on a device from this build environment. Install it from **Internal testing** on your own phone first.
