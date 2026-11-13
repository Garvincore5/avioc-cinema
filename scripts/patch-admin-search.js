const fs = require('fs');
const path = require('path');

const adminHtmlPath = path.join(__dirname, '..', 'admin', 'index.html');
let adminHtml = fs.readFileSync(adminHtmlPath, 'utf8');

// 1. Update CSS for modal-backdrop, modal, and msg-scroll-box
const targetCss = `    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 100;
      background: rgba(6, 4, 10, 0.8);
      backdrop-filter: blur(8px);
      display: grid;
      place-items: center;
      padding: 18px;
    }
    .modal-backdrop[hidden] { display: none; }
    .modal {
      width: min(460px, 100%);
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 22px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65);
      display: flex;
      flex-direction: column;
      gap: 14px;
    }`;

const replaceCss = `    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 100;
      background: rgba(6, 4, 10, 0.82);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      overflow-y: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      box-sizing: border-box;
    }
    .modal-backdrop[hidden] { display: none; }
    .modal {
      width: min(540px, 100%);
      max-height: min(90dvh, 760px);
      overflow-y: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 22px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65);
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-sizing: border-box;
      scrollbar-width: thin;
      scrollbar-color: var(--accent) rgba(255, 255, 255, 0.06);
    }
    .modal::-webkit-scrollbar {
      width: 6px;
    }
    .modal::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.04);
      border-radius: 999px;
    }
    .modal::-webkit-scrollbar-thumb {
      background: var(--accent);
      border-radius: 999px;
    }
    .msg-scroll-box {
      max-height: 95px;
      overflow-y: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
      scrollbar-width: thin;
      scrollbar-color: var(--accent) rgba(255, 255, 255, 0.06);
    }
    .msg-scroll-box::-webkit-scrollbar {
      width: 4px;
    }
    .msg-scroll-box::-webkit-scrollbar-thumb {
      background: rgba(243, 164, 59, 0.4);
      border-radius: 999px;
    }`;

if (!adminHtml.includes(targetCss)) {
  console.error('Error: targetCss not found in admin/index.html');
  process.exit(1);
}
adminHtml = adminHtml.replace(targetCss, replaceCss);

// 2. Update mobile modal CSS
const targetMobile = `      .modal {
        width: 95vw !important;
        max-width: 95vw !important;
        padding: 16px 14px;
        border-radius: 14px;
      }`;
const replaceMobile = `      .modal {
        width: 100% !important;
        max-width: 100% !important;
        max-height: min(92dvh, 680px) !important;
        padding: 16px 14px;
        border-radius: 14px;
      }`;
if (adminHtml.includes(targetMobile)) {
  adminHtml = adminHtml.replace(targetMobile, replaceMobile);
}

// 3. Update movie group HTML inside send-msg-form
const targetMovieGroup = `      <div id="send-msg-movie-group" hidden style="margin-bottom:12px;position:relative">
        <label class="field" style="margin-bottom:4px">
          Select Movie / Channel *
          <div style="position:relative">
            <input type="text" id="send-msg-movie-search" autocomplete="off" placeholder="🔍 Type movie title or VJ name (e.g. Four, Hope, Junior)..." style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--ink);font-size:0.88rem">
            <input type="hidden" id="send-msg-movie-id" value="">
          </div>
          <small style="color:var(--muted);font-size:0.75rem">Typing displays instant matches from our catalog with posters and IDs</small>
        </label>

        <!-- Selected Movie Badge -->
        <div id="send-msg-selected-movie" hidden style="margin-top:6px;display:flex;align-items:center;gap:10px;background:rgba(243,164,59,0.12);border:1px solid rgba(243,164,59,0.4);padding:8px 12px;border-radius:8px">
          <img id="send-msg-selected-poster" src="" style="width:34px;height:48px;border-radius:4px;object-fit:cover;background:#20192e" alt="">
          <div style="flex:1;min-width:0">
            <div id="send-msg-selected-title" style="font-weight:700;color:var(--ink);font-size:0.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Movie Title</div>
            <div style="font-size:0.75rem;color:var(--muted)">
              <span id="send-msg-selected-vj" style="color:var(--gold);font-weight:600">VJ</span> · 
              <span id="send-msg-selected-id" style="opacity:0.8;font-family:monospace">id</span>
            </div>
          </div>
          <button type="button" id="send-msg-clear-movie" style="background:rgba(255,255,255,0.08);border:1px solid var(--border);border-radius:6px;color:var(--ink);cursor:pointer;font-size:12px;padding:5px 9px;font-weight:600" title="Change movie">✕ Change</button>
        </div>

        <!-- Autocomplete Suggestions Dropdown List -->
        <div id="send-msg-movie-dropdown" hidden style="position:absolute;left:0;right:0;top:100%;z-index:99999;max-height:240px;overflow-y:auto;background:#181324;border:1px solid var(--gold);border-radius:8px;box-shadow:0 12px 35px rgba(0,0,0,0.9);margin-top:4px">
        </div>
      </div>`;

