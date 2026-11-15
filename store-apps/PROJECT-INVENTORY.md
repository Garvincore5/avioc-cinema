# E:\code project audit for Avioc Apps

Scope checked: top-level projects and the actual runnable applications found inside them. This inventory is deliberately separate from the public store listing: an unbuilt prototype or a local-only tool is not presented to customers as a ready install.

## Ready for an independent customer package

| Project | Current form | Packaging path | Release state |
| --- | --- | --- | --- |
| Avioc Cinema | Existing Android, Windows, macOS, Linux, and iOS web-clip release pipeline | Existing release workflow | Existing product; separate from Avioc Apps Store |
| Clearview Browser (`browsercore`) | Windows desktop app plus native Android source | Signed Android APK and source/license archive | Added to the release workflow and store; release must complete successfully before its links are live |
| Our Family Hub (`family app`) | Self-contained browser app | Web/PWA or Android wrapper is feasible | Not added as a native package yet; verify offline persistence and mobile install behavior first |
| Quick Contact Saver (`whtweb`) | Self-contained HTML app | Web/PWA or Android wrapper is feasible | Not added as a native package yet |
| QU!K (`tiktok`) | Browser video editor with local demo media | Web/PWA; Android requires a media/filesystem adaptation | Not added as a native package yet |
| AGBOT (`agbot`) | Web companion with 3D model assets | Web/PWA; native packaging is feasible after checking its API-key handling and local assets | Not added as a native package yet |
| Luma (`ai girl`) | Unity project and browser preview | Unity Android build is possible, but current call is a prototype | Not advertised as a finished AI calling app |
| Kinly (`love`) | Expo mobile app plus local file-backed API | Native Android build is possible | Cannot be a usable family service outside the developer's local network until its API is deployed and configured |
| Garvin Core Media (`phone`) | PWA build output | Web/PWA | Firebase config contains placeholders and the saved public URL is a temporary tunnel; not releasable yet |
| Simmer (`claude/simmer`) | Browser photo editor | Web app; native packaging needs filesystem/API review | Not added as a native package yet |
| CoreCut (`claude/vidor`) | Browser/Windows video editor | Windows desktop release exists in project; Android is not suitable without adaptation | Separate Windows product, not an Android app |
| StoryShape (`claude/storyshape.html`) | Standalone HTML app | Web/PWA or Android wrapper is feasible | Not added as a native package yet |
| SmartHub (`NETWORK SMART`) | Local web controller | Desktop/local-network web app | Requires local device credentials and LAN access; no public-hosted app package |
| Mayundo AI (`photoshop`) | Python desktop retouch studio and Photoshop automation | Windows desktop package | Requires local photo/model paths and bundled AI runtime; not an Android app |
| Skin Retouch Studio (`skin`) | Photoshop plugin and Python desktop app | Photoshop plugin / Windows desktop | Not a mobile app; install method depends on Photoshop host |
| Bunny (`bunny`) | Local LLM and desktop/web interface | Windows/local desktop package | Depends on large local model/runtime and PC resources; not suitable as a small phone APK |
| Sovereign Core (`core`) | Python/PyTorch AI runtime and datasets | Local PC/server | Model/runtime and dataset dependencies prevent a practical signed Android APK as-is |
| Media Downloader (`downloader`) | Local Python/Flask/yt-dlp server | Desktop/local web app | Needs a reachable local server and downloader dependencies; not a standalone mobile app as-is |
| AI Companion (`ai-companion`) | .NET desktop companion | Windows desktop package | Includes desktop/PC controls and requires a separate mobile rewrite |

## Other folders and nested outputs

- `free cdn` and `New folder` have no project files at the top level.
- `simon` contains photo albums and an unfinished smart-ease/photobook project, not a releasable app package.
- `bunny/projects` contains generated portfolio/business sites, not separate installable applications. They should remain websites unless a specific site is selected as a product.
- `claude/avioc-cinema.html` is another Cinema page, not a separate product.

## Store/release rule

Each listing should be added only after its target package exists, installs on that device family, and the needed API/backend is configured. Android APKs will use GitHub Actions and the existing Android keystore secrets. iOS native IPA release needs Apple signing credentials; the existing free iOS deliverables are web clip profiles, not native apps.
