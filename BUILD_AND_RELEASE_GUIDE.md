# Avioc Cinema app builds

GitHub Actions can build Windows installers, an Android APK, a macOS DMG, and an iPhone/iPad home-screen shortcut profile. These builds still need platform-specific signing and device checks before being advertised as broadly compatible.

## Before publishing

1. Rotate the Bunny Storage Zone key that was previously embedded in the workflow. Store the replacement only as the GitHub Actions secret `BUNNY_STORAGE_ZONE_KEY`.
2. Create one Android release keystore and keep a secure backup. Add these repository or environment secrets in GitHub: `ANDROID_KEYSTORE_BASE64` (base64-encoded keystore file), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD`. Reuse this same keystore for every Android release so existing installs can receive updates.
3. The workflow currently builds Windows and macOS packages unsigned. Use a certificate from a trusted code-signing provider and configure Electron Builder signing secrets before claiming the apps are signed or trusted. The old self-signed certificate does not establish a trusted publisher identity.
4. Add the Bunny secret before using a tagged release or manually running the workflow. Builds on `main` only create workflow artifacts; release publishing and Bunny uploads happen only for a version tag or manual workflow run, and only after all build jobs succeed.

Never put credentials in source files, scripts, release notes, or chat. If a secret has been committed or shared, rotate it instead of only deleting the visible copy.

## Run a release

1. Push the updated source to GitHub.
2. Add the Android signing and Bunny secrets listed above in **Settings → Secrets and variables → Actions**.
3. Push a version tag such as `v1.0.1`, or start **Build Avioc Cinema Apps** from the Actions tab and choose **Run workflow**.
4. Confirm every build job succeeds before distributing the release artifacts.

The iPhone/iPad `.mobileconfig` installs a home-screen Web Clip that opens the hosted website. It is not an IPA or native iOS app. A distributable iOS app requires Apple signing and a separate supported distribution path.

Unsigned Windows and macOS builds may show operating-system security warnings. Compatibility claims should be based on actual device testing for the specific release.