const replaceMovieGroup = `      <div id="send-msg-movie-group" style="margin-bottom:12px;position:relative">
        <label class="field" style="margin-bottom:4px">
          Attach Movie / Live TV Channel (Optional)
          <div style="position:relative">
            <input type="text" id="send-msg-movie-search" autocomplete="off" placeholder="🔍 Search movie title or VJ name (e.g. Dark Wolf, Enola, Junior, Coma)..." style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--ink);font-size:0.88rem">
            <input type="hidden" id="send-msg-movie-id" value="">
          </div>
          <small style="color:var(--muted);font-size:0.75rem">Instant search with posters. Selecting a title automatically sets action to Watch Now.</small>
        </label>

        <!-- Selected Movie Badge -->
        <div id="send-msg-selected-movie" hidden style="margin-top:6px;display:flex;align-items:center;gap:10px;background:rgba(243,164,59,0.12);border:1px solid rgba(243,164,59,0.4);padding:8px 12px;border-radius:8px">
          <img id="send-msg-selected-poster" src="" style="width:34px;height:48px;border-radius:4px;object-fit:cover;background:#20192e" alt="">
          <div style="flex:1;min-width:0">
            <div id="send-msg-selected-title" style="font-weight:700;color:var(--ink);font-size:0.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Movie Title</div>
            <div style="font-size:0.75rem;color:var(--muted)">
              <span id="send-msg-selected-vj" style="color:var(--gold);font-weight:600">VJ</span> · 
              <span id="send-msg-selected-id" style="opacity:0.8;font-family:monospace">id</span>
            </div>
          </div>
          <button type="button" id="send-msg-clear-movie" style="background:rgba(255,255,255,0.08);border:1px solid var(--border);border-radius:6px;color:var(--ink);cursor:pointer;font-size:12px;padding:5px 9px;font-weight:600" title="Remove attached movie">✕ Remove</button>
        </div>

        <!-- Autocomplete Suggestions Dropdown List -->
        <div id="send-msg-movie-dropdown" hidden style="width:100%;max-height:220px;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scroll-behavior:smooth;background:#181324;border:1px solid var(--gold);border-radius:8px;box-shadow:0 12px 35px rgba(0,0,0,0.9);margin-top:6px;scrollbar-width:thin">
        </div>
      </div>`;

if (!adminHtml.includes(targetMovieGroup)) {
  console.error('Error: targetMovieGroup not found in admin/index.html');
  process.exit(1);
}
adminHtml = adminHtml.replace(targetMovieGroup, replaceMovieGroup);

// 4. Inject INLINE_CATALOG and update searchMovies and dropdown handlers
const catalogJson = fs.readFileSync(path.join(__dirname, '..', 'catalog-data.json'), 'utf8');
const catalogRaw = JSON.parse(catalogJson);
const minimalCatalog = catalogRaw.map(t => ({
  id: t.id,
  title: t.title,
  type: t.type || 'film',
  vj: t.vj || '',
  year: t.year || 2026,
  poster: t.poster || t.backdrop || '',
  streamUrl: t.streamUrl || ''
}));

const targetCatalogInit = `    let dashData = null;
    let catalogItems = [];
    const catalogById = new Map();`;

