# Avioc Clip Maker

Open `index.html` in the latest Chrome or Edge. Search **Choose from Avioc Cinema** to select a movie, movie part, or series episode already in the catalog. The editor streams that source from Avioc and crops it in the browser; it does not download the whole movie. You can also choose a local video file.

Set the clip start and end, use the preview seek bar to inspect the selection, choose a preset or custom crop ratio, then export. Available ratios are 9:16, 4:5, 1:1, 16:9, and custom width-to-height values. Output width can be 720 or 1080 pixels.

## WhatsApp playable link

For an Avioc library source, choose **Create playable WhatsApp link**. The link uses a poster-specific preview and opens a fullscreen-capable player. At the end of the selected segment, a movie card appears with its poster and a button that opens that movie or series in Avioc Cinema. It references the public Avioc stream and does not create another full-length or short video file.

For a local video, the link cannot reference a file on your device. Upload the exported clip to public hosting, paste its URL in **Public link to your exported clip**, then create the playable link.

The player is `https://aviocwatch.b-cdn.net/tiktok-ads/playable-v4.html`; per-title poster preview pages are under `/m/clip-v4-{title-id}.html`. The catalog picker uses the snapshot in `catalog.js`; update that file when the Avioc catalog changes.

The browser's built-in encoder exports MP4 when supported, otherwise WebM. WebM may need conversion before posting on some platforms.
