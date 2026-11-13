const fs = require('fs');

const adminPath = 'admin/index.html';
let content = fs.readFileSync(adminPath, 'utf8');

// 1. Add offer selector under CTA type in admin modal
const targetHtml = `<label class="field" style="flex:1">
          Primary Action Button
          <input type="text" id="send-msg-cta-text" value="Proceed" placeholder="e.g. Proceed to Payment, Sign in with Google, Watch Now" style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--ink);font-weight:700;font-size:0.88rem">
        </label>
      </div>`;

const newHtml = `<label class="field" style="flex:1">
          Primary Action Button
          <input type="text" id="send-msg-cta-text" value="Proceed" placeholder="e.g. Proceed to Payment, Sign in with Google, Watch Now" style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--ink);font-weight:700;font-size:0.88rem">
        </label>
      </div>

      <div id="send-msg-offer-group" style="margin-bottom:12px;display:none;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);padding:10px 12px;border-radius:8px">
        <label class="field" style="margin:0">
          <span style="color:var(--accent);font-weight:800;font-size:0.82rem">🎁 ATTACH OFFER PASS (FOR USER PAYMENT)</span>
          <select id="send-msg-offer-plan" style="width:100%;margin-top:5px;padding:9px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--ink);font-weight:750;font-size:0.88rem">
            <option value="offer-500" selected>🔥 24-Hour Weekend Special Pass — UGX 500 (1 Day)</option>
            <option value="offer-1500">🎁 7-Day Promo Pass — UGX 1,500 (1 Week)</option>
            <option value="offer-5000">👑 30-Day VIP Pass — UGX 5,000 (1 Month)</option>
          </select>
        </label>
      </div>`;

if (!content.includes('send-msg-offer-group')) {
  content = content.replace(targetHtml, newHtml);
}

// 2. In CTA change listener, show/hide send-msg-offer-group and set default button text
const targetJsListener = `if (val === 'payment') defaultBtn = 'Proceed to Payment';`;
const newJsListener = `if (val === 'payment') {
        defaultBtn = 'Claim UGX 500 Pass';
        const offGroup = $('#send-msg-offer-group');
        if (offGroup) offGroup.style.display = 'block';
      } else {
        const offGroup = $('#send-msg-offer-group');
        if (offGroup) offGroup.style.display = 'none';
      }`;

if (!content.includes("Claim UGX 500 Pass")) {
  content = content.replace(targetJsListener, newJsListener);
}

// 3. When offer plan dropdown changes, update button label
const targetOfferChangeAnchor = `$('#send-msg-cta-type')?.addEventListener('change', (ev) => {`;
const newOfferChangeListener = `$('#send-msg-offer-plan')?.addEventListener('change', (ev) => {
      const planVal = ev.target.value;
      const ctaIn = $('#send-msg-cta-text');
      const yesIn = $('#send-msg-btn-yes');
      let lbl = 'Claim UGX 500 Pass';
      if (planVal === 'offer-1500') lbl = 'Claim UGX 1,500 Pass';
      if (planVal === 'offer-5000') lbl = 'Claim UGX 5,000 Pass';
      if (ctaIn) ctaIn.value = lbl;
      if (yesIn) yesIn.value = lbl;
    });

    $('#send-msg-cta-type')?.addEventListener('change', (ev) => {`;

if (!content.includes("send-msg-offer-plan')?.addEventListener('change'")) {
  content = content.replace(targetOfferChangeAnchor, newOfferChangeListener);
}

// 4. In form submit, read offer plan from dropdown
const targetSubmitOffer = `let offerPlan = null;
        let offerPrice = null;
        let offerDays = null;
        if (ctaType === 'payment' || /500/i.test(message) || /weekend|promo|weekly|monthly/i.test(message)) {
          if (/500/i.test(message) || /24h|1\\s*day/i.test(message)) {
            offerPlan = 'offer-500';
            offerPrice = 500;
            offerDays = 1;
          } else if (/1,?500/i.test(message) || /weekly|7\\s*day/i.test(message)) {
            offerPlan = 'offer-1500';
            offerPrice = 1500;
            offerDays = 7;
          } else if (/5,?000/i.test(message) || /monthly|30\\s*day/i.test(message)) {
            offerPlan = 'offer-5000';
            offerPrice = 5000;
            offerDays = 30;
          }
        }`;

const newSubmitOffer = `let offerPlan = null;
        let offerPrice = null;
        let offerDays = null;
        if (ctaType === 'payment') {
          offerPlan = $('#send-msg-offer-plan')?.value || 'offer-500';
          if (offerPlan === 'offer-500') { offerPrice = 500; offerDays = 1; }
          else if (offerPlan === 'offer-1500') { offerPrice = 1500; offerDays = 7; }
          else if (offerPlan === 'offer-5000') { offerPrice = 5000; offerDays = 30; }
        } else if (/500/i.test(message) || /weekend|promo|weekly|monthly/i.test(message)) {
          if (/500/i.test(message) || /24h|1\\s*day/i.test(message)) {
            offerPlan = 'offer-500';
            offerPrice = 500;
            offerDays = 1;
          } else if (/1,?500/i.test(message) || /weekly|7\\s*day/i.test(message)) {
            offerPlan = 'offer-1500';
            offerPrice = 1500;
            offerDays = 7;
          } else if (/5,?000/i.test(message) || /monthly|30\\s*day/i.test(message)) {
            offerPlan = 'offer-5000';
            offerPrice = 5000;
            offerDays = 30;
          }
        }`;

content = content.replace(targetSubmitOffer, newSubmitOffer);

fs.writeFileSync(adminPath, content, 'utf8');
console.log('Successfully patched admin/index.html');