const replaceCatalogInit = `    let dashData = null;
    const INLINE_CATALOG = ${JSON.stringify(minimalCatalog)};
    let catalogItems = [];
    const catalogById = new Map();`;

if (!adminHtml.includes(targetCatalogInit)) {
  console.error('Error: targetCatalogInit not found');
  process.exit(1);
}
adminHtml = adminHtml.replace(targetCatalogInit, replaceCatalogInit);

// After fmtVj declaration, initialize catalogItems from INLINE_CATALOG
const targetFmtVjEnd = `    const fmtVj = (vj) => {
      const s = String(vj || '').trim();
      if (!s) return 'Translated';
      return /^vj\\b/i.test(s) || /english|group|network|tv|news/i.test(s) ? s : \`VJ \${s}\`;
    };`;

const replaceFmtVjEnd = `    const fmtVj = (vj) => {
      const s = String(vj || '').trim();
      if (!s) return 'Translated';
      return /^vj\\b/i.test(s) || /english|group|network|tv|news/i.test(s) ? s : \`VJ \${s}\`;
    };

    // Immediate offline-first catalog initialization
    catalogItems = INLINE_CATALOG.map((t) => ({
      id: t.id,
      title: t.title,
      type: t.type || 'film',
      vj: fmtVj(t.vj),
      year: t.year || 2026,
      poster: t.poster || ''
    }));
    catalogItems.forEach((item) => catalogById.set(item.id, item));`;

if (!adminHtml.includes(targetFmtVjEnd)) {
  console.error('Error: targetFmtVjEnd not found');
  process.exit(1);
}
adminHtml = adminHtml.replace(targetFmtVjEnd, replaceFmtVjEnd);

// Replace loadCatalogMetadata and searchMovies and renderMovieDropdown
const targetSearchSection = `    async function loadCatalogMetadata() {
      try {
        let res = await fetch('../catalog-data.json?v=' + Date.now());
        if (!res.ok) res = await fetch('/catalog-data.json?v=' + Date.now());
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            catalogItems = data.map((t) => ({
              id: t.id,
              title: t.title,
              type: t.type || 'film',
              vj: fmtVj(t.vj),
              year: t.year || 2026,
              poster: t.poster || t.backdrop || ''
            }));
            catalogItems.forEach((item) => catalogById.set(item.id, item));
            return;
          }
        }
      } catch {}
      try {
        const resHtml = await fetch('../index.html');
        if (resHtml.ok) {
          const text = await resHtml.text();
          const match = text.match(/const\\s+SOURCE_CATALOG\\s*=\\s*(\\[[\\s\\S]*?\\]);/);
          if (match && match[1]) {
            const data = JSON.parse(match[1]);
            catalogItems = data.map((t) => ({
              id: t.id,
              title: t.title,
              type: t.type || 'film',
              vj: fmtVj(t.vj),
              year: t.year || 2026,
              poster: t.poster || t.backdrop || ''
            }));
            catalogItems.forEach((item) => catalogById.set(item.id, item));
          }
        }
      } catch {}
    }

    function searchMovies(query) {
      if (!query || !query.trim()) return [];
      const q = query.trim().toLowerCase();
      const pool = [...catalogItems, ...TV_CHANNELS];
      return pool.filter((item) => {
        const text = \`\${item.title || ''} \${item.vj || ''} \${item.id || ''} \${item.type || ''}\`.toLowerCase();
        return text.includes(q);
      }).slice(0, 15);
    }

    function renderMovieDropdown(matches) {
      const dropdown = $('#send-msg-movie-dropdown');
      if (!dropdown) return;
      if (!matches || !matches.length) {
        dropdown.innerHTML = \`<div style="padding:12px;font-size:0.85rem;color:var(--muted);text-align:center">No titles found for that keyword. Try another title or VJ name.</div>\`;
        dropdown.hidden = false;
        return;
      }
      dropdown.innerHTML = matches.map((m) => {
        const poster = adminPosterUrl(m.poster);
        const typeTag = m.type === 'tv' ? '📺 TV' : (m.type === 'series' ? '📺 Series' : '🎬 Movie');
        return \`
          <div class="movie-suggest-item" data-select-movie-id="\${esc(m.id)}" data-select-movie-title="\${esc(m.title)}" data-select-movie-vj="\${esc(m.vj || '')}" data-select-movie-poster="\${esc(poster)}" style="display:flex;align-items:center;gap:10px;padding:8px 12px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.05);transition:background 0.15s">
            \${poster ? \`<img src="\${esc(poster)}" style="width:32px;height:44px;border-radius:4px;object-fit:cover;background:#1f192b" alt="" onerror="this.style.display='none'">\` : \`<div style="width:32px;height:44px;border-radius:4px;background:#1f192b;display:grid;place-items:center;font-size:16px">🎬</div>\`}
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;color:var(--ink);font-size:0.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">\${esc(m.title)}</div>
              <div style="font-size:0.75rem;color:var(--muted);display:flex;gap:6px;align-items:center">
                <span style="color:var(--gold);font-weight:600">\${esc(m.vj || 'Translated')}</span>
                <span>•</span>
                <span style="opacity:0.8">\${esc(m.year || 2026)}</span>
                <span class="tag sm \${m.type === 'tv' ? 'blue' : 'gold'}" style="margin-left:auto">\${typeTag}</span>
              </div>
            </div>
          </div>
        \`;
      }).join('');
      dropdown.hidden = false;
    }`;

