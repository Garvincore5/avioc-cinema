# CoreCut

## Avioc Apps Store package

Builds are produced from the bundled source in `src/` by GitHub Actions: Windows x64 portable/setup, macOS Intel/Apple Silicon DMGs, Linux x64/ARM64 AppImages, plus an installable browser/PWA edition. The PWA is hosted at `https://aviocwatch.b-cdn.net/corecut/`; its local file access and export depend on browser support. Link import uses an optional, separately installed `yt-dlp` in the desktop edition.

A lightweight video editor that's as easy as a phone editor, with the core tools of a pro NLE.
Runs as a Windows desktop app (CoreCut.exe), or in Chrome/Edge during development.

## Run it

Double-click **CoreCut.exe** (portable, nothing to install) or install once with **CoreCut-Setup.exe**
(adds a desktop and Start menu shortcut). Both are made in `release/` by:

```bash
npm install
npm run dist:win   # builds release/CoreCut.exe and release/CoreCut-Setup.exe
```

For development:

```bash
npm run dev        # http://localhost:5173 in Chrome/Edge
npm run app        # build and open the desktop app without packaging it
```

The desktop app serves the editor from a small built-in local server (port 47817) that also
handles YouTube/TikTok link import, so nothing else needs to run. Link import uses your own
yt-dlp (winget, scoop, PATH, or a `tools\yt-dlp.exe` next to CoreCut.exe).

## What works in v0.1

- **Media bin**: import or drag in video, audio and images. Ctrl/Shift+click to pick several, then drag them onto the timeline or press **Add to timeline**: they're laid end to end. You can also drop files from your desktop straight onto the timeline.
- **Multi-track timeline**: drag clips between tracks, trim both edges, split (`S`), ripple delete (`Shift+Del`), snapping, zoom (`Ctrl+wheel`, `+`/`-`). Clips never overlap; a new track is added when needed.
- **Preview**: GPU (WebGL2) compositor with play/pause (`Space`), frame stepping (`←`/`→`, `Shift` for 1s).
- **Keyframes**: position, scale, rotation and opacity, with ease-in-out. Click ◆ to add a keyframe at the playhead; once a property has keyframes, editing it writes a new one.
- **Color**: exposure, contrast, saturation, temperature, tint, plus lift/gamma/gain color wheels. Copy a grade to every clip.
- **Multi-select**: Shift/Ctrl+click clips (or `Ctrl+A`), then drag, delete, grade, rotate or add transitions to all of them at once. `Esc` clears.
- **Color presets**: 7 built-in looks plus your own named presets (save, rename, delete). Saved presets are kept in the browser, so every project can use them.
- **Transitions**: butt two clips together on a track, then click the marker on the cut. Cross dissolve, dip to black, wipe, slide and zoom, with adjustable length; audio crossfades too.
- **Rotate presets**: 90° left/right, 180°, flip horizontal/vertical, reset. Sideways clips are rescaled to fit the frame.
- **Curves**: RGB, red, green, blue and a Light (luma) curve per clip, with a draggable editor and presets.
- **Speed**: constant speed (0.1×–10×) or a speed-ramp curve with presets (Hero moment, Bullet, Ramp up…). The clip's length follows its speed and later clips move to fit; sound follows the speed.
- **Text**: 16 fonts, weight, italic/underline/caps, alignment, spacing, outline, shadow/glow, background box, in/out animations (fade, slide, pop, typewriter) and 7 style presets.
- **Picture-in-picture**: puts a clip on its own top layer in a corner; corner presets, size, crop, border, rounded corners and shadow.
- **Text titles**, per-clip volume (up to 200%) and fade in/out.
- **Undo/redo** (`Ctrl+Z`, `Ctrl+Shift+Z`) for every edit; a whole drag is one step.
- **Projects (.core)**: the first Save asks where, starting in your clips' folder. After that **Save** (`Ctrl+S`) updates that same file in place; **Save as…** makes a new one. Open (`Ctrl+O`) asks for the clips folder once and relinks everything by file name. A dot in the top bar shows unsaved changes.
- **Export…**: pick a file name, a folder and a quality. It renders every frame of the whole timeline in the background (it doesn't play it), writes MP4 (H.264 + AAC) straight into that folder, and you can keep editing while it runs. Progress and Cancel sit in the top bar.

## Known limits (next up)

- Export, Save-in-place and folder picking need Chrome or Edge (they use the browser's file system access and WebCodecs).
- No LUTs, curves, scopes, masks or speed changes yet.
- Projects don't autosave.

## Layout

```
src/
  types.ts              edit model (project, tracks, clips, keyframes, grade)
  store.ts              state + undo/redo + all edit operations (zustand)
  engine/
    renderer.ts         WebGL2 compositor and color-grade shader
    engine.ts           media elements, audio mixing, timeline sync
    keyframes.ts        interpolation and easing
    export.ts           MediaRecorder export
  components/           MediaBin, Preview, Timeline, Inspector, ColorWheel
```
