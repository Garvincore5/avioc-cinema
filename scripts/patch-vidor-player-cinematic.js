/**
 * patch-vidor-player-cinematic.js
 * Redesigns Vidor player to match the main Avioc Cinema player style:
 *  - Cinematic seek bar above bottom control bar
 *  - Bottom bar: Prev | Play/Pause | Next | Vol | Time | spacer | DataSaver | Speed | Aspect | PiP | FS | Close
 *  - Center tap-to-play/pause animated circle
 *  - Seek and volume work for <video>; YouTube iframe gets postMessage seek
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(FILE, 'utf8');

// ─── 1. REPLACE CSS ──────────────────────────────────────────────────────────

const OLD_FOOTER_CSS = `/* Floating Unobtrusive Footer Controls */
.dl-player-ftr-smart{
  position:absolute;
  bottom:0;
  left:0;
  right:0;
  z-index:28;
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:16px max(20px,env(safe-area-inset-right,0px)) calc(16px + env(safe-area-inset-bottom,0px)) max(20px,env(safe-area-inset-left,0px));
  background:transparent;
  pointer-events:none;
  transition:opacity 0.35s ease,transform 0.35s ease;
}
.dl-player-ftr-smart > *{pointer-events:auto}
.dl-player-playback-nav{display:flex;align-items:center;gap:8px}
.dl-btn-player-nav{
  background:rgba(18,22,36,0.85);
  border:1px solid rgba(255,255,255,0.18);
  color:var(--muted);
  font-family:var(--display);
  font-size:12px;
  font-weight:700;
  padding:7px 16px;
  border-radius:999px;
  cursor:pointer;
  display:inline-flex;
  align-items:center;
  gap:6px;
  transition:all 0.2s ease;
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
  box-shadow:0 4px 16px rgba(0,0,0,0.6);
}
.dl-btn-player-nav:hover:not(:disabled){
  background:rgba(255,255,255,0.2);
  color:#fff;
  border-color:rgba(243,164,59,0.5);
  transform:scale(1.04);
}
.dl-btn-player-nav.active:not(:disabled){
  background:var(--accent);
  border-color:transparent;
  color:#000;
  box-shadow:0 4px 14px rgba(243,164,59,0.4);
}
.dl-btn-player-nav:disabled{opacity:0.35;cursor:not-allowed}`;

const NEW_FOOTER_CSS = `/* ═══════════════════════════════════════════════════════
   VIDOR CINEMA PLAYER — Avioc-style cinematic bottom bar
   ═══════════════════════════════════════════════════════ */

/* Seek/progress bar just above the control bar */
.dl-pbot-wrap{
  position:absolute;
  bottom:0;
  left:0;
  right:0;
  z-index:28;
  pointer-events:none;
  transition:opacity 0.35s ease,transform 0.35s ease;
  background:linear-gradient(0deg,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.55) 70%,transparent 100%);
}
.dl-pbot-wrap > *{pointer-events:auto}

/* Seek bar row */
.dl-pseek-row{
  display:flex;
  align-items:center;
  padding:0 14px;
  gap:10px;
}
.dl-pseek{
  flex:1;
  -webkit-appearance:none;
  appearance:none;
  height:4px;
  border-radius:4px;
  background:rgba(255,255,255,0.25);
  outline:none;
  cursor:pointer;
  accent-color:var(--accent);
  transition:height 0.15s ease;
}
.dl-pseek:hover{height:6px}
.dl-pseek::-webkit-slider-thumb{
  -webkit-appearance:none;
  width:14px;height:14px;
  border-radius:50%;
  background:var(--accent);
  cursor:pointer;
  box-shadow:0 0 6px rgba(243,164,59,0.8);
}
.dl-pseek::-moz-range-thumb{
  width:14px;height:14px;
  border-radius:50%;
  background:var(--accent);
  border:none;
  cursor:pointer;
}
.dl-ptime-mini{
  font-size:11px;
  font-weight:700;
  color:rgba(255,255,255,0.75);
  white-space:nowrap;
  letter-spacing:0.3px;
  min-width:88px;
  text-align:right;
}