const replaceSearchSection = `    async function loadCatalogMetadata() {
      try {
        let res = await fetch('../catalog-data.json?v=' + Date.now());
        if (!res.ok) res = await fetch('/catalog-data.json?v=' + Date.now());
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length) {
            catalogItems = data.map((t) => ({
              id: t.id,
              title: t.title,
              type: t.type || 'film',
              vj: fmtVj(t.vj),
              year: t.year || 2026,
              poster: t.poster || t.backdrop || ''
            }));
            catalogById.clear();
            catalogItems.forEach((item) => catalogById.set(item.id, item));
            TV_CHANNELS.forEach((ch) => catalogById.set(ch.id, ch));
            return;
          }
        }
      } catch {}
    }

    function searchMovies(query) {
      const pool = [...catalogItems, ...TV_CHANNELS];
      if (!query || !query.trim()) {
        return pool.slice(0, 15);
      }
      const raw = query.trim().toLowerCase();
      const tokens = raw.split(/\\s+/).filter(Boolean);
      return pool.filter((item) => {
        const text = \`\${item.title || ''} \${item.vj || ''} \${item.id || ''} \${item.type || ''}\`.toLowerCase();
        return tokens.every((tok) => text.includes(tok));
      }).slice(0, 20);
    }

    function renderMovieDropdown(matches, isDefault = false) {
      const dropdown = $('#send-msg-movie-dropdown');
      if (!dropdown) return;
      if (!matches || !matches.length) {
        dropdown.innerHTML = \`<div style="padding:12px;font-size:0.85rem;color:var(--muted);text-align:center">No titles found for that keyword. Try another title or VJ name.</div>\`;
        dropdown.hidden = false;
        return;
      }
      const header = isDefault
        ? \`<div style="padding:7px 12px;font-size:0.75rem;font-weight:700;color:var(--gold);background:rgba(243,164,59,0.08);border-bottom:1px solid rgba(255,255,255,0.06);letter-spacing:0.5px">🔥 RECENT &amp; POPULAR TITLES (CLICK TO ATTACH)</div>\`
        : \`<div style="padding:7px 12px;font-size:0.75rem;font-weight:700;color:var(--muted);background:rgba(255,255,255,0.04);border-bottom:1px solid rgba(255,255,255,0.06)">🔍 \${matches.length} MATCHING TITLES (CLICK TO ATTACH)</div>\`;
      dropdown.innerHTML = header + matches.map((m) => {
        const poster = adminPosterUrl(m.poster);
        const typeTag = m.type === 'tv' ? '📺 TV' : (m.type === 'series' ? '📺 Series' : '🎬 Movie');
        return \`
          <div class="movie-suggest-item" data-select-movie-id="\${esc(m.id)}" data-select-movie-title="\${esc(m.title)}" data-select-movie-vj="\${esc(m.vj || '')}" data-select-movie-poster="\${esc(poster)}" style="display:flex;align-items:center;gap:10px;padding:8px 12px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.05);transition:background 0.15s">
            \${poster ? \`<img src="\${esc(poster)}" style="width:32px;height:44px;border-radius:4px;object-fit:cover;background:#1f192b" alt="" onerror="this.style.display='none'">\` : \`<div style="width:32px;height:44px;border-radius:4px;background:#1f192b;display:grid;place-items:center;font-size:16px">🎬</div>\`}
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;color:var(--ink);font-size:0.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">\${esc(m.title)}</div>
              <div style="font-size:0.75rem;color:var(--muted);display:flex;gap:6px;align-items:center">
                <span style="color:var(--gold);font-weight:600">\${esc(m.vj || 'Translated')}</span>
                <span>•</span>
                <span style="opacity:0.8">\${esc(m.year || 2026)}</span>
                <span class="tag sm \${m.type === 'tv' ? 'blue' : 'gold'}" style="margin-left:auto">\${typeTag}</span>
              </div>
            </div>
          </div>
        \`;
      }).join('');
      dropdown.hidden = false;
    }`;

