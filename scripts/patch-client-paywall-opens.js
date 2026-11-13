const fs = require('fs');

function patchClientFile(filePath) {
  console.log(`Patching ${filePath}...`);
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. App open tracking initialization
  const sessionCheckAnchor = `if(!sessionStorage.getItem("avioc:visited_session")){
    try{sessionStorage.setItem("avioc:visited_session","1")}catch{}
    trackEvent("visit");
  }else{
    trackEvent("heartbeat");
  }`;

  const sessionCheckReplacement = `let appOpenCount = Number(localStorage.getItem("avioc:app_opens") || 0);
  if(!localStorage.getItem("avioc:first_open_date")){
    localStorage.setItem("avioc:first_open_date", new Date().toISOString());
  }
  const isNewAppSession = !sessionStorage.getItem("avioc:visited_session");
  if(isNewAppSession){
    appOpenCount += 1;
    localStorage.setItem("avioc:app_opens", String(appOpenCount));
    try{sessionStorage.setItem("avioc:visited_session","1")}catch{}
    trackEvent("app_open", { openCount: appOpenCount });
  }else{
    trackEvent("heartbeat");
  }`;

  if (!content.includes('localStorage.setItem("avioc:app_opens"')) {
    content = content.replace(sessionCheckAnchor, sessionCheckReplacement);
  }

  // 2. In syncBrowserHistoryToCloud, send openCount, firstOpenDate, isAppOpen, and hitPaywall
  const syncBodyAnchor = `sharesList:localStore?.shares?Object.values(localStore.shares):[],
        searchesList:localStore?.searches?Object.values(localStore.searches):[],
        watchSecondsUsed
      }),`;

  const syncBodyReplacement = `sharesList:localStore?.shares?Object.values(localStore.shares):[],
        searchesList:localStore?.searches?Object.values(localStore.searches):[],
        watchSecondsUsed,
        openCount: Number(localStorage.getItem("avioc:app_opens") || 1),
        firstOpenDate: localStorage.getItem("avioc:first_open_date") || null,
        isAppOpen: Boolean(!window._initialSyncSent ? (window._initialSyncSent = true, !sessionStorage.getItem("avioc:synced_session")) : false),
        hitPaywall: Boolean(!activePass && freeStat?.exhausted)
      }),`;

  if (!content.includes('firstOpenDate: localStorage.getItem("avioc:first_open_date")')) {
    content = content.replace(syncBodyAnchor, syncBodyReplacement);
  }

  // 3. In movie player timer when 3h trial expires, track paywall_hit
  const movieTimerPaywallAnchor = `video.pause();
          stopPlayer(false);
          openAccount(authSession?.user?"plans":"signin",`;

  const movieTimerPaywallReplacement = `video.pause();
          stopPlayer(false);
          if(typeof trackEvent==="function")trackEvent("paywall_hit",{itemId:t?.id||id,itemTitle:t?.title||"Free Trial Ended",itemType:t?.type||"film",vj:t?.vj||""});
          openAccount(authSession?.user?"plans":"signin",`;

  if (!content.includes('trackEvent("paywall_hit",{itemId:t?.id||id,itemTitle:t?.title||"Free Trial Ended"')) {
    content = content.replace(movieTimerPaywallAnchor, movieTimerPaywallReplacement);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Successfully patched ${filePath}`);
}

patchClientFile('index.html');
patchClientFile('edites/index.html');
patchClientFile('new body/avioc-cinema.html');
