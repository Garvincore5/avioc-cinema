# 🎬 Avioc Cinema — Premium Web App

Welcome to **Avioc Cinema**, a fast, click-and-play streaming web application built specifically for Hollywood blockbusters and Ugandan VJ-translated cinema (**VJ Junior, VJ Ulio, VJ Soul, VJ Emmy**).

---

## ⚡ Zero-Server, Click & Play Architecture

**No Node server, no localhost, and no command-line commands required to watch!**
- Simply **double-click** [`index.html`](file:///e:/code/avioc%20cinema/index.html) in Windows File Explorer or open it in Google Chrome / Microsoft Edge.
- Movies stream directly from **BunnyCDN Global Edge** (`https://aviocwatch.b-cdn.net/...`) with full HTTP range-request support for instant playback, seeking, and scrubbing.

---

## 🍿 Features Overview

1. **Cinematic Glassmorphic UI**:
   - Deep obsidian dark theme (`#07080c`) with vibrant accents (Crimson `#ff2a5f`, Amber Gold `#ffb800`, Neon Cyan `#00f0ff`).
   - Dynamic Hero Banner with auto-rotating blockbusters (*Mutiny 2026*, *Spider-Man Far From Home*, *Avatar Saga*, *Special Ops: Lioness*, *Drishyam*).
   - "Watch Now", "+ Watchlist", and "📌 Pinterest Art" quick-actions.

2. **Ugandan VJ Central & Language Categorization**:
   - **👑 VJ Junior**: Uganda's #1 action, thriller, and sci-fi commentator (*Affection 2026*, *Furious Attack*, *One Last Shot*, *Spider-Man*, *Avatar Saga*, *The Girl in the River*).
   - **🔵 VJ Ulio**: Master of psychological suspense & mystery (*Drishyam*, *The Pursuit of Happyness*, *Ittefaq*, *Luck-Key*, *A Day*).
   - **🟣 VJ Soul**: Romantic comedies and urban drama (*Love Me Love Me 2026*, *Just My Luck*, *Bikini Model Academy*).
   - **🟢 VJ Emmy**: Witty comedy and mystery detective films (*Sheep Detectives*).
   - **🌍 English & Hollywood Originals**: International releases (*Mutiny 2026*, *Meet Joe Black*, *Upload*, *Shaka Zulu*).

3. **📺 Dedicated TV Series & Episodic Navigator**:
   - Interactive Series Modal with Season selector tabs (`Season 1`, `Season 2`, `Season 3`).
   - Episode cards with episode numbers, titles, durations, and direct **Play Episode** buttons.
   - Includes **Special Ops: Lioness** (12 episodes across Season 2 & Season 3), **Avatar Complete Film Saga** (Parts 1 to 4: Fire & Ash 2026), **I Will Find You** (Episodes 1-8), **Shaka Zulu** (Episodes 1-7), and **Upload** (Seasons 1-4).

4. **🎥 Custom Avioc Theater Video Player**:
   - Built-in custom media player overlay with theater dimming and auto-hiding controls.
   - Smooth seekbar with buffered range indicator.
   - 10s skip backward (`↺ 10s`) and forward (`↻ 10s`).
   - Volume slider & mute toggle.
   - Playback speed switcher: `0.75x`, `1.0x (Normal)`, `1.25x`, `1.5x`, `2.0x`.
   - Fullscreen (`F`) and Picture-in-Picture (`P`) support.
   - **Smart Resume Memory**: Automatically remembers where you stopped watching and offers "Resume from [time]" upon return.

5. **📌 Pinterest Poster Hub**:
   - Every title has high-resolution theatrical artwork permanently hosted on BunnyCDN.
   - 1-Click **"Search Authentic Posters on Pinterest"** button that opens Pinterest search in a new tab.
   - Custom URL input allowing you to paste any Pinterest pin link or image URL (`i.pinimg.com/...`) to customize any movie's poster instantly (persisted in browser storage).

6. **☁️ BunnyCDN Edge & Background Upload Monitor**:
   - Connected Storage Zone: `aviocwatch`
   - Global Edge Delivery Host: `https://aviocwatch.b-cdn.net`
   - Background streaming uploader (`uploader.ps1`) runs via Windows background task, sequentially uploading unposted movies from `E:\downloads\others` directly to `https://storage.bunnycdn.com/aviocwatch/movies/`.

---

## ⌨️ Player Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` or `K` | Play / Pause |
| `Left Arrow` or `J` | Skip backward 10 seconds |
| `Right Arrow` or `L` | Skip forward 10 seconds |
| `Up Arrow` | Volume Up |
| `Down Arrow` | Volume Down |
| `M` | Mute / Unmute |
| `F` | Toggle Fullscreen |
| `P` | Toggle Picture-in-Picture |
| `Escape` | Close Video Player |

---

## 📂 File Directory

```
e:\code\avioc cinema\
  ├── index.html           # The click-and-play master web application
  ├── uploader.ps1         # Background BunnyCDN streaming uploader script
  ├── upload_status.json   # Live upload tracking file
  ├── upload_log.txt       # Real-time background upload activity log
  └── README.md            # App documentation
```