/* Control bar row */
.dl-pbot{
  display:flex;
  align-items:center;
  gap:4px;
  padding:8px 12px calc(8px + env(safe-area-inset-bottom,0px));
}
.dl-pbot-spacer{flex:1}

/* Cinematic icon buttons inside bar */
.dl-pbtn{
  background:none;
  border:none;
  color:#fff;
  width:36px;
  height:36px;
  border-radius:8px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  font-size:17px;
  line-height:1;
  opacity:0.85;
  transition:all 0.15s ease;
  flex:none;
}
.dl-pbtn:hover{opacity:1;background:rgba(255,255,255,0.1);transform:scale(1.1)}
.dl-pbtn:disabled{opacity:0.3;cursor:not-allowed}

/* Big central play/pause button */
.dl-pbtn-center{
  width:42px;
  height:42px;
  border-radius:50%;
  background:rgba(243,164,59,0.18);
  border:1.5px solid rgba(243,164,59,0.55);
  font-size:20px;
  opacity:1;
}
.dl-pbtn-center:hover{background:rgba(243,164,59,0.32);border-color:var(--accent)}

/* Volume slider */
.dl-pvol{
  -webkit-appearance:none;
  appearance:none;
  width:70px;
  height:3px;
  border-radius:3px;
  background:rgba(255,255,255,0.3);
  outline:none;
  cursor:pointer;
  accent-color:var(--accent);
  flex:none;
}
.dl-pvol::-webkit-slider-thumb{
  -webkit-appearance:none;
  width:12px;height:12px;
  border-radius:50%;
  background:#fff;
  cursor:pointer;
}
@media(max-width:480px){.dl-pvol{width:48px}}

/* Time display */
.dl-ptime{
  font-size:11.5px;
  font-weight:700;
  color:rgba(255,255,255,0.8);
  white-space:nowrap;
  letter-spacing:0.2px;
  margin:0 4px;
  min-width:78px;
}

