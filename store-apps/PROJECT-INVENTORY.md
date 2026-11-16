# E:\code project audit for Avioc Apps

Scope checked: top-level projects and the actual runnable applications found inside them. This inventory is deliberately separate from the public store listing: an unbuilt prototype or a local-only tool is not presented to customers as a ready install.

## Ready for an independent customer package

| Project | Current form | Packaging path | Release state |
| --- | --- | --- | --- |
| Avioc Cinema | Existing Android, Windows, macOS, Linux, and iOS web-clip release pipeline | Existing release workflow | Existing product; separate from Avioc Apps Store |
| Clearview Browser (`browsercore`) | Windows desktop app plus native Android source | Signed Android APK and source/license archive | Signed APK and source archive built and published; CDN APK returned HTTP 200 |
| Our Family Hub (`family app`) | Self-contained browser app | Signed Android APK plus offline browser/PWA edition | Android APK published; browser/PWA edition added for v1.0.29. Data remains local to each device, with no hosted family sync |
| StoryShape (`claude/storyshape.html`) | Standalone story arc canvas and static film dataset | Signed Android APK plus offline browser/PWA edition | Android APK published; browser/PWA edition added for v1.0.29 |
| Quick Contact Saver (`whtweb/contact-saver.html`) | Rewritten local VCF organizer and contact exporter | Signed Android APK and browser/PWA for Android, iOS, Windows, macOS, and Linux browsers | v1.0.33 published successfully. CDN page, manifest, service worker, and signed APK all returned HTTP 200. Contact data stays on-device; WhatsApp console automation is excluded |
| QU!K (`tiktok`) | Local video clip editor | Browser/PWA plus signed Android APK with MP4/WebM export and Android share/save support | Signed Android and browser/PWA editions published in v1.0.26 |
| AGBOT (`agbot`) | Web AI companion; user supplies optional Gemini key, with an online fallback | Signed Android APK plus browser/PWA edition | Android APK published; browser/PWA edition added for v1.0.29. Replies require internet and an AI provider |
| Luma (`ai girl`) | Unity project and browser preview | Unity Android build is possible, but current call is a prototype | Not advertised as a finished AI calling app |
| Kinly (`love`) | Expo mobile app plus local file-backed API | Native Android build is possible | Cannot be a usable family service outside the developer's local network until its API is deployed and configured |
| SmartHub (`NETWORK SMART`) | Python local-network device controller for Tuya bulbs and Epson projectors | Windows desktop server plus Android LAN companion after auth and pairing work | Not package-ready: the server binds to all LAN interfaces without authentication, and its `/api/config` endpoint exposes device configuration. Add pairing/authentication and redact local keys before shipping; do not expose it to public networks |
| Garvin Core Media (`phone`) | Offline phone-style PWA; optional community store uses Firebase and Bunny upload config | Browser/PWA after backend and credential cleanup | The hard-coded Bunny key has been removed from `dist/bunny-config.js`, disabling authenticated uploads. Treat the previous key as exposed and rotate it. Firebase config is still placeholder data; move uploads behind a trusted backend before releasing the cloud community-store features |
| Simmer (`claude/simmer`) | Local-first portrait retoucher with bundled face models | Signed Android APK and installable browser/PWA edition | Signed APK and browser/PWA published in v1.0.25; Android export uses the system share/save screen |
| CoreCut (`claude/vidor`) | Electron editor, signed Android editor, and installable browser/PWA edition | Windows x64, signed Android APK, macOS Intel/ARM64, Linux x64/ARM64, and mobile browser/PWA | Cross-platform packages published in v1.0.23; browser editing/export depends on device support; iOS uses PWA rather than a native IPA |
| Core Sorter (`core/sorter`) | Python Tkinter file organizer plus rewritten mobile/browser ZIP organizer | Portable Windows x64, signed Android APK, and browser/PWA | v1.0.33 published successfully after adding built-file precaching. CDN page, manifest, and service worker returned HTTP 200; Windows x64 and signed Android packages were included in the successful release job |
| CineAI Studio (`whtweb/cine-ai`) | Electron editor UI plus a local Node server and media/AI services | Windows desktop package is feasible after dependency and service review | Not released; current project expects its own server and third-party AI endpoints |
| Mayundo AI (`photoshop`) | Python desktop retouch studio and Photoshop automation | Windows desktop package | Requires local photo/model paths and bundled AI runtime; not an Android app |
| Skin Retouch Studio (`skin`) | Photoshop plugin and Python desktop app | Photoshop plugin / Windows desktop | Not a mobile app; install method depends on Photoshop host |
| Bunny (`bunny`) | Local LLM and desktop/web interface | Windows/local desktop package | Depends on large local model/runtime and PC resources; not suitable as a small phone APK |
| Sovereign Core (`core`) | Python/PyTorch AI runtime and datasets | Local PC/server | Model/runtime and dataset dependencies prevent a practical signed Android APK as-is |
| Media Downloader (`downloader`) | Python/Flask/yt-dlp local server | Windows desktop package is feasible; Android/iOS need a remote-control client and reachable host | Not package-ready: Flask binds to `0.0.0.0` with no account or pairing gate, so other LAN devices can use the download and file endpoints. Add local-only defaults or authentication, then bundle Python and yt-dlp for desktop |
| AI Companion (`ai-companion`) | Cross-device browser interface with Electron desktop wrappers (Electron 45.3.3) | Signed Android APK, Windows x64/ARM64 installers, macOS Intel/Apple Silicon DMGs, Linux x64/ARM64 AppImages, plus browser/PWA | v1.0.36 published; all seven package URLs and the page/manifest returned HTTP 200. Linux x64's builder filename is `x86_64` and the store links to that exact file. The v1.0.36 standalone Avioc Apps Windows shell predates the AI Companion setup allowlist change; its next installer must include that update for automatic setup launch. Gemini requires the user's key stored on that device and internet access. PC-only actions are excluded |
| J.A.R.V.I.S. Desktop (`ai-companion`) | Separate .NET 10 localhost server and browser-launched HUD | Self-contained Windows x64 executable; Android/iOS need a native shell and other desktops need dedicated launch handling | v1.0.0 self-contained Windows x64 package built by GitHub Actions and uploaded to Bunny; CDN package URL returns HTTP 200, and the v1.0.37 versioned store page includes the listing. The main site root still has stale CDN cache. This is a separate HUD edition from the newer cross-platform Avioc AI Companion |