if (!adminHtml.includes(targetSearchSection)) {
  console.error('Error: targetSearchSection not found');
  process.exit(1);
}
adminHtml = adminHtml.replace(targetSearchSection, replaceSearchSection);

// Update selectMovieForNotification and add clearSelectedMovie
const targetSelectMovie = `    function selectMovieForNotification(id, title, vj, poster) {
      $('#send-msg-movie-id').value = id;
      const selectedBox = $('#send-msg-selected-movie');
      const searchInput = $('#send-msg-movie-search');
      const dropdown = $('#send-msg-movie-dropdown');
      if (dropdown) dropdown.hidden = true;

      if (selectedBox) {
        $('#send-msg-selected-title').textContent = title;
        $('#send-msg-selected-vj').textContent = vj || 'Translated';
        $('#send-msg-selected-id').textContent = id;
        const posterEl = $('#send-msg-selected-poster');
        if (posterEl) {
          if (poster) {
            posterEl.src = poster;
            posterEl.style.display = 'block';
          } else {
            posterEl.style.display = 'none';
          }
        }
        selectedBox.hidden = false;
      }
      if (searchInput) {
        searchInput.value = '';
        searchInput.placeholder = 'Selected: ' + title;
      }

      // Auto update notification title and message if default
      const curTitle = ($('#send-msg-title')?.value || '').trim();
      if (!curTitle || curTitle === 'Avioc Cinema' || curTitle === 'Avioc Cinema New Release') {
        if ($('#send-msg-title')) $('#send-msg-title').value = \`🎬 \${title} (\${vj || 'Avioc Cinema'})\`;
      }
      const curMsg = ($('#send-msg-text')?.value || '').trim();
      if (!curMsg || curMsg.includes('New blockbuster movie added') || curMsg.includes('Now streaming')) {
        if ($('#send-msg-text')) $('#send-msg-text').value = \`🍿 Now streaming: \${title}! Translated by \${vj || 'Avioc Cinema'}. Watch in full HD today.\`;
      }
      if ($('#send-msg-cta-type')) $('#send-msg-cta-type').value = 'play_movie';
      if ($('#send-msg-cta-text')) $('#send-msg-cta-text').value = 'Watch Now';
      if ($('#send-msg-btn-yes')) $('#send-msg-btn-yes').value = 'Watch Now';
    }`;

