# 🎬 Avioc Cinema — Multi-Platform Standalone Build & Signing Guide

This repository is configured to build and sign native standalone applications for **all devices** without depending on any external website hosting. If the website is ever modified, deleted, or replaced, these native standalone apps continue to work independently.

---

## 📱 Supported Platforms & Universal Device Compatibility

| Platform | Minimum OS Version | Output Files | Compatible Devices |
|---|---|---|---|
| **Android** | **Android 5.0 (Lollipop)** up to Android 15 | `Avioc-Cinema.apk` | Covers **99.5%** of all phones in the world (Tecno, Itel, Infinix, Samsung Galaxy, Huawei, Redmi, Android TV boxes). Uses MultiDex & LargeHeap for 1GB/2GB low-RAM phones. |
| **Windows** | **Windows 7**, 8, 8.1, 10, 11 | `Avioc-Cinema-Setup-ia32.exe`<br>`Avioc-Cinema-Setup-x64.exe`<br>`Avioc-Cinema-Portable-ia32.exe`<br>`Avioc-Cinema-Portable-x64.exe` | Works on both **32-bit (ia32)** and **64-bit (x64)** older PCs & laptops. Portable versions run directly from USB/desktop without installing. |
| **iPhone & iPad** | **ALL iOS versions** (iOS 9 through iOS 18+) | `Avioc-Cinema.mobileconfig`<br>`Avioc-Cinema.ipa` | **1-Tap Profile**: Works on older iPhones (iPhone 5, 5s, 6, 6 Plus, 7, 8) with zero computer/jailbreak needed.<br>**IPA**: For AltStore, Sideloadly, or TrollStore. |
| **macOS** | **macOS 10.13 (High Sierra)** through macOS 15+ | `Avioc-Cinema-Mac.dmg` | Universal installer for both older Intel Macs (2010–2020) and modern Apple Silicon Macs (M1/M2/M3/M4). |

---

## 🔐 Avioc Author & Signature Credentials

All packages and certificates are signed with the official **Avioc** identity:

- **Author / Developer**: `Avioc`
- **Organization**: `Avioc Cinema`
- **Organizational Unit**: `Avioc Media`
- **Locality / City**: `Kampala`
- **State / Province**: `Central`
- **Country**: `UG` (Uganda)
- **App ID / Bundle ID**: `com.avioc.cinema`
- **App Display Name**: `Avioc Cinema`
- **Keystore / Cert Password**: `avioc2026cinema`
- **Key Alias**: `avioc`

---

## 🚀 How to Build on GitHub (Cloud CI/CD)

Because building macOS (`.dmg`) and iPhone (`.ipa`) requires a Mac/Xcode environment, and Android requires the full Android SDK and Gradle toolchain, the automated GitHub Actions workflow (`.github/workflows/build-and-release.yml`) handles everything in the cloud.

### Option 1: 1-Click Build via GitHub Web Interface
1. Go to your GitHub repository in your web browser.
2. Click on the **Actions** tab at the top.
3. In the left sidebar, click **"Build & Sign Avioc Cinema (All Devices)"**.
4. Click the **"Run workflow"** dropdown button on the right.
5. Enter a version tag (e.g. `v1.0.0`) and click **"Run workflow"**.
6. GitHub will launch 4 parallel cloud builders:
   - 🪟 Windows builder (`windows-latest`)
   - 🤖 Android builder (`ubuntu-latest`)
   - 🍎 Mac DMG builder (`macos-latest`)
   - 📱 iPhone IPA builder (`macos-latest`)
7. Once finished, all 5 ready-to-use binaries will be published under **Releases** and attached to the workflow run!

### Option 2: Automatic Build on Release Tag
Whenever you push a Git tag starting with `v` (e.g., `git tag v1.0.0 && git push origin v1.0.0`), GitHub Actions automatically triggers and creates an official release with downloadable attachments.

---

## 🛠️ How Standalone Independence & Live Updates Work

Unlike webview wrappers that load an external website URL:
1. **Zero External Website Dependency**: The entire cinematic UI, navigation, media player controls, styles, and initial catalog (136+ blockbusters and complete TV series) are bundled **inside** the app files.
2. **🔄 Automatic Over-The-Air (OTA) Movie Updates**:
   - Whenever you post new movies to BunnyCDN and update `catalog-data.json`, existing standalone apps (**Android APK, Windows EXE, Mac DMG, iPhone IPA**) automatically detect and fetch the new movies in the background!
   - The new titles and posters immediately appear on the home screen shelves, search results, and genre filters.
   - Newly fetched movies are automatically saved to the device's local cache so they remain accessible even if the user goes offline later.
   - **Users do NOT need to download or reinstall a new APK or EXE just to see newly posted movies.**
3. **Local Video Player**: Embedded media engine with full seek, playback speed (0.75x–2.0x), smart resume memory, and local HLS support (`assets/hls.min.js`).
4. **Direct CDN Streaming**: Video playback connects directly to BunnyCDN Global Edge (`aviocwatch.b-cdn.net`), bypassing any web hosting.
5. **Offline Resilience**: Even if the web domain is taken down or replaced, existing app installs continue playing all movies directly from CDN storage.
2. **Local Video Player**: Embedded media engine with full seek, playback speed (0.75x–2.0x), smart resume memory, and local HLS support (`assets/hls.min.js`).
3. **Direct CDN Streaming**: Video playback connects directly to BunnyCDN Global Edge (`aviocwatch.b-cdn.net`), bypassing any web hosting.
4. **Offline Resilience**: Even if the web domain is taken down or replaced, existing app installs continue playing all movies directly from CDN storage.

---

## 📲 Installation Instructions for End Users

### 🤖 Android (`.apk`)
1. Download `Avioc-Cinema.apk` to any Android phone, tablet, or Android TV box.
2. Tap the file to install. If prompted with *"Install unknown apps"*, tap **Settings** and toggle **Allow from this source**.
3. Open **Avioc Cinema** and enjoy.

### 🪟 Windows (`.exe`)
- **Installer**: Run `Avioc-Cinema-Setup.exe` to install a desktop shortcut and start menu entry.
- **Portable**: Run `Avioc-Cinema-Portable.exe` directly (no installation needed, works from USB drives or any folder).

### 🍎 macOS (`.dmg`)
1. Double-click `Avioc-Cinema.dmg`.
2. Drag the **Avioc Cinema** icon into the **Applications** folder.
3. *First launch note*: If macOS Gatekeeper says *"app cannot be opened because it is from an unidentified developer"*, right-click (or Control-click) **Avioc Cinema** in Applications, select **Open**, and click **Open**.

### 📱 iPhone / iPad (`.ipa`)
Because Apple restricts sideloading, install `Avioc-Cinema.ipa` using any standard method:
- **AltStore**: Free sideloading using your Apple ID.
- **Sideloadly**: 1-click IPA installer for Windows and Mac.
- **TrollStore**: Permanent sideloading without 7-day re-signing (iOS 14.0–17.0).
- **Apple Developer Account**: Can be imported into Xcode or uploaded to TestFlight / App Store.
