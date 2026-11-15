# Clearview

Clearview is a small desktop browser with a built-in filter for common ad and tracker domains, pop-up blocking, a live download queue, and playlist or related-video detection powered by `yt-dlp`.

## Run from source

1. Install Node.js if needed.
2. From this folder, run `npm install`.
3. Run `npm start`.

Video downloads use `yt-dlp` and optionally `ffmpeg`. Packaged Windows builds include both tools and do not require them to be installed separately.

## Build packages

- Run `npm run build:release` to create the portable Windows folder and zip, an Android debug APK, and the Android source archive under `release/`.
- The Windows folder must stay together when copied to another PC. The executable is `release/Clearview-win-unpacked/Clearview.exe`.
- The Android build requires Java 17 and Android SDK platform 36. Its APK includes the Android yt-dlp/Python runtime and FFmpeg library.
- The Android downloader library is GPL-3.0; include `Clearview-Android-source.zip` when redistributing the APK.
- The Android APK supports arm64-v8a and x86_64 devices (Android 7.0 or newer).

Downloads save to the folder shown under Settings; the chosen folder is remembered until you change it. The Downloads menu shows current progress, queued items, and a related-video detector for playlists and episode links. Detected items are checked by default, and up to three items download at once. Downloads use `yt-dlp`'s default format selection, concurrent stream fragments, and chunked HTTP requests. Temporary fragments are kept in Clearview's staging folder; only the completed video is moved into the chosen folder. Clearview avoids overwriting files with the same output name and confirms a non-empty file was created before marking a download complete. Actual speed still depends on the source server and your connection. If `yt-dlp` does not recognize the page, Clearview also tries video and stream URLs it finds in the page or observes loading in the browser, passing along the browser request headers and page referrer. If those attempts fail, it tries detected streams with `ffmpeg` when that program is installed and available on `PATH`.

## Limits

Ad filtering blocks requests to known ad and tracking domains and common pop-under endpoints, and denies sites from opening separate windows. It is not a full cosmetic filter, and websites can still show ads or stop working if they depend on blocked services. Video downloads depend on yt-dlp support and the site's rules; protected streams, account-only content, and some embedded players may not be available. Use downloads only where you have permission. See `THIRD_PARTY_NOTICES.md` for bundled component notices.