const replaceSelectMovie = `    function selectMovieForNotification(id, title, vj, poster) {
      if ($('#send-msg-movie-id')) $('#send-msg-movie-id').value = id;
      const selectedBox = $('#send-msg-selected-movie');
      const searchInput = $('#send-msg-movie-search');
      const dropdown = $('#send-msg-movie-dropdown');
      if (dropdown) dropdown.hidden = true;

      if (selectedBox) {
        if ($('#send-msg-selected-title')) $('#send-msg-selected-title').textContent = title;
        if ($('#send-msg-selected-vj')) $('#send-msg-selected-vj').textContent = vj || 'Translated';
        if ($('#send-msg-selected-id')) $('#send-msg-selected-id').textContent = id;
        const posterEl = $('#send-msg-selected-poster');
        if (posterEl) {
          if (poster) {
            posterEl.src = poster;
            posterEl.style.display = 'block';
          } else {
            posterEl.style.display = 'none';
          }
        }
        selectedBox.hidden = false;
      }
      if (searchInput) {
        searchInput.value = '';
        searchInput.placeholder = 'Attached: ' + title;
      }

      // Automatically configure response action to Play Movie
      if ($('#send-msg-cta-type')) $('#send-msg-cta-type').value = 'play_movie';
      if ($('#send-msg-cta-text')) $('#send-msg-cta-text').value = 'Watch Now';
      if ($('#send-msg-btn-yes')) $('#send-msg-btn-yes').value = 'Watch Now';

      // Auto update notification title and message if default
      const curTitle = ($('#send-msg-title')?.value || '').trim();
      if (!curTitle || curTitle === 'Avioc Cinema' || curTitle === 'Avioc Cinema New Release') {
        if ($('#send-msg-title')) $('#send-msg-title').value = \`🎬 \${title} (\${vj || 'Avioc Cinema'})\`;
      }
      const curMsg = ($('#send-msg-text')?.value || '').trim();
      if (!curMsg || curMsg.includes('New blockbuster movie added') || curMsg.includes('Now streaming')) {
        if ($('#send-msg-text')) $('#send-msg-text').value = \`🍿 Now streaming: \${title}! Translated by \${vj || 'Avioc Cinema'}. Watch in full HD today.\`;
      }
    }

    function clearSelectedMovie() {
      if ($('#send-msg-movie-id')) $('#send-msg-movie-id').value = '';
      if ($('#send-msg-selected-movie')) $('#send-msg-selected-movie').hidden = true;
      if ($('#send-msg-movie-search')) {
        $('#send-msg-movie-search').value = '';
        $('#send-msg-movie-search').placeholder = '🔍 Search movie title or VJ name (e.g. Dark Wolf, Enola, Junior, Coma)...';
      }
      if ($('#send-msg-movie-dropdown')) $('#send-msg-movie-dropdown').hidden = true;
      if ($('#send-msg-cta-type') && $('#send-msg-cta-type').value === 'play_movie') {
        $('#send-msg-cta-type').value = 'none';
        if ($('#send-msg-cta-text')) $('#send-msg-cta-text').value = 'Proceed';
        if ($('#send-msg-btn-yes')) $('#send-msg-btn-yes').value = 'Proceed';
      }
    }`;

if (!adminHtml.includes(targetSelectMovie)) {
  console.error('Error: targetSelectMovie not found');
  process.exit(1);
}
adminHtml = adminHtml.replace(targetSelectMovie, replaceSelectMovie);

// 5. Update contentSectionHtml with search bar and filter
const targetContentSection = `      // Also display movies with fallback to top catalog items if few plays yet
      const movieDisplayList = movies.length ? movies : catalogItems.slice(0, 15).map((m) => ({
        item_id: m.id,
        title: m.title,
        item_type: m.type,
        vj: m.vj,
        count: 0,
        watch_seconds: 0
      }));

      return \`
        <div class="grid-2">
          <section class="panel">
            <div class="panel-head">
              <div>
                <h2>🎬 Most Watched Movies &amp; Series (\${fmtNum(movies.length)} Watched · \${fmtNum(catalogItems.length)} in Catalog)</h2>
                <small>Ranked by total plays and total time streamed</small>
              </div>
            </div>
            <div class="table-wrap">`;

