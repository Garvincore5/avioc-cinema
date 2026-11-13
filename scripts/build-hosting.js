const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'firebase-public');

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
fs.copyFileSync(path.join(root, 'index.html'), path.join(output, 'index.html'));
['cinema.html', 'watch.html'].forEach(f => {
  const src = path.join(root, f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(output, f));
});
const apiConfig = path.join(root, 'api-config.js');
if (fs.existsSync(apiConfig)) fs.copyFileSync(apiConfig, path.join(output, 'api-config.js'));
const catalogPath = path.join(root, 'new body', 'catalog-data.json');
if (fs.existsSync(catalogPath)) fs.copyFileSync(catalogPath, path.join(output, 'catalog-data.json'));
const assets = path.join(root, 'assets');
if (fs.existsSync(assets)) fs.cpSync(assets, path.join(output, 'assets'), { recursive: true });
// Admin redirect bridge so legacy mobile APKs and direct links immediately load BunnyCDN
const adminDir = path.join(output, 'admin');
fs.mkdirSync(adminDir, { recursive: true });
fs.writeFileSync(
  path.join(adminDir, 'index.html'),
  `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting to Avioc Cinema Admin...</title>
  <meta http-equiv="refresh" content="0; url=https://aviocwatch.b-cdn.net/admin/panel.html">
  <script>
    window.location.replace('https://aviocwatch.b-cdn.net/admin/panel.html' + window.location.search + window.location.hash);
  </script>
</head>
<body style="background:#0e0b16;color:#f3a43b;font-family:sans-serif;display:grid;place-items:center;height:100vh;margin:0">
  <p>Connecting to Avioc Cinema Admin...</p>
</body>
</html>`
);
['Avioc-Cinema-Admin.zip', 'admin-icon-192.png', 'admin-icon-512.png', 'favicon-admin.svg'].forEach((f) => {
  const src = path.join(root, 'admin', f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(adminDir, f));
});
try { require('./generate-sitemap'); } catch (e) {}
['robots.txt', 'sitemap.xml', 'favicon.svg', 'manifest.json', 'sw.js', 'icon-192.png', 'icon-512.png', 'google1ba81ea4cebd12df.html'].forEach((file) => {
  const src = path.join(root, file);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(output, file));
});
fs.readdirSync(root).forEach((f) => {
  if (f.startsWith('google') && f.endsWith('.html')) {
    fs.copyFileSync(path.join(root, f), path.join(output, f));
  }
});

// Copy Downloader web app into firebase-public/downloader
const dlSource = path.join(root, 'downloader');
const dlDest = path.join(output, 'downloader');
if (fs.existsSync(dlSource)) {
  fs.mkdirSync(dlDest, { recursive: true });
  const dlIndex = path.join(dlSource, 'index.html');
  if (fs.existsSync(dlIndex)) fs.copyFileSync(dlIndex, path.join(dlDest, 'index.html'));
  const dlStatic = path.join(dlSource, 'static');
  if (fs.existsSync(dlStatic)) fs.cpSync(dlStatic, path.join(dlDest, 'static'), { recursive: true });
}

