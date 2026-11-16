# E:\code project audit for Avioc Apps

Scope checked: top-level projects and the actual runnable applications found inside them. This inventory is deliberately separate from the public store listing: an unbuilt prototype or a local-only tool is not presented to customers as a ready install.

## Ready for an independent customer package

| Project | Current form | Packaging path | Release state |
| --- | --- | --- | --- |
| Avioc Cinema | Existing Android, Windows, macOS, Linux, and iOS web-clip release pipeline | Existing release workflow | Existing product; separate from Avioc Apps Store |
| Clearview Browser (`browsercore`) | Windows desktop app plus native Android source | Signed Android APK and source/license archive | Signed APK and source archive built and published; CDN APK returned HTTP 200 |
| Our Family Hub (`family app`) | Self-contained browser app | Signed Android APK plus offline browser/PWA edition | Android APK published; browser/PWA edition added for v1.0.29. Data remains local to each device, with no hosted family sync |
| StoryShape (`claude/storyshape.html`) | Standalone story arc canvas and static film dataset | Signed Android APK plus offline browser/PWA edition | Android APK published; browser/PWA edition added for v1.0.29 |
| Quick Contact Saver (`whtweb`) | Self-contained HTML app | Web/PWA or Android wrapper is feasible | Not added as a native package yet |
| QU!K (`tiktok`) | Local video clip editor | Browser/PWA plus signed Android APK with MP4/WebM export and Android share/save support | Package being prepared for v1.0.26 |
| AGBOT (`agbot`) | Web AI companion; user supplies optional Gemini key, with an online fallback | Signed Android APK plus browser/PWA edition | Android APK published; browser/PWA edition added for v1.0.29. Replies require internet and an AI provider |
| Luma (`ai girl`) | Unity project and browser preview | Unity Android build is possible, but current call is a prototype | Not advertised as a finished AI calling app |
| Kinly (`love`) | Expo mobile app plus local file-backed API | Native Android build is possible | Cannot be a usable family service outside the developer's local network until its API is deployed and configured |
| Garvin Core Media (`phone`) | PWA build output | Web/PWA | Firebase config contains placeholders and the saved public URL is a temporary tunnel; not releasable yet |
| Simmer (`claude/simmer`) | Local-first portrait retoucher with bundled face models | Signed Android APK and installable browser/PWA edition | Android export uses the system share/save screen; iOS uses the browser/PWA version |
| CoreCut (`claude/vidor`) | Electron editor, signed Android editor, and installable browser/PWA edition | Windows x64, signed Android APK, macOS Intel/ARM64, Linux x64/ARM64, and mobile browser/PWA | Cross-platform packages are being built; browser editing/export depends on device support; iOS uses PWA rather than a native IPA |
| Core Sorter (`core/sorter`) | Python Tkinter desktop file organizer plus browser version | Portable Windows x64 package | Published in v1.0.20; Android folder access is not supported by the current implementation |
| CineAI Studio (`whtweb/cine-ai`) | Electron editor UI plus a local Node server and media/AI services | Windows desktop package is feasible after dependency and service review | Not released; current project expects its own server and third-party AI endpoints |
| SmartHub (`NETWORK SMART`) | Local web controller | Desktop/local-network web app | Requires local device credentials and LAN access; no public-hosted app package |
| Mayundo AI (`photoshop`) | Python desktop retouch studio and Photoshop automation | Windows desktop package | Requires local photo/model paths and bundled AI runtime; not an Android app |
| Skin Retouch Studio (`skin`) | Photoshop plugin and Python desktop app | Photoshop plugin / Windows desktop | Not a mobile app; install method depends on Photoshop host |
| Bunny (`bunny`) | Local LLM and desktop/web interface | Windows/local desktop package | Depends on large local model/runtime and PC resources; not suitable as a small phone APK |
| Sovereign Core (`core`) | Python/PyTorch AI runtime and datasets | Local PC/server | Model/runtime and dataset dependencies prevent a practical signed Android APK as-is |
| Media Downloader (`downloader`) | Local Python/Flask/yt-dlp server | Desktop/local web app | Needs a reachable local server and downloader dependencies; not a standalone mobile app as-is |
| AI Companion (`ai-companion`) | .NET desktop companion | Windows desktop package | Includes desktop/PC controls and requires a separate mobile rewrite |

## Other folders and nested outputs

- `free cdn` and `New folder` have no project files at the top level.
- `simon/version zero/photobook-smartalbums` contains Smart Ease, a working Windows photobook designer with large existing installers and bundled photo/layout assets. Its launcher and updater are Windows-specific, so it needs a separate desktop packaging pass and is not an Android target.
- `bunny/projects` contains generated portfolio/business sites, not separate installable applications. They should remain websites unless a specific site is selected as a product.
- `bunny/projects` has Apex Visuals, Garvin Core Media, Grvincore Media, Horizon Digital Studio, Lumina Photography Studio, Photography Site, and Tinah's Juice; these are generated website projects, not native apps.
- `simon/photobook` contains photo albums and the Smart Ease source; existing Windows installers are large, and mobile packaging is not appropriate without a redesign.
- `claude/avioc-cinema.html` is another Cinema page, not a separate product.
- `whtweb/cine-ai` is separate from the plain Quick Contact Saver page; it uses an Electron window and a localhost media/AI server.

## Store/release rule

Each listing should be added only after its target package exists, installs on that device family, and the needed API/backend is configured. Android APKs will use GitHub Actions and the existing Android keystore secrets. iOS native IPA release needs Apple signing credentials; the existing free iOS deliverables are web clip profiles, not native apps.
