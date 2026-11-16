# Simmer Photo Studio

## Avioc Apps Store packages

The bundled source in `src/` produces a signed Android APK and an installable browser/PWA edition. Android imports photos through the system file picker and saves exported JPEG, PNG, and batch ZIP files with the Android share/save sheet. Models and MediaPipe runtime are bundled so face tools work offline after first launch. The browser/PWA version is hosted at `https://aviocwatch.b-cdn.net/simmer/`; its folder access varies by browser.

A portrait retouching and photo editor that runs entirely on your PC: no uploads, no paid APIs.
Works best in Chrome or Edge (needed for saving straight into folders).

## Run it

Double-click `start.bat`, or in a terminal:

```
npm install
npm run setup   # copies the face AI runtime and downloads the models (one time)
npm run dev     # then open the address it prints
```

## Screen layout

- **Top bar**: open photos / open folder / batch, undo, compare (hold, split, side by side), save.
- **Photo tabs**: every photo opens in its own tab with its own edits and history.
- **Left tool strip**: Move, Crop · Spot heal, Clone/Mend, Patch, Lasso, Liquify · Brush, Eraser, Text.
- **Right panel**: ✨ Quick · Face · Adjust · Background · Layers · Saved (faces), plus a slider search box.
- Press **?** for every keyboard shortcut.

## Saving

**Save** (Ctrl+S) writes the full-resolution edit into a `simmer` subfolder next to the original.
Photos opened with **Open folder** already know their folder; otherwise you're asked once to pick it.
Hiding the background or removing it saves a transparent PNG.

## Features

- **Face**: smooth skin (up to fully smooth), keep texture, remove blemishes and shine, even tone, under-eye,
  skin brightness and warmth, contour, highlight, face light, brows, eyes, teeth, eye color,
  face shape (slim, eyes, nose, mouth, smile, chin, forehead), makeup, hair color.
- **Adjust** (Camera Raw-style), for the whole photo, the subject only, or the background only.
- **Background**: AI auto fix, remove (transparent), studio colors, your own image, blur, light, desaturate.
- **Retouch tools**: seamless spot heal, clone stamp and Mend (color-matched clone), patch, lasso + AI remove object, liquify.
- **Crop**: aspect ratios, rotate, flip.
- **Layers**: Subject and Background (photo), empty paint layers, text, color/gradient fill,
  adjustment layers, image layers, with opacity, blend modes and "only subject / only background".
- **Saved faces**: store a look with a face thumbnail and apply it to any photo.
- **Batch**: apply the current edits to a whole folder (saved into its `simmer` subfolder).
- **RAW files** open using the full-size preview the camera stores inside them.
