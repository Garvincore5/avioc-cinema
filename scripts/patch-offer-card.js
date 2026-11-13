const fs = require('fs');

function patchFile(filePath) {
  console.log(`Patching ${filePath}...`);
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Add CSS for .acct-plan.acct-plan-offer-card
  const oldCss = `.acct-plan.acct-plan-promo{border:1.5px solid var(--accent);background:linear-gradient(135deg,rgba(243,164,59,.18),rgba(20,16,30,.88))}`;
  const newCss = `.acct-plan.acct-plan-promo{border:1.5px solid var(--accent);background:linear-gradient(135deg,rgba(243,164,59,.18),rgba(20,16,30,.88))}
.acct-plan.acct-plan-offer-card{display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:7px;padding:12px 14px!important;border:1.8px solid var(--accent)!important;background:linear-gradient(135deg,rgba(243,164,59,.22),rgba(225,29,72,.16) 50%,rgba(20,16,30,.94))!important;box-shadow:0 4px 20px rgba(243,164,59,.22);margin-bottom:6px!important;border-radius:12px}
.acct-plan.acct-plan-offer-card[aria-pressed="true"]{border-color:#facc15!important;box-shadow:0 0 0 2px #facc15,0 6px 24px rgba(243,164,59,.38)!important}
.acct-offer-header{display:flex;align-items:center;justify-content:space-between;width:100%}
.acct-offer-badge{background:linear-gradient(135deg,#f59e0b,#ef4444);color:#0b0914;font-size:10px;font-weight:900;padding:2px 7px;border-radius:4px;letter-spacing:.05em}
.acct-offer-save{background:rgba(16,185,129,.18);border:1px solid rgba(16,185,129,.45);color:#34d399;font-size:10px;font-weight:850;padding:2px 6px;border-radius:4px}
.acct-offer-body{display:flex;align-items:center;justify-content:space-between;width:100%}
.acct-offer-info{text-align:left;min-width:0}
.acct-offer-info b{display:block;font-size:14px;color:#fff}
.acct-offer-info small{display:block;font-size:11px;color:#fcd34d;margin-top:2px}
.acct-offer-price-col{text-align:right;flex:none}
.acct-offer-price-col del{display:block;font-size:11px;color:rgba(255,255,255,.45);text-decoration:line-through}
.acct-offer-price-col strong{display:block;font-size:15.5px;color:var(--gold);font-weight:900}`;

  if (!content.includes('.acct-plan.acct-plan-offer-card')) {
    content = content.replace(oldCss, newCss);
  }

  // 2. Offer Helpers & loadAccountPlans update
  const offerHelpersCode = `function getActiveOffer(){
  try{
    const raw=localStorage.getItem("avioc:active_offer");
    if(!raw)return null;
    const offer=JSON.parse(raw);
    if(!offer||!offer.id)return null;
    if(offer.expiresAt&&Date.now()>offer.expiresAt){localStorage.removeItem("avioc:active_offer");return null}
    return offer;
  }catch{return null}
}
function saveActiveOffer(offer){
  try{
    if(!offer){localStorage.removeItem("avioc:active_offer");return null}
    const obj={
      id:offer.id||"offer-500",
      amountUgx:Number(offer.amountUgx)||(offer.id==="offer-500"?500:1000),
      days:Number(offer.days)||1,
      label:offer.label||"24-Hour VIP Promo Pass",
      desc:offer.desc||"Weekend Special Offer · All Movies, Series & Live TV",
      isOffer:true,
      receivedAt:Date.now(),
      expiresAt:offer.expiresAt||(Date.now()+48*60*60*1000)
    };
    localStorage.setItem("avioc:active_offer",JSON.stringify(obj));
    return obj;
  }catch{return null}
}
async function loadAccountPlans(){
  try{
    const [plans,cards]=await Promise.all([accountApi("/api/plans"),accountApi("/api/prices/card")]);
    const normalPlans=(plans.plans||[]).map(p=>({...p,days:p.days||Number(String(p.id).match(/\\d+/)?.[0]||0)}));
    const offerPlans=(plans.offerPlans||[]).map(p=>({...p,days:p.days||Number(String(p.id).match(/\\d+/)?.[0]||0),isOffer:true}));
    accountPlanList=normalPlans.filter(p=>!p.isOffer && Number(p.amountUgx)>=1000 && !String(p.id).startsWith('offer'));
    window.availableOfferPlans=offerPlans;
    cardPlanList=(cards.plans||[]).map(p=>({...p,days:Number(String(p.id).match(/\\d+/)?.[0]||0)}));
    const activeOffer=getActiveOffer();
    if(accountMethod==="card"&&!cardPlanList.some(p=>p.id===selectedPlanId))selectedPlanId=cardPlanList[0]?.id||"";
    if(accountMethod==="mobile_money"){
      if(activeOffer&&(!selectedPlanId||selectedPlanId===activeOffer.id)){
        selectedPlanId=activeOffer.id;
      }else if(!accountPlanList.some(p=>p.id===selectedPlanId)&&(!activeOffer||activeOffer.id!==selectedPlanId)){
        selectedPlanId=accountPlanList[0]?.id||"";
      }
    }
    if(accountMode==="plans")renderAccountModal();
  }catch(error){if(accountMode==="plans")renderAccountModal(error.message)}
}`;

  const oldLoadPlansRegex = /async function loadAccountPlans\(\)\{[\s\S]*?if\(accountMode==="plans"\)renderAccountModal\(\);\s*\}catch\(error\)\{if\(accountMode==="plans"\)renderAccountModal\(error\.message\)\}\s*\}/;
  content = content.replace(oldLoadPlansRegex, offerHelpersCode);

  // 3. Update renderAccountModal for plans list & phone pre-fill
  const oldPlansBlock = `  else if(accountMode==="plans"){
    title="Choose your pass";intro="Your pass starts after LivePay confirms payment.";
    const plans=accountMethod==="card"?cardPlanList:accountPlanList;
    content=\`<div class="acct-status">\${hasUser?\`Signed in as <b>\${accountEscape(authSession.user.email)}</b>\`:\`Pick a pass below, then sign in or create a free account to pay.\`}</div><div class="acct-methods"><button type="button" class="acct-method" data-account-method="mobile_money" aria-pressed="\${accountMethod==="mobile_money"}">MTN / Airtel</button><button type="button" class="acct-method" data-account-method="card" aria-pressed="\${accountMethod==="card"}">Card</button></div>\${plans.length?\`<div class="acct-plan-list">\${plans.map(p=>{const days=Number(p.days)||Number(String(p.id).match(/\\d+/)?.[0]||0);const price=accountMethod==="card"?\`$\${Number(p.amountUsd).toFixed(2)}\`:\`UGX \${Number(p.amountUgx).toLocaleString()}\`;const isOffer=Boolean(p.isOffer||p.amountUgx===500||String(p.id).startsWith('offer'));const promoTag=isOffer?\`<span style="background:linear-gradient(135deg,#e11d48,#f43f5e);color:#fff;font-size:9.5px;font-weight:900;padding:2px 6px;border-radius:4px;letter-spacing:0.04em;margin-left:5px">50% PROMO</span>\`:'';return \`<button type="button" class="acct-plan acct-plan-select \${isOffer?'acct-plan-promo':''}" data-account-plan="\${accountEscape(p.id)}" aria-pressed="\${selectedPlanId===p.id}"><span><b>\${days} day\${days===1?"":"s"}\${promoTag}</b><small>\${isOffer?"Weekend Special Offer":(accountMethod==="card"?"Card payment":"Mobile money")}</small></span><strong>\${price}</strong></button>\`}).join("")}</div>\`:\`<p class="acct-wait">Loading passes…</p>\`}\${accountMethod==="mobile_money"&&hasUser?\`<label class="acct-field">Mobile money number<input id="acct-phone" type="tel" inputmode="tel" placeholder="07XXXXXXXX" autocomplete="tel"></label><label class="acct-field">Network<select id="acct-network" required><option value="" disabled selected>Select network (MTN or Airtel)</option><option value="MTN">MTN Uganda</option><option value="AIRTEL">Airtel Uganda</option></select><small>LivePay routes Uganda payments using the number provided.</small></label>\`:""}<div class="acct-actions">\${hasUser?\`<button class="acct-action primary" type="button" data-account-pay \${plans.length?"":"disabled"}>\${accountMethod==="card"?"Continue to card checkout":"Request mobile money payment"}</button><button class="acct-action" type="button" data-account-mode="profile">Back to account</button>\`:\`<button class="acct-action primary" type="button" data-account-mode="signin">Sign in to buy</button><button class="acct-action" type="button" data-account-mode="register">Create free account</button>\`}</div>\`;
  }`;

  const newPlansBlock = `  else if(accountMode==="plans"){
    title="Choose your pass";intro="Your pass starts after LivePay confirms payment.";
    const activeOffer=getActiveOffer();
    let plans=accountMethod==="card"?cardPlanList:[...accountPlanList];
    if(accountMethod==="mobile_money"&&activeOffer){
      if(!plans.some(p=>p.id===activeOffer.id)){
        plans.unshift(activeOffer);
      }
      if(!selectedPlanId||!plans.some(p=>p.id===selectedPlanId)){
        selectedPlanId=activeOffer.id;
      }
    }
    const savedPhone=localStorage.getItem("avioc:last_phone")||"";
    let defaultNetwork="";
    if(savedPhone){
      const cleanPhone=savedPhone.replace(/[\\s()-]/g,"");
      if(/^(?:\\+?256|0)?(77|78|76)/.test(cleanPhone))defaultNetwork="MTN";
      else if(/^(?:\\+?256|0)?(70|75|74)/.test(cleanPhone))defaultNetwork="AIRTEL";
    }
    content=\`<div class="acct-status">\${hasUser?\`Signed in as <b>\${accountEscape(authSession.user.email)}</b>\`:\`Pick a pass below, then sign in or create a free account to pay.\`}</div><div class="acct-methods"><button type="button" class="acct-method" data-account-method="mobile_money" aria-pressed="\${accountMethod==="mobile_money"}">MTN / Airtel</button><button type="button" class="acct-method" data-account-method="card" aria-pressed="\${accountMethod==="card"}">Card</button></div>\${plans.length?\`<div class="acct-plan-list">\${plans.map(p=>{const days=Number(p.days)||Number(String(p.id).match(/\\d+/)?.[0]||0);const price=accountMethod==="card"?\`$\${Number(p.amountUsd).toFixed(2)}\`:\`UGX \${Number(p.amountUgx).toLocaleString()}\`;const isOffer=Boolean(p.isOffer||p.amountUgx===500||String(p.id).startsWith('offer'));if(isOffer){const normalPriceUgx=Number(p.amountUgx)<=500?"UGX 1,000":\`UGX \${(Number(p.amountUgx)*2).toLocaleString()}\`;return \`<button type="button" class="acct-plan acct-plan-select acct-plan-offer-card" data-account-plan="\${accountEscape(p.id)}" aria-pressed="\${selectedPlanId===p.id}"><div class="acct-offer-header"><span class="acct-offer-badge">🔥 SPECIAL ADMIN OFFER</span><span class="acct-offer-save">\${Number(p.amountUgx)<=500?"SAVE 50%":"LIMITED PROMO"}</span></div><div class="acct-offer-body"><div class="acct-offer-info"><b>\${days} day\${days===1?" (24 Hours)":"s"} VIP Pass</b><small>\${accountEscape(p.desc||"Weekend Special · All Movies, Series & Live TV")}</small></div><div class="acct-offer-price-col"><del>\${normalPriceUgx}</del><strong>\${price}</strong></div></div></button>\`}return \`<button type="button" class="acct-plan acct-plan-select" data-account-plan="\${accountEscape(p.id)}" aria-pressed="\${selectedPlanId===p.id}"><span><b>\${days} day\${days===1?"":"s"}</b><small>\${accountMethod==="card"?"Card payment":"Mobile money"}</small></span><strong>\${price}</strong></button>\`}).join("")}</div>\`:\`<p class="acct-wait">Loading passes…</p>\`}\${accountMethod==="mobile_money"&&hasUser?\`<label class="acct-field">Mobile money number<input id="acct-phone" type="tel" inputmode="tel" placeholder="07XXXXXXXX" autocomplete="tel" value="\${accountEscape(savedPhone)}"></label><label class="acct-field">Network<select id="acct-network" required><option value="" disabled \${!defaultNetwork?"selected":""}>Select network (MTN or Airtel)</option><option value="MTN" \${defaultNetwork==="MTN"?"selected":""}>MTN Uganda</option><option value="AIRTEL" \${defaultNetwork==="AIRTEL"?"selected":""}>Airtel Uganda</option></select><small>LivePay routes Uganda payments using the number provided.</small></label>\`:""}<div class="acct-actions">\${hasUser?\`<button class="acct-action primary" type="button" data-account-pay \${plans.length?"":"disabled"}>\${accountMethod==="card"?"Continue to card checkout":"Request mobile money payment"}</button><button class="acct-action" type="button" data-account-mode="profile">Back to account</button>\`:\`<button class="acct-action primary" type="button" data-account-mode="signin">Sign in to buy</button><button class="acct-action" type="button" data-account-mode="register">Create free account</button>\`}</div>\`;
  }`;

  content = content.replace(oldPlansBlock, newPlansBlock);

  // 4. Update adminMsgBtnYes click handler to capture offer BEFORE dismiss/reply
  const oldBtnYesListener = `adminMsgBtnYes?.addEventListener('click', () => {
  const cta = adminMsgBtnYes.dataset.ctaType;
  const mId = adminMsgBtnYes.dataset.movieId;
  const label = adminMsgBtnYes.dataset.replyLabel || 'Proceed';
  const isAction = (cta === 'payment' || cta === 'google_signin' || (cta === 'play_movie' && mId));

  // Send the viewer's positive response to the admin immediately
  sendAdminMessageReply(label, isAction);

  if (cta === 'payment') {
    const isOffer = activeAdminMessage?.offerPlan || adminMsgBtnYes.dataset.offerPlan || (activeAdminMessage && (/500/i.test(activeAdminMessage.message || '') || /offer|promo|weekend/i.test(activeAdminMessage.message || '')));
    if (isOffer) {
      if (typeof P !== 'undefined' && P) delete P._pausedByAdminMsg;
      openOfferPassModal(activeAdminMessage || {
        offerPlan: adminMsgBtnYes.dataset.offerPlan || 'offer-500',
        offerPrice: Number(adminMsgBtnYes.dataset.offerPrice) || 500,
        offerDays: Number(adminMsgBtnYes.dataset.offerDays) || 1
      });
      return;
    }
    if (typeof P !== 'undefined' && P) delete P._pausedByAdminMsg;
    openAccount('plans');
    return;
  }`;

  const newBtnYesListener = `adminMsgBtnYes?.addEventListener('click', () => {
  const cta = adminMsgBtnYes.dataset.ctaType;
  const mId = adminMsgBtnYes.dataset.movieId;
  const label = adminMsgBtnYes.dataset.replyLabel || 'Proceed';
  const isAction = (cta === 'payment' || cta === 'google_signin' || (cta === 'play_movie' && mId));

  // Capture offer details BEFORE sendAdminMessageReply clears activeAdminMessage
  const currentMsg = activeAdminMessage;
  const offerPlan = adminMsgBtnYes.dataset.offerPlan || currentMsg?.offerPlan || (/500/i.test(currentMsg?.message || '') ? 'offer-500' : (cta === 'payment' ? 'offer-500' : null));
  const offerPrice = Number(adminMsgBtnYes.dataset.offerPrice || currentMsg?.offerPrice) || (offerPlan === 'offer-500' ? 500 : (offerPlan ? 1000 : null));
  const offerDays = Number(adminMsgBtnYes.dataset.offerDays || currentMsg?.offerDays) || 1;

  if (offerPlan || offerPrice || cta === 'payment') {
    const offerObj = saveActiveOffer({
      id: offerPlan || 'offer-500',
      amountUgx: offerPrice || 500,
      days: offerDays || 1,
      label: currentMsg?.title || '24-Hour VIP Promo Pass',
      desc: currentMsg?.message || 'Special Admin Offer'
    });
    selectedPlanId = offerObj.id;
    accountMethod = 'mobile_money';
  }

  // Send the viewer's positive response to the admin immediately
  sendAdminMessageReply(label, isAction);

  if (cta === 'payment' || offerPlan || offerPrice) {
    if (typeof P !== 'undefined' && P) delete P._pausedByAdminMsg;
    openAccount('plans');
    return;
  }`;

  content = content.replace(oldBtnYesListener, newBtnYesListener);

  // 5. Auto save phone input and detect network
  const phoneAutoListenAnchor = `function startAccountPayment(){`;
  const phoneAutoListenCode = `document.addEventListener("input",(ev)=>{
  if(ev.target&&ev.target.id==="acct-phone"){
    const val=(ev.target.value||"").trim();
    localStorage.setItem("avioc:last_phone",val);
    const netEl=document.getElementById("acct-network");
    if(netEl){
      const cleanPhone=val.replace(/[\\s()-]/g,"");
      if(/^(?:\\+?256|0)?(77|78|76)/.test(cleanPhone))netEl.value="MTN";
      else if(/^(?:\\+?256|0)?(70|75|74)/.test(cleanPhone))netEl.value="AIRTEL";
    }
  }
});
function startAccountPayment(){`;

  if (!content.includes('localStorage.setItem("avioc:last_phone",val)')) {
    content = content.replace(phoneAutoListenAnchor, phoneAutoListenCode);
  }

  // 6. Incoming pending messages should auto-save offer if present
  const pendingIncomingAnchor = `if (pending) {
      if (document.hidden) {
        triggerWebNotification(pending);
      }`;
  const pendingIncomingCode = `if (pending) {
      const isOfferMsg = pending.offerPlan || pending.offerPrice || /500\\s*(?:ugx|shs|shillings)?/i.test(pending.message || '') || (pending.ctaType === 'payment' && /offer|weekend|promo/i.test(pending.message || ''));
      if (isOfferMsg) {
        saveActiveOffer({
          id: pending.offerPlan || 'offer-500',
          amountUgx: Number(pending.offerPrice) || 500,
          days: Number(pending.offerDays) || 1,
          label: pending.title || 'Special Admin Offer',
          desc: pending.message || 'VIP Access Offer'
        });
      }
      if (document.hidden) {
        triggerWebNotification(pending);
      }`;

  if (!content.includes('const isOfferMsg = pending.offerPlan')) {
    content = content.replace(pendingIncomingAnchor, pendingIncomingCode);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Successfully patched ${filePath}`);
}

patchFile('index.html');
patchFile('edites/index.html');
patchFile('new body/avioc-cinema.html');
