# Serpent Rush (Android / Play Store build)

A snake game in plain HTML/JS (`www/index.html`) wrapped as an Android app with Capacitor.

## One-time setup
1. Install Node 18+, JDK 17 and Android Studio (it installs the Android SDK).
2. Change `appId` in `capacitor.config.json` to your own reverse-domain id, e.g. `com.yourname.serpentrush`. It cannot change after you publish.
3. `npm install`
4. `npx cap add android`

## Build
1. After any change in `www/`: `npx cap sync android`
2. `npx cap open android` opens Android Studio.
3. Test on an emulator or phone with Run.
4. Release: Build > Generate Signed Bundle / APK > Android App Bundle (.aab). Create a keystore when asked and back it up. Never commit it.

## Play Store checklist
- Google Play Console developer account (one-time US$25 fee).
- Upload the signed `.aab`.
- Store listing: app name, short and full description, 512x512 icon, 1024x500 feature graphic, at least 2 phone screenshots.
- Privacy policy URL (this app collects no data; say so).
- Content rating questionnaire, Data safety form, target audience.
- New personal developer accounts must run a closed test with at least 12 testers for 14 days before applying for production. Check the current rules in Play Console.
- Target API level must meet Google's current requirement. Update `targetSdkVersion` in `android/variables.gradle` if Play Console asks.
- Replace the default launcher icon (Android Studio: right-click `res` > New > Image Asset).
