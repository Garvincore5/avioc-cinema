# Clearview Browser for Android

This is the Android project for Clearview Browser, copied from `E:\code\browsercore\android` so the Avioc Apps release workflow can sign and publish the APK using the existing Android signing key.

- Android package: `com.clearview.browser`
- Supported Android ABIs: `arm64-v8a` and `x86_64`
- Minimum Android version: Android 7.0 (API 24)
- Release APK: `Clearview-Android-v1.1.1.apk`
- The Android downloader uses yt-dlp-android and FFmpeg. License and attribution files ship in the app and source archive.

The Android implementation is a native WebView browser with its downloader controls and is distinct from the Clearview Windows desktop build. Windows desktop packaging remains a portable folder/ZIP in the source project.