const replaceContentSection = `      // Merge play metrics with all catalog items for complete searchability
      const playStatById = new Map(movies.map((m) => [m.item_id, m]));
      const allCatalogList = catalogItems.map((m) => {
        const stat = playStatById.get(m.id);
        return {
          item_id: m.id,
          title: m.title,
          item_type: m.type,
          vj: m.vj,
          count: stat?.count || 0,
          watch_seconds: stat?.watch_seconds || 0
        };
      });

      const q = (contentCatalogQuery || '').trim().toLowerCase();
      const tokens = q ? q.split(/\\s+/).filter(Boolean) : [];
      const filteredMovies = tokens.length
        ? allCatalogList.filter((m) => {
            const text = \`\${m.title} \${m.vj} \${m.item_id} \${m.item_type}\`.toLowerCase();
            return tokens.every((tok) => text.includes(tok));
          })
        : allCatalogList.sort((a, b) => (b.count - a.count) || (b.watch_seconds - a.watch_seconds));

      return \`
        <div class="grid-2">
          <section class="panel">
            <div class="panel-head">
              <div>
                <h2>🎬 Movies &amp; Series Catalog (\${fmtNum(filteredMovies.length)} / \${fmtNum(catalogItems.length)} Titles)</h2>
                <small>Instant search, direct stream link, and 1-tap WhatsApp share for every title in our app</small>
              </div>
            </div>
            <div class="toolbar" style="padding:10px 14px;background:rgba(255,255,255,0.03);border-bottom:1px solid var(--line);display:flex;gap:10px;align-items:center;flex-wrap:wrap">
              <input type="search" class="search-in" id="content-catalog-search-in" value="\${esc(contentCatalogQuery)}" placeholder="🔍 Search any movie, series, or VJ in catalog (e.g. Dark Wolf, Junior, Enola, Ulio, Hope, Four)..." style="flex:1;min-width:240px;padding:9px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--ink);font-size:0.88rem">
              \${contentCatalogQuery ? \`<button type="button" class="btn sm" onclick="contentCatalogQuery=''; renderCurrentTab();" style="padding:6px 10px;font-size:12px">✕ Clear</button>\` : ''}
              <span class="pill-filter active" style="margin-left:auto">\${fmtNum(filteredMovies.length)} Showing</span>
            </div>
            <div class="table-wrap" style="max-height:540px;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin">`;

if (!adminHtml.includes(targetContentSection)) {
  console.error('Error: targetContentSection not found');
  process.exit(1);
}
adminHtml = adminHtml.replace(targetContentSection, replaceContentSection);

// Update movieDisplayList.map in contentSectionHtml to filteredMovies.map
const targetDisplayMap = `<tbody>\n                  \${movieDisplayList.map((m, i) => \``;
const replaceDisplayMap = `<tbody>\n                  \${filteredMovies.length ? filteredMovies.map((m, i) => \``;
if (adminHtml.includes(targetDisplayMap)) {
  adminHtml = adminHtml.replace(targetDisplayMap, replaceDisplayMap);
  adminHtml = adminHtml.replace('                  `).join(\'\')}\n                </tbody>', '                  `).join(\'\') : `<tr><td colspan="7" class="empty-row">No movies match "\${esc(contentCatalogQuery)}". Try another title or VJ name.</td></tr>`}\n                </tbody>');
}

// 6. Update message scroll display in requestsSectionHtml
const targetAdminMsgCell = `                        <td>
                          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
                            <b style="color:var(--gold);font-size:0.86rem">\${esc(m.title || 'Avioc Cinema')}</b>
                            \${ctaBadge}
                          </div>
                          <div style="font-size:0.92rem;color:var(--ink)">\${esc(m.message || '')}</div>
                        </td>`;

const replaceAdminMsgCell = `                        <td style="max-width:320px">
                          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
                            <b style="color:var(--gold);font-size:0.86rem">\${esc(m.title || 'Avioc Cinema')}</b>
                            \${ctaBadge}
                          </div>
                          <div class="msg-scroll-box" style="font-size:0.92rem;color:var(--ink);white-space:pre-wrap;word-break:break-word;padding-right:4px">
                            \${esc(m.message || '')}
                          </div>
                        </td>`;

if (adminHtml.includes(targetAdminMsgCell)) {
  adminHtml = adminHtml.replace(targetAdminMsgCell, replaceAdminMsgCell);
}