// Generate dynamic social share pages & inline embed players for every title in the catalog
try {
  const catalogData = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const mDir = path.join(output, 'm');
  const embedDir = path.join(output, 'embed');
  fs.mkdirSync(mDir, { recursive: true });
  fs.mkdirSync(embedDir, { recursive: true });

  const SITE_URL = 'https://aviocwatch.b-cdn.net';
  const DEFAULT_POSTER = `${SITE_URL}/assets/social/default.jpg`;

  const escapeHtml = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const toAbsoluteUrl = (raw) => {
    if (!raw) return '';
    const cleaned = String(raw).trim().replace(/^(\.\.\/|\.\/)+/, '');
    if (/^https?:\/\//i.test(cleaned)) return cleaned;
    return `${SITE_URL}/${cleaned.replace(/^\/+/, '')}`;
  };

  const getMime = (url) => {
    if (/\.png(\?.*)?$/i.test(url)) return 'image/png';
    if (/\.webp(\?.*)?$/i.test(url)) return 'image/webp';
    return 'image/jpeg';
  };

  const getSocialPosterUrl = (raw) => {
    if (!raw) return DEFAULT_POSTER;
    const cleanFilename = String(raw).split('/').pop()?.split('?')?.[0]?.toLowerCase();
    const baseName = cleanFilename ? cleanFilename.replace(/\.[^.]+$/, '') : '';
    if (baseName && fs.existsSync(path.join(root, 'assets', 'social', `${baseName}.jpg`))) {
      return `${SITE_URL}/assets/social/${baseName}.jpg`;
    }
    const abs = toAbsoluteUrl(raw);
    return abs || DEFAULT_POSTER;
  };

  catalogData.forEach((t) => {
    const posterRaw = t.poster || t.backdrop || DEFAULT_POSTER;
    const socialPosterUrl = escapeHtml(getSocialPosterUrl(posterRaw));
    const posterUrl = escapeHtml(toAbsoluteUrl(posterRaw) || socialPosterUrl);
    const posterMime = getMime(socialPosterUrl);
    const rawStream = t.type === 'series'
      ? (t.seasons?.[0]?.episodes?.[0]?.streamUrl || t.streamUrl || '')
      : (t.partUrls?.[0] || t.streamUrl || '');
    const streamUrl = escapeHtml(toAbsoluteUrl(rawStream));
    const titleEsc = escapeHtml(t.title);
    const vjEsc = escapeHtml(t.vj ? `VJ ${String(t.vj).replace(/^VJ\s+/i, '')}` : 'Translated Cinema');
    const synopsisEsc = escapeHtml(t.synopsis || `Stream ${t.title} (${vjEsc}) in HD on Avioc Cinema.`);
    const embedUrl = `${SITE_URL}/embed/${encodeURIComponent(t.id)}.html`;
    const sharePageUrl = `${SITE_URL}/m/${encodeURIComponent(t.id)}.html`;

    const shareHtml = `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="utf-8">
  <title>🎬 ${titleEsc} (${vjEsc}) — Avioc Cinema</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${synopsisEsc}">
  <!-- Open Graph / WhatsApp / Facebook / Telegram Poster Preview -->
  <meta property="og:site_name" content="Avioc Cinema">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${sharePageUrl}">
  <meta property="og:title" content="🎬 ${titleEsc} (${vjEsc})">
  <meta property="og:description" content="${synopsisEsc}">
  <meta property="og:image" content="${socialPosterUrl}">
  <meta property="og:image:secure_url" content="${socialPosterUrl}">
  <meta property="og:image:type" content="${posterMime}">
  <meta property="og:image:alt" content="${titleEsc}">
  <link rel="image_src" href="${socialPosterUrl}">
  <!-- Twitter / X Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@AviocCinema">
  <meta name="twitter:title" content="🎬 ${titleEsc} (${vjEsc})">
  <meta name="twitter:description" content="${synopsisEsc}">
  <meta name="twitter:image" content="${socialPosterUrl}">
  <!-- Client-side Redirect (Only runs in browser for real users, bots/scrapers read meta tags above) -->
  <script>
    try {
      var vid = localStorage.getItem('avioc:visitor_id') || ('v_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8));
      localStorage.setItem('avioc:visitor_id', vid);
      var q = new URLSearchParams(location.search);
      var refUid = q.get('ref_uid') || '';
      var refVid = q.get('ref_vid') || '';
      var refName = q.get('ref_name') || '';
      fetch('https://avioc-cinema-backend.onrender.com/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          visitorId: vid,
          eventType: 'share_open',
          activity: 'Opened Shared Movie: ' + ${JSON.stringify(t.title)},
          itemId: ${JSON.stringify(t.id)},
          itemTitle: ${JSON.stringify(t.title)},
          itemType: ${JSON.stringify(t.type || 'film')},
          vj: ${JSON.stringify(t.vj ? `VJ ${String(t.vj).replace(/^VJ\s+/i, '')}` : 'Translated Cinema')},
          refUid: refUid,
          refVid: refVid,
          refName: refName
        })
      }).catch(function() {});
      if (refUid || refVid) {
        fetch('https://avioc-cinema-backend.onrender.com/api/referrals/visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({
            referrerId: refUid,
            referrerVid: refVid,
            referrerName: refName,
            visitorId: vid,
            shareUrl: location.href,
            itemId: ${JSON.stringify(t.id)},
            itemTitle: ${JSON.stringify(t.title)}
          })
        }).catch(function() {});
      }
    } catch (e) {}
    var passSearch = location.search ? location.search.replace(/^\\?/, '&') : '';
    location.replace('/?m=' + encodeURIComponent(${JSON.stringify(t.id)}) + '&play=1' + passSearch);
  </script>
  <noscript>
    <meta http-equiv="refresh" content="2;url=/?m=${encodeURIComponent(t.id)}&play=1">
  </noscript>
</head>
<body style="background:#0F0C17;color:#fff;font-family:system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center">
  <img src="${socialPosterUrl}" alt="${titleEsc}" style="max-width:240px;width:100%;border-radius:14px;box-shadow:0 12px 36px rgba(0,0,0,0.85);margin-bottom:18px" onerror="this.src='${DEFAULT_POSTER}'">
  <h2 style="margin:0 0 8px;font-size:22px;font-weight:800">🎬 ${titleEsc}</h2>
  <p style="color:#e50914;font-size:14px;font-weight:700;margin:0 0 16px">${vjEsc}</p>
  <p style="color:#aaa;font-size:14px;margin:0 0 24px">Opening movie on Avioc Cinema...</p>
  <a href="/?m=${encodeURIComponent(t.id)}&play=1" style="background:#E11D48;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:800;font-size:14px;display:inline-block">Watch Now</a>
</body>
</html>`;
    fs.writeFileSync(path.join(mDir, `${t.id}.html`), shareHtml);

    const embedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${titleEsc} — Avioc Cinema Mini Player</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{width:100%;height:100%;background:#08060c;color:#fff;font-family:system-ui,-apple-system,sans-serif;overflow:hidden}
    .wrap{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#000}
    video{width:100%;height:100%;object-fit:contain;background:#000}
    .brand{position:absolute;top:12px;left:12px;z-index:10;display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:rgba(15,12,23,.82);backdrop-filter:blur(8px);border:1px solid rgba(244,183,64,.4);color:#fff;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:.03em;box-shadow:0 4px 16px rgba(0,0,0,.5)}
    .brand span.dot{width:8px;height:8px;border-radius:50%;background:#E11D48;box-shadow:0 0 8px #E11D48}
    .brand b{color:#F4B740}
    .pip-btn{position:absolute;top:12px;right:12px;z-index:10;padding:6px 11px;border-radius:999px;background:rgba(15,12,23,.82);border:1px solid rgba(255,255,255,.22);color:#fff;font-size:12px;font-weight:600;cursor:pointer}
  </style>
</head>
<body>
  <div class="wrap">
    <a class="brand" href="/?m=${encodeURIComponent(t.id)}&play=1" target="_blank" rel="noopener">
      <span class="dot"></span>
      <b>AVIOC CINEMA</b> • ${titleEsc}
    </a>
    <button class="pip-btn" id="pip" type="button">PiP Mini Player</button>
    <video id="v" src="${streamUrl}" poster="${posterUrl}" controls playsinline autoplay></video>
  </div>
  <script>
    const v = document.getElementById('v');
    const pip = document.getElementById('pip');
    v.play().catch(() => {
      v.muted = true;
      v.play().catch(() => {});
      window.addEventListener('pointerdown', () => { v.muted = false; }, { once: true });
    });
    pip.onclick = async () => {
      try {
        if (document.pictureInPictureElement) await document.exitPictureInPicture();
        else if (v.requestPictureInPicture) await v.requestPictureInPicture();
        else if (v.webkitSetPresentationMode) v.webkitSetPresentationMode('picture-in-picture');
      } catch (e) {}
    };
    v.addEventListener('timeupdate', () => {
      if (v.currentTime >= 20) {
        v.pause();
        try {
          if (window.top && window.top !== window) {
            window.top.location.href = '/?m=' + encodeURIComponent(${JSON.stringify(t.id)}) + '&play=1';
            return;
          }
        } catch (_) {}
        window.location.href = '/?m=' + encodeURIComponent(${JSON.stringify(t.id)}) + '&play=1';
      }
    });
  </script>
</body>
</html>`;
    fs.writeFileSync(path.join(embedDir, `${t.id}.html`), embedHtml);
  });

  // Also generate social share & inline embed pages for all Live TV channels
  const tvDir = path.join(output, 'tv');
  fs.mkdirSync(tvDir, { recursive: true });
  const tvChannels = [
      { id: 'bukedde-1', name: 'Bukedde 1', group: 'Vision Group', poster: 'assets/posters/bukedde_1.png', streamUrl: 'https://stream.hydeinnovations.com:443/bukedde1flussonic/index.m3u8' },
    { id: 'bukedde-2', name: 'Bukedde 2', group: 'Vision Group', poster: 'assets/posters/bukedde_2.png', streamUrl: 'https://stream.hydeinnovations.com:443/bukedde2flussonic/index.m3u8' },
    { id: 'wan-luo-tv', name: 'Wan Luo TV', group: 'Vision Group', poster: 'assets/posters/wan_luo.png', streamUrl: 'https://stream.hydeinnovations.com:443/luotv-flussonic/index.m3u8' },
    { id: 'galaxy-tv', name: 'Galaxy TV', group: 'Uganda & Regional TV', poster: 'assets/posters/galaxy_tv.png', streamUrl: 'https://galaxytvonline.com/hls/smil:galaxytv.smil/playlist.m3u8' },
    { id: 'kbs-tv', name: 'KBS TV', group: 'Uganda & Regional TV', poster: 'assets/posters/kbs_tv.png', streamUrl: 'https://www.kbstv.co.ug/live/abr/master.m3u8' },
    { id: 'kstv-uganda', name: 'KSTV Uganda', group: 'Uganda & Regional TV', poster: 'assets/posters/kstv_uganda.png', streamUrl: 'https://live.esteem.africa/live/kstv-uganda-a3023c.m3u8' },
    { id: 'btn-tv', name: 'BTN TV', group: 'BTN Network', poster: 'assets/posters/btn_tv.png', streamUrl: 'https://tv.btnrwanda.com:3973/live/btnv2live.m3u8' },
    { id: 'bplus-tv', name: 'B+ TV', group: 'BTN Network', poster: 'assets/posters/bplus_tv.png', streamUrl: 'https://tv.btnrwanda.com:3432/live/bpluslive.m3u8' },
    { id: 'rt', name: 'RT', group: 'International News', poster: 'assets/posters/rt_logo.png', streamUrl: 'https://rt-glb.rttv.com/dvr/rtnews/playlist.m3u8' },
    { id: 'ntv-uganda', name: 'NTV Uganda', group: 'Nation Media Group', poster: 'assets/posters/ntv_uganda.png', streamUrl: 'https://ams-2629.antmedia.cloud/LiveApp/streams/abul2026.m3u8' }
  ];

  tvChannels.forEach((ch) => {
    const socialPosterUrl = escapeHtml(getSocialPosterUrl(ch.poster));
    const posterUrl = escapeHtml(toAbsoluteUrl(ch.poster) || socialPosterUrl);
    const posterMime = getMime(socialPosterUrl);
    const nameEsc = escapeHtml(ch.name);
    const groupEsc = escapeHtml(ch.group);
    const descEsc = escapeHtml(`Watch ${ch.name} (${ch.group}) LIVE in HD on Avioc Cinema!`);
    const sharePageUrl = `${SITE_URL}/tv/${encodeURIComponent(ch.id)}.html`;
    const embedUrl = `${SITE_URL}/embed/tv-${encodeURIComponent(ch.id)}.html`;
    const tvHtml = `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="utf-8">
  <title>📺 Watch ${nameEsc} LIVE — Avioc Cinema</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${descEsc}">
  <!-- Open Graph / WhatsApp / Facebook / Telegram Live TV Poster Preview -->
  <meta property="og:site_name" content="Avioc Cinema">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${sharePageUrl}">
  <meta property="og:title" content="📺 Watch ${nameEsc} LIVE">
  <meta property="og:description" content="${descEsc}">
  <meta property="og:image" content="${socialPosterUrl}">
  <meta property="og:image:secure_url" content="${socialPosterUrl}">
  <meta property="og:image:type" content="${posterMime}">
  <meta property="og:image:alt" content="${nameEsc}">
  <link rel="image_src" href="${socialPosterUrl}">
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@AviocCinema">
  <meta name="twitter:title" content="📺 Watch ${nameEsc} LIVE">
  <meta name="twitter:description" content="${descEsc}">
  <meta name="twitter:image" content="${socialPosterUrl}">
  <!-- Instant App Redirect with Auto-Play for Human Browsers -->
  <script>
    try {
      var vid = localStorage.getItem('avioc:visitor_id') || ('v_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8));
      localStorage.setItem('avioc:visitor_id', vid);
      var q = new URLSearchParams(location.search);
      var refUid = q.get('ref_uid') || '';
      var refVid = q.get('ref_vid') || '';
      var refName = q.get('ref_name') || '';
      fetch('https://avioc-cinema-backend.onrender.com/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          visitorId: vid,
          eventType: 'share_open',
          activity: 'Opened Shared Live TV: ' + ${JSON.stringify(ch.name)},
          itemId: ${JSON.stringify(ch.id)},
          itemTitle: ${JSON.stringify(ch.name)},
          itemType: 'tv',
          vj: ${JSON.stringify(ch.group)},
          refUid: refUid,
          refVid: refVid,
          refName: refName
        })
      }).catch(function() {});
      if (refUid || refVid) {
        fetch('https://avioc-cinema-backend.onrender.com/api/referrals/visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({
            referrerId: refUid,
            referrerVid: refVid,
            referrerName: refName,
            visitorId: vid,
            shareUrl: location.href,
            itemId: ${JSON.stringify(ch.id)},
            itemTitle: ${JSON.stringify(ch.name)}
          })
        }).catch(function() {});
      }
    } catch (e) {}
    var passSearch = location.search ? location.search.replace(/^\\?/, '&') : '';
    location.replace('/?tv=' + encodeURIComponent(${JSON.stringify(ch.name)}) + passSearch);
  </script>
  <noscript>
    <meta http-equiv="refresh" content="2;url=/?tv=${encodeURIComponent(ch.name)}">
  </noscript>
</head>
<body style="background:#0F0C17;color:#fff;font-family:system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center">
  <img src="${socialPosterUrl}" alt="${nameEsc}" style="max-width:240px;width:100%;border-radius:14px;box-shadow:0 12px 36px rgba(0,0,0,0.85);margin-bottom:18px" onerror="this.src='${DEFAULT_POSTER}'">
  <h2 style="margin:0 0 8px;font-size:22px;font-weight:800">📺 ${nameEsc}</h2>
  <p style="color:#e50914;font-size:14px;font-weight:700;margin:0 0 16px">${groupEsc}</p>
  <p style="color:#aaa;font-size:14px;margin:0 0 24px">Tuning in on Avioc Cinema...</p>
  <a href="/?tv=${encodeURIComponent(ch.name)}" style="background:#E11D48;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:800;font-size:14px;display:inline-block">Watch Live TV</a>
</body>
</html>`;
    fs.writeFileSync(path.join(tvDir, `${ch.id}.html`), tvHtml);

    const tvEmbedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${nameEsc} LIVE — Avioc Cinema</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.jsdelivr.net/npm/hls.js@1"></script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{width:100%;height:100%;background:#000;color:#fff;font-family:system-ui,sans-serif;overflow:hidden}
    .wrap{position:relative;width:100%;height:100%}
    video{width:100%;height:100%;object-fit:contain;background:#000}
    .brand{position:absolute;top:12px;left:12px;z-index:10;display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:rgba(15,12,23,.82);border:1px solid rgba(244,183,64,.4);color:#fff;text-decoration:none;font-size:12px;font-weight:700}
    .brand span.dot{width:8px;height:8px;border-radius:50%;background:#E11D48;box-shadow:0 0 8px #E11D48}
    .brand b{color:#F4B740}
  </style>
</head>
<body>
  <div class="wrap">
    <a class="brand" href="/?tv=${encodeURIComponent(ch.id)}&play=1" target="_blank" rel="noopener">
      <span class="dot"></span>
      <b>AVIOC CINEMA</b> • ${nameEsc} (${groupEsc})
    </a>
    <video id="v" poster="${posterUrl}" controls playsinline autoplay></video>
  </div>
  <script>
    const v = document.getElementById('v');
    const src = ${JSON.stringify(ch.streamUrl)};
    const start = () => v.play().catch(() => { v.muted = true; v.play().catch(() => {}); window.addEventListener('pointerdown', () => { v.muted = false; }, { once: true }); });
    if (window.Hls && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, start);
    } else {
      v.src = src;
      start();
    }
  </script>
</body>
</html>`;
    fs.writeFileSync(path.join(embedDir, `tv-${ch.id}.html`), tvEmbedHtml);
  });
  console.log(`Generated ${catalogData.length} movie and ${tvChannels.length} TV social link preview & embed pages.`);
} catch (err) {
  console.warn('Could not generate social share pages:', err);
}

console.log('Prepared Firebase Hosting files, including Google verification and SEO assets, in firebase-public/.');
