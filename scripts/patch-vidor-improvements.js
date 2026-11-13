const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

console.log('Read index.html, size:', html.length);

// 1. Remove the useless hero card in downloaderView() and add compact Paste Link button to tabs
const oldHeroRegex = /<!-- Clean Hero Card \(uses Avioc Top Search Bar\) -->\s*<div class="dl-hero">[\s\S]*?<\/div>\s*<\/div>\s*<!-- Navigation Tabs -->/i;
if (oldHeroRegex.test(html)) {
  html = html.replace(oldHeroRegex, '<!-- Navigation Tabs -->');
  console.log('1. Successfully removed .dl-hero card from downloaderView().');
} else {
  console.warn('1. oldHeroRegex did not match directly, checking fallback...');
  const heroCardRegex = /<div class="dl-hero">[\s\S]*?<\/div>\s*<\/div>/i;
  if (heroCardRegex.test(html)) {
    html = html.replace(heroCardRegex, '');
    console.log('1. Removed .dl-hero via fallback regex.');
  }
}

// Add Paste Link button to .dl-nav-tabs
const tabsTarget = `<button type="button" class="dl-tab-btn \${dlState.tab==='vault'?'active':''}" data-dl-tab="vault" onclick="switchDownloaderTab('vault')">
        <span>📁</span> Media Vault <span class="count" id="dl-vault-count" style="display:\${dlState.vault.length?'inline-block':'none'}">\${dlState.vault.length}</span>
      </button>`;
const tabsReplace = `<button type="button" class="dl-tab-btn \${dlState.tab==='vault'?'active':''}" data-dl-tab="vault" onclick="switchDownloaderTab('vault')">
        <span>📁</span> Media Vault <span class="count" id="dl-vault-count" style="display:\${dlState.vault.length?'inline-block':'none'}">\${dlState.vault.length}</span>
      </button>
      <button type="button" class="dl-tab-btn dl-tab-paste" onclick="pasteDownloaderClipboard()" title="Paste video link to download">
        <span>📋</span> Paste Link
      </button>`;

if (html.includes(tabsTarget)) {
  html = html.replace(tabsTarget, tabsReplace);
  console.log('2. Added compact Paste Link button to navigation tabs.');
}

// 2. Make small screen video grid show TWO videos per row
const smallScreenOldCss = `@media (max-width:600px){
  .dl-hero{padding:18px 16px}
  .dl-grid{grid-template-columns:1fr}
  .dl-card-actions{grid-template-columns:1fr 1fr}
}`;

const smallScreenNewCss = `@media (max-width:600px){
  .dl-hero{display:none !important}
  .dl-grid{grid-template-columns:repeat(2, 1fr) !important;gap:10px !important}
  .dl-card{border-radius:10px}
  .dl-body{padding:8px 10px;gap:4px}
  .dl-title{font-size:12px;line-height:1.25;-webkit-line-clamp:2}
  .dl-meta{font-size:10px}
  .dl-card-actions{gap:6px;padding:0 8px 10px}
  .dl-btn-action{padding:5px 6px;font-size:11px;border-radius:6px}
  .dl-dur-badge{font-size:9.5px;padding:1px 4px}
  .dl-nav-tabs{overflow-x:auto;padding-bottom:4px;gap:6px}
  .dl-tab-btn{font-size:12px;padding:7px 12px;white-space:nowrap}
}
@media (max-width:380px){
  .dl-grid{grid-template-columns:repeat(2, 1fr) !important;gap:8px !important}
  .dl-card-actions{grid-template-columns:1fr !important;gap:4px}
}`;

if (html.includes(smallScreenOldCss)) {
  html = html.replace(smallScreenOldCss, smallScreenNewCss);
  console.log('3. Replaced 600px media query to display 2-column grid on small screens.');
} else {
  // Regex replacement
  const mediaRegex = /@media\s*\(max-width:\s*600px\)\s*\{\s*\.dl-hero\{[^}]*\}\s*\.dl-grid\{[^}]*\}\s*\.dl-card-actions\{[^}]*\}\s*\}/;
  if (mediaRegex.test(html)) {
    html = html.replace(mediaRegex, smallScreenNewCss);
    console.log('3. Replaced 600px media query via regex.');
  }
}

// 3. Fix YouTube controls & click capturing in player:
// Embed with controls=0, disablekb=1, fs=0, modestbranding=1, iv_load_policy=3
const oldIframeRegex = /src="https:\/\/www\.youtube-nocookie\.com\/embed\/\$\{encodeURIComponent\(vidId\)\}\?autoplay=1[^"]*"/;
const newIframeSrc = `src="https://www.youtube-nocookie.com/embed/\${encodeURIComponent(vidId)}?autoplay=1&controls=0&disablekb=1&enablejsapi=1&fs=0&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&origin=\${encodeURIComponent(location.origin)}"`;

if (oldIframeRegex.test(html)) {
  html = html.replace(oldIframeRegex, newIframeSrc);
  console.log('4. Updated YouTube embed URL to controls=0 (hidden YouTube native controls).');
}

// Add transparent click-shield and custom Play/Pause control
const oldStageContent = `\${stageMediaContent}
        </div>`;
const newStageContent = `\${stageMediaContent}
          <div class="dl-player-click-shield" id="dl-click-shield" onclick="toggleDownloaderPlayPause()" title="Click to Play / Pause"></div>
        </div>`;

if (html.includes(oldStageContent)) {
  html = html.replace(oldStageContent, newStageContent);
  console.log('5. Added dl-player-click-shield over media stage for seamless tap-to-pause.');
}

