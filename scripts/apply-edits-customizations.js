const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const editesHtmlPath = path.join(root, 'edites', 'index.html');
let html = fs.readFileSync(editesHtmlPath, 'utf8');

console.log('Original edites/index.html size:', html.length, 'bytes');

// 1. Remove Spark TV from LOCAL_TV
const sparkTvRegex = /\s*\{\s*id:\s*["']spark-tv["'][\s\S]*?live:\s*true\s*\},?/i;
if (sparkTvRegex.test(html)) {
  html = html.replace(sparkTvRegex, '');
  console.log('1. Removed Spark TV from LOCAL_TV.');
} else {
  console.warn('1. Spark TV entry not found in LOCAL_TV.');
}

// 2. Filter accountPlanList to start from 1000 UGX and hide offer plans until admin sends them
const targetLoadPlans = `async function loadAccountPlans(){
  try{
    const [plans,cards]=await Promise.all([accountApi("/api/plans"),accountApi("/api/prices/card")]);
    const normalPlans=(plans.plans||[]).map(p=>({...p,days:p.days||Number(String(p.id).match(/\\d+/)?.[0]||0)}));
    const offerPlans=(plans.offerPlans||[]).map(p=>({...p,days:p.days||Number(String(p.id).match(/\\d+/)?.[0]||0),isOffer:true}));
    accountPlanList=[...offerPlans, ...normalPlans];
    cardPlanList=(cards.plans||[]).map(p=>({...p,days:Number(String(p.id).match(/\\d+/)?.[0]||0)}));
    if(accountMethod==="card"&&!cardPlanList.some(p=>p.id===selectedPlanId))selectedPlanId=cardPlanList[0]?.id||"";
    if(accountMethod==="mobile_money"&&!accountPlanList.some(p=>p.id===selectedPlanId))selectedPlanId=accountPlanList[0]?.id||"";
    if(accountMode==="plans")renderAccountModal();
  }catch(error){if(accountMode==="plans")renderAccountModal(error.message)}
}`;

const replaceLoadPlans = `async function loadAccountPlans(){
  try{
    const [plans,cards]=await Promise.all([accountApi("/api/plans"),accountApi("/api/prices/card")]);
    const normalPlans=(plans.plans||[]).map(p=>({...p,days:p.days||Number(String(p.id).match(/\\d+/)?.[0]||0)}));
    const offerPlans=(plans.offerPlans||[]).map(p=>({...p,days:p.days||Number(String(p.id).match(/\\d+/)?.[0]||0),isOffer:true}));
    // Plans start strictly from UGX 1,000. Offer plans are completely hidden from standard modal until admin sends an offer!
    accountPlanList=normalPlans.filter(p=>!p.isOffer && Number(p.amountUgx)>=1000 && !String(p.id).startsWith('offer'));
    window.availableOfferPlans=offerPlans;
    cardPlanList=(cards.plans||[]).map(p=>({...p,days:Number(String(p.id).match(/\\d+/)?.[0]||0)}));
    if(accountMethod==="card"&&!cardPlanList.some(p=>p.id===selectedPlanId))selectedPlanId=cardPlanList[0]?.id||"";
    if(accountMethod==="mobile_money"&&!accountPlanList.some(p=>p.id===selectedPlanId))selectedPlanId=accountPlanList[0]?.id||"";
    if(accountMode==="plans")renderAccountModal();
  }catch(error){if(accountMode==="plans")renderAccountModal(error.message)}
}`;

if (html.includes(targetLoadPlans)) {
  html = html.replace(targetLoadPlans, replaceLoadPlans);
  console.log('2. Updated loadAccountPlans to strictly start from 1,000 UGX and hide offer plans.');
} else {
  console.warn('2. targetLoadPlans exact match failed, attempting regex...');
  const loadPlansRegex = /async function loadAccountPlans\(\)\{[\s\S]*?accountPlanList=\[\.\.\.offerPlans,\s*\.\.\.normalPlans\];[\s\S]*?if\(accountMode==="plans"\)renderAccountModal\(\);[\s\S]*?catch\(error\)\{if\(accountMode==="plans"\)renderAccountModal\(error\.message\)\}\s*\}/;
  if (loadPlansRegex.test(html)) {
    html = html.replace(loadPlansRegex, replaceLoadPlans.trim());
    console.log('2. Updated loadAccountPlans via regex.');
  } else {
    console.error('2. Failed to match loadAccountPlans.');
  }
}

// 3. Stop automatic 20-second Google enforcement popup in video and TV players
// In movie player watchTimerId:
const targetMovie20s = `      if(!authSession?.user){
        P.unauthedSec=(P.unauthedSec||0)+1;
        const rem=Math.max(0,20-P.unauthedSec);
        const pill=$("#preview-pill");
        if(pill)pill.textContent=\`Preview: \${rem}s left · Sign in with Google\`;
        if(P.unauthedSec>=20){
          video.pause();
          openGoogleEnforcementModal(t?.title||"this title");
          return;
        }
        return;
      }`;

const replaceMovie20s = `      if(!authSession?.user && typeof isGoogleEnforced !== 'undefined' && isGoogleEnforced){
        P.unauthedSec=(P.unauthedSec||0)+1;
        const rem=Math.max(0,20-P.unauthedSec);
        const pill=$("#preview-pill");
        if(pill)pill.textContent=\`Preview: \${rem}s left · Sign in with Google\`;
        if(P.unauthedSec>=20){
          video.pause();
          openGoogleEnforcementModal(t?.title||"this title");
          return;
        }
        return;
      }`;

if (html.includes(targetMovie20s)) {
  html = html.replace(targetMovie20s, replaceMovie20s);
  console.log('3a. Removed unprompted 20s Google popup from movie player (now requires explicit isGoogleEnforced).');
} else {
  console.warn('3a. targetMovie20s exact match failed.');
}

// In TV player tvWatchTimerId:
const targetTv20s = `      if(!authSession?.user){
        P.unauthedSec=(P.unauthedSec||0)+1;
        const rem=Math.max(0,20-P.unauthedSec);
        const pill=$("#preview-pill");
        if(pill)pill.textContent=\`Preview: \${rem}s left · Sign in with Google\`;
        if(P.unauthedSec>=20){
          if(P.video)P.video.pause();
          openGoogleEnforcementModal(channel.name);
          return;
        }
        return;
      }`;

const replaceTv20s = `      if(!authSession?.user && typeof isGoogleEnforced !== 'undefined' && isGoogleEnforced){
        P.unauthedSec=(P.unauthedSec||0)+1;
        const rem=Math.max(0,20-P.unauthedSec);
        const pill=$("#preview-pill");
        if(pill)pill.textContent=\`Preview: \${rem}s left · Sign in with Google\`;
        if(P.unauthedSec>=20){
          if(P.video)P.video.pause();
          openGoogleEnforcementModal(channel.name);
          return;
        }
        return;
      }`;

if (html.includes(targetTv20s)) {
  html = html.replace(targetTv20s, replaceTv20s);
  console.log('3b. Removed unprompted 20s Google popup from TV player.');
} else {
  console.warn('3b. targetTv20s exact match failed.');
}

// 4. Update Install / Open in App Logic
const targetInstallSection = `function isAppAlreadyInstalled() {
  try {
    if (isStandaloneApp()) return true;
    if (localStorage.getItem('avioc_app_installed') === 'true') return true;
    if (localStorage.getItem('avioc_pwa_installed') === 'true') return true;
    if (localStorage.getItem('avioc_tv_installed') === 'true') return true;
    if (localStorage.getItem('avioc_install_dismissed') === 'true') return true;
    if (sessionStorage.getItem('avioc_tv_install_dismissed') === '1') return true;
  } catch {}
  return false;
}

// Check native OS installed apps via getInstalledRelatedApps API
if ('getInstalledRelatedApps' in navigator) {
  navigator.getInstalledRelatedApps().then(apps => {
    if (apps && apps.length > 0) {
      try {
        localStorage.setItem('avioc_app_installed', 'true');
        localStorage.setItem('avioc_pwa_installed', 'true');
        localStorage.setItem('avioc_tv_installed', 'true');
      } catch {}
      const banner = document.getElementById('tv-install-banner');
      if (banner) banner.remove();
    }
  }).catch(() => {});
}

function closeTvInstallBanner() {
  const banner = document.getElementById('tv-install-banner');
  if (banner) {
    banner.remove();
    try {
      sessionStorage.setItem('avioc_tv_install_dismissed', '1');
      localStorage.setItem('avioc_install_dismissed', 'true');
    } catch {}
    return true;
  }
  return false;
}

function showTvInstallPrompt() {
  if (isAppAlreadyInstalled()) return;
  if (document.getElementById('tv-install-banner')) return;
  // Never interrupt playback, and only offer the install on phones/tablets and TVs
  if (document.getElementById('player')) return;
  const tvMode = isTvChrome();
  const isMobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || '') || navigator.maxTouchPoints > 1;
  if (!tvMode && !isMobile) return;
  const banner = document.createElement('div');
  banner.id = 'tv-install-banner';
  banner.className = 'tv-install-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Install Avioc Cinema App');
  banner.innerHTML = \`
    <div class="tv-install-info">
      <div class="tv-install-icon">
        <img src="icon-192.png" width="40" height="40" alt="Avioc Cinema">
      </div>
      <div class="tv-install-text">
        <h4>Install Avioc Cinema <span class="tv-install-badge">\${tvMode ? 'Smart TV' : 'Web App'}</span></h4>
        <p>\${tvMode ? 'Add to your TV Home Screen for 1-click launch and full-screen cinema mode.' : 'Install our app on your device for instant 1-tap access and full-screen HD streaming.'}</p>
      </div>
    </div>
    <div class="tv-install-actions">
      <button type="button" id="tv-install-confirm-btn" class="tv-install-btn" tabindex="0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        <span>\${tvMode ? 'Add to Home Screen (OK)' : 'Install App'}</span>
      </button>
      <button type="button" id="tv-install-cancel-btn" class="tv-install-dismiss" tabindex="0" aria-label="Ignore install prompt">
        ✕ Not now
      </button>
    </div>
  \`;
  document.body.appendChild(banner);

  const confirmBtn = document.getElementById('tv-install-confirm-btn');
  const cancelBtn = document.getElementById('tv-install-cancel-btn');

  if (tvMode) {
    setTimeout(() => {
      if (confirmBtn) confirmBtn.focus();
    }, 100);
  }

  const triggerInstall = async () => {
    // Permanently remember that user tapped install so they are never asked again
    try {
      localStorage.setItem('avioc_app_installed', 'true');
      localStorage.setItem('avioc_tv_installed', 'true');
      localStorage.setItem('avioc_pwa_installed', 'true');
      sessionStorage.setItem('avioc_tv_install_dismissed', '1');
    } catch {}

    if (deferredInstallPrompt) {
      try {
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          if (localStorage.getItem('avioc_pwa_install_tracked') !== 'true') {
            localStorage.setItem('avioc_pwa_install_tracked', 'true');
            if (typeof trackEvent === 'function') trackEvent('pwa_install');
          }
          toast('🎉 Avioc Cinema App installed!');
          banner.remove();
          deferredInstallPrompt = null;
          return;
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    }
    banner.remove();
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || '');
    if (isIOS) {
      toast('📲 On iPhone/iPad: tap Share (↑) in Safari -> "Add to Home Screen"');
    } else {
      toast('📲 Tap browser Menu (⋮) -> "Install app" or "Add to Home Screen"');
    }
  };

  confirmBtn?.addEventListener('click', triggerInstall);
  cancelBtn?.addEventListener('click', () => {
    closeTvInstallBanner();
  });
}`;

const replaceInstallSection = `function hasAppInstalledOnDevice() {
  try {
    if (localStorage.getItem('avioc_app_installed') === 'true') return true;
    if (localStorage.getItem('avioc_pwa_installed') === 'true') return true;
    if (localStorage.getItem('avioc_tv_installed') === 'true') return true;
    if (window._hasAppInstalledOnDevice === true) return true;
  } catch {}
  return false;
}

function isAppAlreadyInstalled() {
  return isStandaloneApp() || hasAppInstalledOnDevice();
}

// Check native OS installed apps via getInstalledRelatedApps API
if ('getInstalledRelatedApps' in navigator) {
  navigator.getInstalledRelatedApps().then(apps => {
    if (apps && apps.length > 0) {
      try {
        localStorage.setItem('avioc_app_installed', 'true');
        localStorage.setItem('avioc_pwa_installed', 'true');
        localStorage.setItem('avioc_tv_installed', 'true');
        window._hasAppInstalledOnDevice = true;
      } catch {}
      // If install prompt was visible, replace it with Open App
      const banner = document.getElementById('tv-install-banner');
      if (banner && !isStandaloneApp()) {
        banner.remove();
        showTvInstallPrompt();
      }
    }
  }).catch(() => {});
}

function closeTvInstallBanner() {
  const banner = document.getElementById('tv-install-banner');
  if (banner) {
    banner.remove();
    try {
      sessionStorage.setItem('avioc_app_prompt_dismissed', '1');
      sessionStorage.setItem('avioc_tv_install_dismissed', '1');
      localStorage.setItem('avioc_install_dismissed', 'true');
    } catch {}
    return true;
  }
  return false;
}

function showTvInstallPrompt() {
  // If currently running INSIDE the installed standalone app, never show any banner
  if (isStandaloneApp()) return;
  if (document.getElementById('tv-install-banner')) return;
  // Never interrupt playback
  if (document.getElementById('player')) return;

  // Check if dismissed in this session
  if (sessionStorage.getItem('avioc_app_prompt_dismissed') === '1') return;

  const appExists = hasAppInstalledOnDevice();
  const tvMode = isTvChrome();
  const isMobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || '') || navigator.maxTouchPoints > 1;
  if (!tvMode && !isMobile) return;

  const banner = document.createElement('div');
  banner.id = 'tv-install-banner';
  banner.className = 'tv-install-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', appExists ? 'Open Avioc Cinema App' : 'Install Avioc Cinema App');

  if (appExists) {
    // App exists on device -> Show "Open in App" instead of install!
    banner.innerHTML = \`
      <div class="tv-install-info">
        <div class="tv-install-icon">
          <img src="icon-192.png" width="40" height="40" alt="Avioc Cinema">
        </div>
        <div class="tv-install-text">
          <h4>Avioc Cinema <span class="tv-install-badge">Installed</span></h4>
          <p>\${tvMode ? 'Launch from your TV Home Screen for 1-click full-screen cinema mode.' : 'Open in the installed app for instant full-screen HD cinema streaming.'}</p>
        </div>
      </div>
      <div class="tv-install-actions">
        <button type="button" id="tv-open-app-btn" class="tv-install-btn" tabindex="0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5zm14 16H5V5h14v14zM12 7l-5 5h3v4h4v-4h3l-5-5z"/></svg>
          <span>Open App</span>
        </button>
        <button type="button" id="tv-install-cancel-btn" class="tv-install-dismiss" tabindex="0" aria-label="Stay in browser">
          ✕ Stay in Browser
        </button>
      </div>
    \`;
  } else {
    // App does not exist -> Show Install prompt (unless permanently dismissed)
    if (localStorage.getItem('avioc_install_dismissed') === 'true') return;
    banner.innerHTML = \`
      <div class="tv-install-info">
        <div class="tv-install-icon">
          <img src="icon-192.png" width="40" height="40" alt="Avioc Cinema">
        </div>
        <div class="tv-install-text">
          <h4>Install Avioc Cinema <span class="tv-install-badge">\${tvMode ? 'Smart TV' : 'Web App'}</span></h4>
          <p>\${tvMode ? 'Add to your TV Home Screen for 1-click launch and full-screen cinema mode.' : 'Install our app on your device for instant 1-tap access and full-screen HD streaming.'}</p>
        </div>
      </div>
      <div class="tv-install-actions">
        <button type="button" id="tv-install-confirm-btn" class="tv-install-btn" tabindex="0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          <span>\${tvMode ? 'Add to Home Screen (OK)' : 'Install App'}</span>
        </button>
        <button type="button" id="tv-install-cancel-btn" class="tv-install-dismiss" tabindex="0" aria-label="Ignore install prompt">
          ✕ Not now
        </button>
      </div>
    \`;
  }

  document.body.appendChild(banner);

  const openBtn = document.getElementById('tv-open-app-btn');
  const confirmBtn = document.getElementById('tv-install-confirm-btn');
  const cancelBtn = document.getElementById('tv-install-cancel-btn');

  if (tvMode && (openBtn || confirmBtn)) {
    setTimeout(() => {
      (openBtn || confirmBtn)?.focus();
    }, 100);
  }

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      try { sessionStorage.setItem('avioc_app_prompt_dismissed', '1'); } catch {}
      banner.remove();
      // On mobile / TV: navigating opens the installed standalone PWA / app
      const currentUrl = window.location.href;
      window.location.href = currentUrl;
    });
  }

  if (confirmBtn) {
    const triggerInstall = async () => {
      try {
        localStorage.setItem('avioc_app_installed', 'true');
        localStorage.setItem('avioc_tv_installed', 'true');
        localStorage.setItem('avioc_pwa_installed', 'true');
        sessionStorage.setItem('avioc_tv_install_dismissed', '1');
      } catch {}

      if (deferredInstallPrompt) {
        try {
          deferredInstallPrompt.prompt();
          const choice = await deferredInstallPrompt.userChoice;
          if (choice && choice.outcome === 'accepted') {
            if (localStorage.getItem('avioc_pwa_install_tracked') !== 'true') {
              localStorage.setItem('avioc_pwa_install_tracked', 'true');
              if (typeof trackEvent === 'function') trackEvent('pwa_install');
            }
            toast('🎉 Avioc Cinema App installed!');
            banner.remove();
            deferredInstallPrompt = null;
            return;
          }
        } catch (err) {
          console.warn('Install prompt error:', err);
        }
      }
      banner.remove();
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || '');
      if (isIOS) {
        toast('📲 On iPhone/iPad: tap Share (↑) in Safari -> "Add to Home Screen"');
      } else {
        toast('📲 Tap browser Menu (⋮) -> "Install app" or "Add to Home Screen"');
      }
    };
    confirmBtn.addEventListener('click', triggerInstall);
  }

  cancelBtn?.addEventListener('click', () => {
    closeTvInstallBanner();
  });
}`;

if (html.includes(targetInstallSection)) {
  html = html.replace(targetInstallSection, replaceInstallSection);
  console.log('4. Replaced install section with "Open App" if app exists on device.');
} else {
  console.warn('4. targetInstallSection exact match failed; attempting regex...');
  const installRegex = /function isAppAlreadyInstalled\(\) \{[\s\S]*?cancelBtn\?\.addEventListener\('click',\s*\(\)\s*=>\s*\{[\s\S]*?closeTvInstallBanner\(\);[\s\S]*?\}\);\s*\}/;
  if (installRegex.test(html)) {
    html = html.replace(installRegex, replaceInstallSection.trim());
    console.log('4. Replaced install section via regex.');
  } else {
    console.error('4. Failed to match install section.');
  }
}

// 5. Remove automatic 5-minute install nag timeout
const targetInstallNag = `  // For other devices: do NOT constantly nag! Only show once if never installed and never dismissed
  setTimeout(() => {
    if (!isAppAlreadyInstalled()) {
      showTvInstallPrompt();
    }
  }, 5 * 60 * 1000);`;

if (html.includes(targetInstallNag)) {
  html = html.replace(targetInstallNag, '// Automatic 5-minute nag timer removed: prompts only occur gracefully on initial visit without disruption.');
  console.log('5. Removed automatic 5-minute install popup timer.');
}

// 6. Ensure 1-hour expiration on messages in checkPendingAdminMessages and syncBrowserHistoryToCloud
const targetMsgCheck1 = `      if(data?.pendingMessages?.length){
        const pending = data.pendingMessages.find(m => {
          try{ return !sessionStorage.getItem(\`avioc:dismissed_msg_\${m.id}\`); }catch{ return true; }
        });
        if(pending && (!adminMsgModal || adminMsgModal.hidden)){
          showAdminMessageModal(pending);
        }
      }`;

const replaceMsgCheck1 = `      if(data?.pendingMessages?.length){
        const pending = data.pendingMessages.find(m => {
          try{
            if (sessionStorage.getItem(\`avioc:dismissed_msg_\${m.id}\`)) return false;
            const createdMs = new Date(m.createdAt || 0).getTime();
            if (createdMs && (Date.now() - createdMs > 60 * 60 * 1000)) return false; // Over 1 hour = missed!
            return true;
          }catch{ return true; }
        });
        if(pending && (!adminMsgModal || adminMsgModal.hidden)){
          showAdminMessageModal(pending);
        }
      }`;

if (html.includes(targetMsgCheck1)) {
  html = html.replace(targetMsgCheck1, replaceMsgCheck1);
  console.log('6a. Added 1-hour missed message check in syncBrowserHistoryToCloud.');
}

const targetMsgCheck2 = `    const pending = data.messages.find((m) => {
      try {
        return !sessionStorage.getItem(\`avioc:dismissed_msg_\${m.id}\`);
      } catch {
        return true;
      }
    });`;

const replaceMsgCheck2 = `    const pending = data.messages.find((m) => {
      try {
        if (sessionStorage.getItem(\`avioc:dismissed_msg_\${m.id}\`)) return false;
        const createdMs = new Date(m.createdAt || 0).getTime();
        if (createdMs && (Date.now() - createdMs > 60 * 60 * 1000)) return false; // Over 1 hour = missed!
        return true;
      } catch {
        return true;
      }
    });`;

if (html.includes(targetMsgCheck2)) {
  html = html.replace(targetMsgCheck2, replaceMsgCheck2);
  console.log('6b. Added 1-hour missed message check in checkPendingAdminMessages.');
}

// Write updated edites/index.html
fs.writeFileSync(editesHtmlPath, html, 'utf8');
console.log('SUCCESS! Updated edites/index.html.');

// Also copy to root index.html and new body/avioc-cinema.html
const rootIndexPath = path.join(root, 'index.html');
const newBodyPath = path.join(root, 'new body', 'avioc-cinema.html');
fs.writeFileSync(rootIndexPath, html, 'utf8');
console.log('SUCCESS! Copied to root index.html.');
if (fs.existsSync(path.dirname(newBodyPath))) {
  fs.writeFileSync(newBodyPath, html, 'utf8');
  console.log('SUCCESS! Copied to new body/avioc-cinema.html.');
}

// Also remove Spark TV from admin/index.html
const adminHtmlPath = path.join(root, 'admin', 'index.html');
if (fs.existsSync(adminHtmlPath)) {
  let adminHtml = fs.readFileSync(adminHtmlPath, 'utf8');
  const sparkAdminRegex = /\s*\{\s*id:\s*['"]spark-tv['"][\s\S]*?\},?/i;
  if (sparkAdminRegex.test(adminHtml)) {
    adminHtml = adminHtml.replace(sparkAdminRegex, '');
    fs.writeFileSync(adminHtmlPath, adminHtml, 'utf8');
    console.log('SUCCESS! Removed Spark TV from admin/index.html.');
  }
}
