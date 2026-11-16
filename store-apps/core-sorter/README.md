# Core Sorter

A local-first file organizer with a Python desktop app and a browser app.

## Desktop

Run `python comp/sorter.py` with Python 3.10 or newer. It uses only the Python standard library and opens files with the computer's default application.

## Web

Serve the `public` directory from a local web server (for example, `python -m http.server 8000 --directory public`) and open it in a recent Chrome or Edge browser. Choose a folder, review the plan, and confirm to sort. The browser's File System Access API is required for folder access and organizing files; other browsers show a compatibility message.

Both versions preview first, sort only files directly in the selected folder, preserve existing files, and create numbered names if a destination already contains the same filename. Each destination is one folder directly inside the selected folder: for example `JPEG`, `RAW`, `PSD`, `PDF`, `PY Files`, `Videos`, and `Audio`. Slow-motion videos go into `Slow Motion Videos` when explicit slow-motion metadata is found. The desktop app uses `ffprobe` when available; the browser checks metadata text embedded in common video files. Files without a detectable slow-motion marker go into `Videos`.

In the web app, supported image formats appear in a photo gallery after folder access is granted. Select JPG/JPEG photos to route them to `JPG Selected`; selected camera RAW photos go to `RAW Selected`. Other selected image formats get their own `<FORMAT> Selected` folder. These folders are created when sorting is confirmed.

## Avioc Apps Store package

The store's Windows x64 release is a portable executable built from `src/sorter.py`. It uses Python's standard library and asks for confirmation before moving files. It is not a setup wizard or an installed Start-menu app.
# Core Sorter for Windows

Core Sorter previews a plan for organizing files into type-specific folders. It only sorts files directly in the selected folder, keeps existing files, and asks for confirmation before moving anything. This Avioc package is a portable Windows x64 executable; it does not create a Start-menu installation. The browser edition requires a desktop browser with the File System Access API.