// Add Play/Pause button in footer
const oldNavRow = `<div class="dl-player-playback-nav">
            <button id="dl-btn-player-prev" class="dl-btn-player-nav" title="Previous Video (B)" type="button" \${hasPrev?'':'disabled'} onclick="playDownloaderPrev()">
              <span>⏮️</span> Prev
            </button>
            <button id="dl-btn-player-next" class="dl-btn-player-nav \${hasNext?'active':''}" title="Next Video (N)" type="button" onclick="playDownloaderNext()">
              Next <span>⏭️</span>
            </button>
          </div>`;

const newNavRow = `<div class="dl-player-playback-nav">
            <button id="dl-btn-player-prev" class="dl-btn-player-nav" title="Previous Video (B)" type="button" \${hasPrev?'':'disabled'} onclick="playDownloaderPrev()">
              <span>⏮️</span> Prev
            </button>
            <button id="dl-btn-player-playpause" class="dl-btn-player-nav active" title="Play / Pause (Space)" type="button" onclick="toggleDownloaderPlayPause()">
              <span id="dl-playpause-icon">⏸️</span> <span id="dl-playpause-label">Pause</span>
            </button>
            <button id="dl-btn-player-next" class="dl-btn-player-nav \${hasNext?'active':''}" title="Next Video (N)" type="button" onclick="playDownloaderNext()">
              Next <span>⏭️</span>
            </button>
          </div>`;

if (html.includes(oldNavRow)) {
  html = html.replace(oldNavRow, newNavRow);
  console.log('6. Added custom Play / Pause button to Vidor player footer.');
}

// CSS for dl-player-click-shield and dl-tab-paste
const extraCss = `
.dl-player-click-shield{position:absolute;inset:0;z-index:6;background:transparent;cursor:pointer}
.dl-tab-paste{background:rgba(243,164,59,0.14);border-color:rgba(243,164,59,0.3);color:var(--accent)}
.dl-tab-paste:hover{background:rgba(243,164,59,0.25);border-color:var(--accent);color:#fff}
`;
html = html.replace('/* Gentle Inactivity Idle Behavior */', extraCss + '\n/* Gentle Inactivity Idle Behavior */');

// Add toggleDownloaderPlayPause implementation if missing
if (!html.includes('function toggleDownloaderPlayPause(')) {
  const togglePlayPauseFunc = `
function toggleDownloaderPlayPause(){
  const v = document.getElementById('dl-cinema-video-element');
  const a = document.getElementById('dl-cinema-audio-element');
  const iframe = document.getElementById('dl-cinema-iframe-element');
  const icon = document.getElementById('dl-playpause-icon');
  const label = document.getElementById('dl-playpause-label');

  if (v) {
    if (v.paused) {
      v.play().catch(() => {});
      if (icon) icon.textContent = '⏸️';
      if (label) label.textContent = 'Pause';
    } else {
      v.pause();
      if (icon) icon.textContent = '▶️';
      if (label) label.textContent = 'Play';
    }
    return;
  }
  if (a) {
    if (a.paused) {
      a.play().catch(() => {});
      if (icon) icon.textContent = '⏸️';
      if (label) label.textContent = 'Pause';
    } else {
      a.pause();
      if (icon) icon.textContent = '▶️';
      if (label) label.textContent = 'Play';
    }
    return;
  }
  if (iframe && iframe.contentWindow) {
    dlPlayerState.isPlaying = !dlPlayerState.isPlaying;
    const cmd = dlPlayerState.isPlaying ? 'playVideo' : 'pauseVideo';
    iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: cmd }), '*');
    if (icon) icon.textContent = dlPlayerState.isPlaying ? '⏸️' : '▶️';
    if (label) label.textContent = dlPlayerState.isPlaying ? 'Pause' : 'Play';
    if (dlPlayerState.wakePlayer) dlPlayerState.wakePlayer();
  }
}
`;
  html = html.replace('function playDownloaderNext(){', togglePlayPauseFunc + '\nfunction playDownloaderNext(){');
  console.log('7. Added toggleDownloaderPlayPause function.');
}

// Update message listener to also handle play/pause sync from YouTube
const oldMsgListenerTarget = `if ((data.event === 'onStateChange' && data.info === 0) || (data.event === 'infoDelivery' && data.info && data.info.playerState === 0)) {
        triggerDownloaderUpNext();
      }`;
const newMsgListenerReplace = `const st = typeof data.info === 'number' ? data.info : (data.info && data.info.playerState);
      if (st === 0) {
        triggerDownloaderUpNext();
      } else if (st === 1) {
        dlPlayerState.isPlaying = true;
        const icon = document.getElementById('dl-playpause-icon');
        const lbl = document.getElementById('dl-playpause-label');
        if (icon) icon.textContent = '⏸️';
        if (lbl) lbl.textContent = 'Pause';
      } else if (st === 2) {
        dlPlayerState.isPlaying = false;
        const icon = document.getElementById('dl-playpause-icon');
        const lbl = document.getElementById('dl-playpause-label');
        if (icon) icon.textContent = '▶️';
        if (lbl) lbl.textContent = 'Play';
      }`;

if (html.includes(oldMsgListenerTarget)) {
  html = html.replace(oldMsgListenerTarget, newMsgListenerReplace);
  console.log('8. Updated message listener to sync YouTube playing/paused states with custom controls.');
}

// Initialize isPlaying in openDownloaderCinemaPlayer
html = html.replace('dlPlayerState.isOpen = true;', 'dlPlayerState.isOpen = true;\n  dlPlayerState.isPlaying = true;');

fs.writeFileSync(indexPath, html, 'utf8');
console.log('ALL DONE! Updated index.html successfully.');