// Update user requests text cell
const targetUserReqCell = `                        <td><b>\${esc(r.text || '')}</b></td>`;
const replaceUserReqCell = `                        <td style="max-width:320px">
                          <div class="msg-scroll-box" style="word-break:break-word;white-space:pre-wrap;padding-right:4px">
                            <b>\${esc(r.text || '')}</b>
                          </div>
                        </td>`;
if (adminHtml.includes(targetUserReqCell)) {
  adminHtml = adminHtml.replace(targetUserReqCell, replaceUserReqCell);
}

// 7. Update event listeners in admin/index.html
const targetInputListener = `      } else if (ev.target.id === 'share-catalog-search-in') {
        shareCatalogQuery = ev.target.value;
        renderCurrentTab();
      } else if (ev.target.id === 'admin-search-stream-in') {`;

const replaceInputListener = `      } else if (ev.target.id === 'share-catalog-search-in') {
        shareCatalogQuery = ev.target.value;
        renderCurrentTab();
      } else if (ev.target.id === 'content-catalog-search-in') {
        contentCatalogQuery = ev.target.value;
        renderCurrentTab();
      } else if (ev.target.id === 'admin-search-stream-in') {`;

if (!adminHtml.includes(targetInputListener)) {
  console.error('Error: targetInputListener not found');
  process.exit(1);
}
adminHtml = adminHtml.replace(targetInputListener, replaceInputListener);

// Update movie search input listeners
const targetMovieSearchListeners = `    $('#send-msg-movie-search')?.addEventListener('input', (ev) => {
      const q = ev.target.value;
      if (!q || !q.trim()) {
        const dropdown = $('#send-msg-movie-dropdown');
        if (dropdown) dropdown.hidden = true;
        return;
      }
      const matches = searchMovies(q);
      renderMovieDropdown(matches);
    });

    $('#send-msg-movie-search')?.addEventListener('focus', (ev) => {
      const q = ev.target.value;
      if (q && q.trim()) {
        const matches = searchMovies(q);
        renderMovieDropdown(matches);
      }
    });`;

const replaceMovieSearchListeners = `    $('#send-msg-movie-search')?.addEventListener('input', (ev) => {
      const q = ev.target.value;
      const matches = searchMovies(q);
      renderMovieDropdown(matches, !q.trim());
    });

    $('#send-msg-movie-search')?.addEventListener('focus', (ev) => {
      const q = ev.target.value;
      const matches = searchMovies(q);
      renderMovieDropdown(matches, !q.trim());
    });

    $('#send-msg-clear-movie')?.addEventListener('click', (ev) => {
      ev.preventDefault();
      clearSelectedMovie();
    });

    document.addEventListener('click', (ev) => {
      if (!ev.target.closest('#send-msg-movie-group')) {
        const dropdown = $('#send-msg-movie-dropdown');
        if (dropdown) dropdown.hidden = true;
      }
    });`;

if (!adminHtml.includes(targetMovieSearchListeners)) {
  console.error('Error: targetMovieSearchListeners not found');
  process.exit(1);
}
adminHtml = adminHtml.replace(targetMovieSearchListeners, replaceMovieSearchListeners);

// Update send-msg-cta-type change listener to focus movie search and show suggestions
const targetCtaTypeChange = `      if (movieGroup) {
        movieGroup.hidden = (val !== 'play_movie');
        if (val === 'play_movie') {
          setTimeout(() => $('#send-msg-movie-search')?.focus(), 50);
        }
      }`;

const replaceCtaTypeChange = `      if (movieGroup) {
        if (val === 'play_movie') {
          setTimeout(() => {
            const sIn = $('#send-msg-movie-search');
            if (sIn) {
              sIn.focus();
              const matches = searchMovies(sIn.value);
              renderMovieDropdown(matches, !sIn.value.trim());
            }
          }, 50);
        }
      }`;

if (!adminHtml.includes(targetCtaTypeChange)) {
  console.error('Error: targetCtaTypeChange not found');
  process.exit(1);
}
adminHtml = adminHtml.replace(targetCtaTypeChange, replaceCtaTypeChange);

fs.writeFileSync(adminHtmlPath, adminHtml, 'utf8');
console.log('SUCCESS: Patched admin/index.html with inline catalog, smart search, and scrollable modal/message containers!');