/* Speed selector */
.dl-pspeed{
  background:rgba(255,255,255,0.08);
  border:1px solid rgba(255,255,255,0.15);
  color:#fff;
  font-size:11px;
  font-weight:700;
  padding:4px 6px;
  border-radius:7px;
  cursor:pointer;
  appearance:none;
  -webkit-appearance:none;
  outline:none;
  min-width:62px;
}
.dl-pspeed option{background:#0d0f1a;color:#fff}
@media(max-width:480px){.dl-pspeed{display:none}}

/* Data saver pill */
.dl-pds-btn{
  font-size:10px;
  font-weight:800;
  padding:4px 8px;
  border-radius:10px;
  border:1px solid rgba(255,255,255,0.18);
  background:rgba(255,255,255,0.08);
  color:var(--muted);
  cursor:pointer;
  white-space:nowrap;
  transition:all 0.2s ease;
  letter-spacing:0.3px;
}
.dl-pds-btn.on{background:rgba(0,196,113,0.18);border-color:rgba(0,196,113,0.5);color:#00c471}
.dl-pds-btn:hover{background:rgba(255,255,255,0.15);color:#fff}
@media(max-width:480px){.dl-pds-btn{display:none}}

/* Center tap animation circle */
.dl-center-pip{
  position:absolute;
  top:50%;
  left:50%;
  transform:translate(-50%,-50%) scale(0.6);
  width:64px;
  height:64px;
  border-radius:50%;
  background:rgba(0,0,0,0.55);
  border:2px solid rgba(255,255,255,0.5);
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:28px;
  pointer-events:none;
  opacity:0;
  transition:opacity 0.2s ease,transform 0.2s ease;
  z-index:25;
}
.dl-center-pip.flash{opacity:1;transform:translate(-50%,-50%) scale(1)}

/* Old classes kept for compat */
.dl-player-playback-nav{display:flex;align-items:center;gap:6px}
.dl-btn-player-nav{
  background:rgba(18,22,36,0.85);
  border:1px solid rgba(255,255,255,0.18);
  color:var(--muted);
  font-family:var(--display);
  font-size:12px;
  font-weight:700;
  padding:7px 16px;
  border-radius:999px;
  cursor:pointer;
  display:none;
  align-items:center;
  gap:6px;
  transition:all 0.2s ease;
}
.dl-btn-player-nav:disabled{opacity:0.35;cursor:not-allowed}`;

if (!html.includes(OLD_FOOTER_CSS)) {
  console.error('❌ Could not find old footer CSS block. Check for whitespace differences.');
  process.exit(1);
}
html = html.replace(OLD_FOOTER_CSS, NEW_FOOTER_CSS);
console.log('✅ CSS replaced');

// ─── 2. UPDATE IDLE RULES to reference .dl-pbot-wrap ─────────────────────────

const OLD_IDLE = `.dl-player-overlay.idle .dl-player-ftr-smart{opacity:0;pointer-events:none;transform:translateY(8px)}
.dl-player-overlay.idle .dl-pdock{opacity:0;pointer-events:none;transform:translateY(8px)}
.dl-player-overlay .dl-pdock:hover,
.dl-player-overlay .dl-player-ftr-smart:hover{opacity:1 !important;pointer-events:auto !important;transform:translateY(0) !important}`;

const NEW_IDLE = `.dl-player-overlay.idle .dl-player-ftr-smart{opacity:0;pointer-events:none;transform:translateY(8px)}
.dl-player-overlay.idle .dl-pbot-wrap{opacity:0;pointer-events:none;transform:translateY(8px)}
.dl-player-overlay.idle .dl-pdock{opacity:0;pointer-events:none;transform:translateY(8px)}
.dl-player-overlay .dl-pdock:hover,
.dl-player-overlay .dl-pbot-wrap:hover,
.dl-player-overlay .dl-player-ftr-smart:hover{opacity:1 !important;pointer-events:auto !important;transform:translateY(0) !important}`;

html = html.replace(OLD_IDLE, NEW_IDLE);
console.log('✅ Idle CSS updated');

// Also adjust dock bottom offset so it sits above our new taller bar (~90px)
html = html.replace(
  'bottom:calc(74px + env(safe-area-inset-bottom,0px));',
  'bottom:calc(96px + env(safe-area-inset-bottom,0px));'
);
console.log('✅ Dock bottom offset adjusted');

// ─── 3. REPLACE PLAYER FOOTER HTML ───────────────────────────────────────────

const OLD_FOOTER_HTML = `        <!-- SMART PLAYER FOOTER WITH PREV/NEXT CONTROLS -->
        <div class="dl-player-footer dl-player-ftr-smart">
          <div class="dl-player-playback-nav">
            <button id="dl-btn-player-prev" class="dl-btn-player-nav" title="Previous Video (B)" type="button" \${hasPrev?'':'disabled'} onclick="playDownloaderPrev()">
              <span>⏮️</span> Prev
            </button>
            <button id="dl-btn-player-playpause" class="dl-btn-player-nav active" title="Play / Pause (Space)" type="button" onclick="toggleDownloaderPlayPause()">
              <span id="dl-playpause-icon">⏸️</span> <span id="dl-playpause-label">Pause</span>
            </button>
            <button id="dl-btn-player-next" class="dl-btn-player-nav \${hasNext?'active':''}" title="Next Video (N)" type="button" onclick="playDownloaderNext()">
              Next <span>⏭️</span>
            </button>
          </div>
        </div>`;

const NEW_FOOTER_HTML = `        <!-- CENTER TAP CIRCLE (flash on tap) -->
        <div class="dl-center-pip" id="dl-center-pip"><span id="dl-center-pip-icon">⏸</span></div>

        <!-- CINEMATIC BOTTOM BAR (Avioc Cinema Style) -->
        <div class="dl-pbot-wrap" id="dl-pbot-wrap">

          <!-- Seek / Progress bar -->
          <div class="dl-pseek-row">
            <input type="range" class="dl-pseek" id="dl-pseek" min="0" max="1000" value="0"
              oninput="dlSeekInput(this.value)"
              onchange="dlSeekCommit(this.value)"
              title="Seek" />
            <span class="dl-ptime-mini" id="dl-ptime-mini">0:00 / 0:00</span>
          </div>

          <!-- Control bar -->
          <div class="dl-pbot">

            <!-- Prev -->
            <button id="dl-btn-player-prev" class="dl-pbtn" title="Previous (B)" type="button" \${hasPrev?'':'disabled'} onclick="playDownloaderPrev()">⏮</button>

            <!-- Play / Pause -->
            <button id="dl-btn-player-playpause" class="dl-pbtn dl-pbtn-center" title="Play / Pause (Space)" type="button" onclick="toggleDownloaderPlayPause()">
              <span id="dl-playpause-icon">⏸</span>
            </button>

            <!-- Next -->
            <button id="dl-btn-player-next" class="dl-pbtn" title="Next (N)" type="button" onclick="playDownloaderNext()">⏭</button>

            <!-- Volume icon + slider -->
            <button class="dl-pbtn" id="dl-vol-btn" title="Mute / Unmute (M)" type="button" onclick="dlToggleMute()" style="font-size:15px">🔊</button>
            <input type="range" class="dl-pvol" id="dl-pvol" min="0" max="100" value="100"
              oninput="dlSetVolume(this.value)"
              title="Volume" />

            <!-- Time display -->
            <span class="dl-ptime" id="dl-ptime">0:00 / 0:00</span>

            <div class="dl-pbot-spacer"></div>

            <!-- Data Saver toggle -->
            <button class="dl-pds-btn" id="dl-pds-btn" type="button" title="Data Saver" onclick="dlToggleDataSaver()">Data Saver</button>

            <!-- Speed selector -->
            <select class="dl-pspeed" id="dl-pspeed" title="Playback Speed" onchange="dlSetSpeed(this.value)">
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1" selected>1.0x Normal</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2.0x</option>
            </select>

            <!-- Aspect ratio -->
            <button id="dl-btn-aspect" class="dl-pbtn" title="Aspect Ratio" type="button" onclick="cycleDownloaderAspect()" style="font-size:15px">
              <span id="dl-aspect-mode-icon">📺</span>
            </button>

            <!-- PiP -->
            <button id="dl-btn-pip" class="dl-pbtn" title="Picture-in-Picture" type="button" onclick="toggleDownloaderPiP()" style="font-size:14px">🪟</button>

            <!-- Fullscreen -->
            <button id="dl-btn-fullscreen" class="dl-pbtn" title="Fullscreen (F)" type="button" onclick="toggleDownloaderFullscreen()">
              <span id="dl-fs-icon">⛶</span>
            </button>

            <!-- Download -->
            <button class="dl-pbtn" title="Download" type="button" onclick="inspectAndOpenQuality('\${esc(rawUrl)}')" style="font-size:14px">⚡</button>

            <!-- Close -->
            <button class="dl-pbtn close-x" id="dl-btn-close-player-modal" title="Close (Esc)" type="button" onclick="closeDownloaderPlayer()" style="font-size:16px">✕</button>
          </div>
        </div>`;

// Also remove the old aspect/pip/fullscreen buttons from header since they're now in the bar
// We'll leave the header buttons in place and just hide them via CSS to avoid breaking JS
if (!html.includes(OLD_FOOTER_HTML)) {
  console.error('❌ Could not find old footer HTML. Check template string whitespace.');
  process.exit(1);
}
html = html.replace(OLD_FOOTER_HTML, NEW_FOOTER_HTML);
console.log('✅ Footer HTML replaced');

// Move close button from header to bottom bar — hide old close-x in header only
// The new close-x is in the bottom bar. We can hide aspect/pip/fullscreen in header since they're now in bar:
const OLD_HDR_BTNS = `            <!-- Aspect Ratio Switch (16:9 / 9:16 Shorts / Fill) -->
            <button id="dl-btn-aspect" class="dl-btn-tool" title="Aspect Ratio (Fit / Shorts 9:16)" type="button" onclick="cycleDownloaderAspect()">
              <span id="dl-aspect-mode-icon">📺</span>
            </button>

            <!-- Picture-in-Picture Floating Mini Player -->
            <button id="dl-btn-pip" class="dl-btn-tool" title="Picture-in-Picture (PiP)" type="button" onclick="toggleDownloaderPiP()">
              <span>🪟</span>
            </button>

            <!-- Fullscreen Expand -->
            <button id="dl-btn-fullscreen" class="dl-btn-tool" title="Toggle Fullscreen (F)" type="button" onclick="toggleDownloaderFullscreen()">
              <span id="dl-fs-icon">⛶</span>
            </button>

            <!-- Direct Download Action -->
            <button class="dl-btn-submit" style="padding:6px 14px;font-size:12px" title="Download this video" type="button" onclick="inspectAndOpenQuality('${esc(rawUrl)}')">
              <span>⚡</span> Download
            </button>
            
            <button class="close-x" id="dl-btn-close-player-modal" title="Close Cinema Player (Esc)" type="button" onclick="closeDownloaderPlayer()">✕</button>`;

// We'll keep the header but remove the duplicate controls from it, leave only title+badges+autoplay
const NEW_HDR_BTNS = `            <!-- Auto-Next in header; aspect/PiP/FS/close moved to bottom bar -->`;

// Note: The header replace is risky with template literals. Let's do it differently - just hide via CSS
// Add CSS to hide header tool buttons since they're in bottom bar now
html = html.replace(
  '.dl-btn-tool:hover{\n  background:rgba(243,164,59,0.2);\n  border-color:var(--accent);\n  transform:scale(1.08);\n}',
  `.dl-btn-tool:hover{
  background:rgba(243,164,59,0.2);
  border-color:var(--accent);
  transform:scale(1.08);
}
/* Hide header tool buttons that moved to bottom bar */
#dl-btn-aspect,#dl-btn-pip,#dl-btn-fullscreen,
.dl-player-hdr-smart .dl-btn-submit,
.dl-player-hdr-smart .close-x{display:none !important}`
);

// ─── 4. ADD NEW JS FUNCTIONS ─────────────────────────────────────────────────

const OLD_SETUP_FN = `function setupDownloaderPlayerEvents(){
  const wrap = document.getElementById('dl-player-wrap');
  if (!wrap) return;

  const updateFsIcon = () => {
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    const icon = document.getElementById('dl-fs-icon');
    if (icon) icon.textContent = isFs ? '🗖' : '⛶';
  };
  document.addEventListener('fullscreenchange', updateFsIcon);
  document.addEventListener('webkitfullscreenchange', updateFsIcon);

  // Native media ended listener
  const vEl = document.getElementById('dl-cinema-video-element');
  if (vEl) {
    vEl.addEventListener('ended', () => {
      triggerDownloaderUpNext();
    });
  }
  const aEl = document.getElementById('dl-cinema-audio-element');
  if (aEl) {
    aEl.addEventListener('ended', () => {
      triggerDownloaderUpNext();
    });
  }

  let lastWake = 0;
  const wake = () => {
    if (!dlPlayerState.isOpen) return;
    const now = Date.now();
    if (now - lastWake < 400) return;
    lastWake = now;
    clearTimeout(dlPlayerState.idleTimer);
    wrap.classList.remove('idle');
    dlPlayerState.idleTimer = setTimeout(() => {
      if (dlPlayerState.isOpen) wrap.classList.add('idle');
    }, 5000);
  };
  dlPlayerState.wakePlayer = wake;

  ['pointerdown', 'touchstart', 'click', 'keydown'].forEach(evt => {
    wrap.addEventListener(evt, wake, { passive: true });
  });

  let mouseThrottle = null;
  wrap.addEventListener('mousemove', () => {
    if (mouseThrottle) return;
    mouseThrottle = setTimeout(() => {
      mouseThrottle = null;
      wake();
    }, 500);
  }, { passive: true });

  wake();
}`;

const NEW_SETUP_FN = `/* ─── Vidor player helpers ──────────────────────────────────────── */

function dlFmtTime(s){
  if(!isFinite(s)||s<0)s=0;
  s=Math.floor(s);
  const h=Math.floor(s/3600);
  const m=Math.floor((s%3600)/60);
  const sec=s%60;
  if(h>0)return h+':'+(m<10?'0':'')+m+':'+(sec<10?'0':'')+sec;
  return m+':'+(sec<10?'0':'')+sec;
}

function dlUpdateSeekUI(cur,dur){
  const seek=document.getElementById('dl-pseek');
  const t=document.getElementById('dl-ptime');
  const tm=document.getElementById('dl-ptime-mini');
  const fmtC=dlFmtTime(cur), fmtD=dlFmtTime(dur);
  if(seek&&dur>0){seek.value=Math.round((cur/dur)*1000);}
  if(t)t.textContent=fmtC+' / '+fmtD;
  if(tm)tm.textContent=fmtC+' / '+fmtD;
}

function dlSeekInput(val){
  // Live drag — update time display only
  const v=document.getElementById('dl-cinema-video-element');
  const dur=v?v.duration:0;
  if(dur>0){
    const t=document.getElementById('dl-ptime');
    const tm=document.getElementById('dl-ptime-mini');
    const sec=(val/1000)*dur;
    const fmt=dlFmtTime(sec)+' / '+dlFmtTime(dur);
    if(t)t.textContent=fmt;
    if(tm)tm.textContent=fmt;
  }
}

function dlSeekCommit(val){
  const v=document.getElementById('dl-cinema-video-element');
  if(v&&isFinite(v.duration)){
    v.currentTime=(val/1000)*v.duration;
    return;
  }
  // YouTube iframe seek via postMessage
  const iframe=document.getElementById('dl-cinema-iframe-element');
  if(iframe&&iframe.contentWindow&&dlPlayerState._ytDuration>0){
    const sec=(val/1000)*dlPlayerState._ytDuration;
    iframe.contentWindow.postMessage(JSON.stringify({event:'command',func:'seekTo',args:[sec,true]}),'*');
    dlUpdateSeekUI(sec,dlPlayerState._ytDuration);
  }
}

function dlSetVolume(val){
  const v=document.getElementById('dl-cinema-video-element');
  const a=document.getElementById('dl-cinema-audio-element');
  const vol=val/100;
  if(v){v.volume=vol;v.muted=vol===0;}
  if(a){a.volume=vol;a.muted=vol===0;}
  const btn=document.getElementById('dl-vol-btn');
  if(btn)btn.textContent=vol===0?'🔇':(vol<0.5?'🔉':'🔊');
  // YouTube volume via postMessage
  const iframe=document.getElementById('dl-cinema-iframe-element');
  if(iframe&&iframe.contentWindow){
    iframe.contentWindow.postMessage(JSON.stringify({event:'command',func:'setVolume',args:[val]}),'*');
  }
}

function dlToggleMute(){
  const v=document.getElementById('dl-cinema-video-element');
  const a=document.getElementById('dl-cinema-audio-element');
  const volSlider=document.getElementById('dl-pvol');
  if(v){
    v.muted=!v.muted;
    const btn=document.getElementById('dl-vol-btn');
    if(btn)btn.textContent=v.muted?'🔇':'🔊';
    if(volSlider)volSlider.value=v.muted?0:Math.round(v.volume*100);
    return;
  }
  if(a){
    a.muted=!a.muted;
    const btn=document.getElementById('dl-vol-btn');
    if(btn)btn.textContent=a.muted?'🔇':'🔊';
    return;
  }
  const iframe=document.getElementById('dl-cinema-iframe-element');
  if(iframe&&iframe.contentWindow){
    dlPlayerState._ytMuted=!dlPlayerState._ytMuted;
    iframe.contentWindow.postMessage(JSON.stringify({event:'command',func:dlPlayerState._ytMuted?'mute':'unMute'}),'*');
    const btn=document.getElementById('dl-vol-btn');
    if(btn)btn.textContent=dlPlayerState._ytMuted?'🔇':'🔊';
  }
}

function dlSetSpeed(val){
  const v=document.getElementById('dl-cinema-video-element');
  const a=document.getElementById('dl-cinema-audio-element');
  const spd=parseFloat(val)||1;
  if(v)v.playbackRate=spd;
  if(a)a.playbackRate=spd;
  // YouTube doesn't support speed via postMessage in IFrame API easily
  toast('Speed: '+spd+'x');
}

let _dlDataSaver=false;
function dlToggleDataSaver(){
  _dlDataSaver=!_dlDataSaver;
  const btn=document.getElementById('dl-pds-btn');
  if(btn){btn.textContent=_dlDataSaver?'Data Saver ON':'Data Saver';btn.classList.toggle('on',_dlDataSaver);}
  toast(_dlDataSaver?'Data Saver ON — lower quality preferred':'Data Saver OFF');
}

function dlFlashCenter(icon){
  const el=document.getElementById('dl-center-pip');
  const ic=document.getElementById('dl-center-pip-icon');
  if(!el)return;
  if(ic)ic.textContent=icon||'⏸';
  el.classList.add('flash');
  clearTimeout(dlPlayerState._centerTimer);
  dlPlayerState._centerTimer=setTimeout(()=>el.classList.remove('flash'),600);
}

function setupDownloaderPlayerEvents(){
  const wrap = document.getElementById('dl-player-wrap');
  if (!wrap) return;

  const updateFsIcon = () => {
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    const icon = document.getElementById('dl-fs-icon');
    if (icon) icon.textContent = isFs ? '🗖' : '⛶';
  };
  document.addEventListener('fullscreenchange', updateFsIcon);
  document.addEventListener('webkitfullscreenchange', updateFsIcon);

  // Native video/audio events
  const vEl = document.getElementById('dl-cinema-video-element');
  if (vEl) {
    vEl.addEventListener('ended', () => triggerDownloaderUpNext());
    vEl.addEventListener('timeupdate', () => dlUpdateSeekUI(vEl.currentTime, vEl.duration||0));
    vEl.addEventListener('loadedmetadata', () => dlUpdateSeekUI(0, vEl.duration||0));
    vEl.addEventListener('volumechange', () => {
      const slider=document.getElementById('dl-pvol');
      const btn=document.getElementById('dl-vol-btn');
      if(slider)slider.value=vEl.muted?0:Math.round(vEl.volume*100);
      if(btn)btn.textContent=vEl.muted?'🔇':(vEl.volume<0.5?'🔉':'🔊');
    });
  }
  const aEl = document.getElementById('dl-cinema-audio-element');
  if (aEl) {
    aEl.addEventListener('ended', () => triggerDownloaderUpNext());
  }

  // YouTube time polling (every 500ms via postMessage getCurrentTime)
  const iframeEl = document.getElementById('dl-cinema-iframe-element');
  if (iframeEl && iframeEl.contentWindow) {
    dlPlayerState._ytPollTimer = setInterval(() => {
      if (!dlPlayerState.isOpen) { clearInterval(dlPlayerState._ytPollTimer); return; }
      try {
        iframeEl.contentWindow.postMessage(JSON.stringify({event:'listening'}),'*');
        iframeEl.contentWindow.postMessage(JSON.stringify({event:'infoDelivery',func:'getDuration'}),'*');
      } catch(_){}
    }, 1000);
  }

  let lastWake = 0;
  const wake = () => {
    if (!dlPlayerState.isOpen) return;
    const now = Date.now();
    if (now - lastWake < 400) return;
    lastWake = now;
    clearTimeout(dlPlayerState.idleTimer);
    wrap.classList.remove('idle');
    dlPlayerState.idleTimer = setTimeout(() => {
      if (dlPlayerState.isOpen) wrap.classList.add('idle');
    }, 5000);
  };
  dlPlayerState.wakePlayer = wake;

  ['pointerdown', 'touchstart', 'click', 'keydown'].forEach(evt => {
    wrap.addEventListener(evt, wake, { passive: true });
  });

  let mouseThrottle = null;
  wrap.addEventListener('mousemove', () => {
    if (mouseThrottle) return;
    mouseThrottle = setTimeout(() => {
      mouseThrottle = null;
      wake();
    }, 500);
  }, { passive: true });

  wake();
}`;

if (!html.includes(OLD_SETUP_FN)) {
  console.error('❌ Could not find setupDownloaderPlayerEvents. Check source.');
  process.exit(1);
}
html = html.replace(OLD_SETUP_FN, NEW_SETUP_FN);
console.log('✅ setupDownloaderPlayerEvents replaced with full cinematic controls logic');

// ─── 5. PATCH toggleDownloaderPlayPause to flash center circle ───────────────
const OLD_PP = `function toggleDownloaderPlayPause(){
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
}`;

const NEW_PP = `function toggleDownloaderPlayPause(){
  const v = document.getElementById('dl-cinema-video-element');
  const a = document.getElementById('dl-cinema-audio-element');
  const iframe = document.getElementById('dl-cinema-iframe-element');
  const icon = document.getElementById('dl-playpause-icon');

  if (v) {
    if (v.paused) {
      v.play().catch(() => {});
      if (icon) icon.textContent = '⏸';
      dlFlashCenter('⏸');
    } else {
      v.pause();
      if (icon) icon.textContent = '▶';
      dlFlashCenter('▶');
    }
    return;
  }
  if (a) {
    if (a.paused) {
      a.play().catch(() => {});
      if (icon) icon.textContent = '⏸';
      dlFlashCenter('⏸');
    } else {
      a.pause();
      if (icon) icon.textContent = '▶';
      dlFlashCenter('▶');
    }
    return;
  }
  if (iframe && iframe.contentWindow) {
    dlPlayerState.isPlaying = !dlPlayerState.isPlaying;
    const cmd = dlPlayerState.isPlaying ? 'playVideo' : 'pauseVideo';
    iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: cmd }), '*');
    if (icon) icon.textContent = dlPlayerState.isPlaying ? '⏸' : '▶';
    dlFlashCenter(dlPlayerState.isPlaying ? '⏸' : '▶');
    if (dlPlayerState.wakePlayer) dlPlayerState.wakePlayer();
  }
}`;

if (!html.includes(OLD_PP)) {
  console.error('❌ Could not find toggleDownloaderPlayPause');
  process.exit(1);
}
html = html.replace(OLD_PP, NEW_PP);
console.log('✅ toggleDownloaderPlayPause updated with center flash');

// ─── 6. PATCH message listener to update seek for YouTube info ────────────────
// Add YouTube currentTime / duration parsing from infoDelivery messages
const OLD_MSG = `      if (st === 1) {
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

const NEW_MSG = `      if (st === 1) {
        dlPlayerState.isPlaying = true;
        const icon = document.getElementById('dl-playpause-icon');
        if (icon) icon.textContent = '⏸';
      } else if (st === 2) {
        dlPlayerState.isPlaying = false;
        const icon = document.getElementById('dl-playpause-icon');
        if (icon) icon.textContent = '▶';
      }
      // Update seek bar from YouTube infoDelivery
      try {
        if (data.info && typeof data.info === 'object') {
          const ct = data.info.currentTime;
          const dur = data.info.duration;
          if (dur > 0) dlPlayerState._ytDuration = dur;
          if (ct !== undefined && dlPlayerState._ytDuration > 0) {
            dlUpdateSeekUI(ct, dlPlayerState._ytDuration);
          }
        }
      } catch(_) {}`;

if (!html.includes(OLD_MSG)) {
  console.error('❌ Could not find message listener block');
  process.exit(1);
}
html = html.replace(OLD_MSG, NEW_MSG);
console.log('✅ Message listener updated for YouTube seek tracking');

// ─── 7. Also remove the `controls` attribute from <video> element (we have custom bar) ───
// The video element has `controls` — remove it since we have a custom bar
html = html.replace(
  `      <video \n        id="dl-cinema-video-element" \n        class="dl-cinema-video"\n        controls \n        playsinline \n        autoplay \n        src="\${esc(directStream)}"\n      ></video>`,
  `      <video \n        id="dl-cinema-video-element" \n        class="dl-cinema-video"\n        playsinline \n        autoplay \n        src="\${esc(directStream)}"\n        style="width:100%;height:100%;object-fit:contain"\n      ></video>`
);
console.log('✅ Removed controls attr from <video> element');

// ─── 8. WRITE FILE ───────────────────────────────────────────────────────────
fs.writeFileSync(FILE, html, 'utf8');
console.log('\n✅ All patches applied! File written.');
console.log('📦 File size:', fs.statSync(FILE).size, 'bytes');
console.log('\nNow run: node scripts/quick-upload-index.js');