## Other folders and nested outputs

- `free cdn` and `New folder` have no project files at the top level.
- `simon/version zero/photobook-smartalbums` contains Smart Ease, a Windows photobook designer with large existing installers and bundled photo/layout assets. The project is outside this repository, so it cannot enter the store release workflow until its source and required assets are copied into a tracked packaging project. Its launcher and updater are Windows-specific; it is not an Android target.
- `ai-companion` contains a separate J.A.R.V.I.S. HUD implementation in .NET 10. It opens a browser window around its own localhost server; its Windows package is being added separately from the newer Electron-based Avioc AI Companion.
- `bunny/projects` contains generated portfolio/business sites, not separate installable applications. They should remain websites unless a specific site is selected as a product.
- `bunny/projects` has Apex Visuals, Garvin Core Media, Grvincore Media, Horizon Digital Studio, Lumina Photography Studio, Photography Site, and Tinah's Juice; these are generated website projects, not native apps.
- `simon/photobook` contains photo albums and the Smart Ease source; existing Windows installers are large, and mobile packaging is not appropriate without a redesign.
- `claude/avioc-cinema.html` is another Cinema page, not a separate product.
- `whtweb/cine-ai` is separate from the plain Quick Contact Saver page; it uses an Electron window and a localhost media/AI server.

## Store/release rule

Each listing should be added only after its target package exists, installs on that device family, and the needed API/backend is configured. Android APKs will use GitHub Actions and the existing Android keystore secrets. iOS native IPA release needs Apple signing credentials; the existing free iOS deliverables are web clip profiles, not native apps.
