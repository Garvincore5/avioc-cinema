const fs = require('fs');

const adminPath = 'admin/index.html';
let content = fs.readFileSync(adminPath, 'utf8');

// 1. Add tabs to navigation
const navTarget = `<button type="button" class="tab-btn" data-tab="live">🟢 Live Now <span class="tab-count" id="tc-live">0</span></button>`;
const navReplacement = `<button type="button" class="tab-btn" data-tab="live">🟢 Live Now <span class="tab-count" id="tc-live">0</span></button>
    <button type="button" class="tab-btn" data-tab="paywall">💳 Paywall Leads <span class="tab-count" id="tc-paywall">0</span></button>
    <button type="button" class="tab-btn" data-tab="installs">📱 App Installs <span class="tab-count" id="tc-installs">0</span></button>`;

if (!content.includes('data-tab="paywall"')) {
  content = content.replace(navTarget, navReplacement);
}

// 2. Update tab counts in updateMetricsFromData
const countTarget = `$('#tc-live').textContent = fmtNum(live.onlineCount);`;
const countReplacement = `$('#tc-live').textContent = fmtNum(live.onlineCount);
      if ($('#tc-paywall')) $('#tc-paywall').textContent = fmtNum(dashData.paywallHits?.length || overview.totalPaywallHits || 0);
      if ($('#tc-installs')) $('#tc-installs').textContent = fmtNum(dashData.installedUsers?.length || overview.totalAppInstalls || 0);`;

if (!content.includes('if ($("#tc-paywall"))')) {
  content = content.replace(countTarget, countReplacement);
}

// 3. Add KPI cards in kpiCardsHtml
const kpiTarget = `<div class="kpi-card" data-tab="live">
          <small>🟢 Live Users Online</small>
          <b>\${fmtNum(live.onlineCount)}</b>
          <span class="subtext">\${fmtNum(live.watchingMovieCount)} Movies · \${fmtNum(live.watchingTvCount)} TV</span>
        </div>`;

const kpiReplacement = `<div class="kpi-card" data-tab="live">
          <small>🟢 Live Users Online</small>
          <b>\${fmtNum(live.onlineCount)}</b>
          <span class="subtext">\${fmtNum(live.watchingMovieCount)} Movies · \${fmtNum(live.watchingTvCount)} TV</span>
        </div>
        <div class="kpi-card" data-tab="paywall" style="border-color:rgba(239,68,68,0.35);background:linear-gradient(135deg,rgba(239,68,68,0.12),var(--card))">
          <small style="color:#f87171">💳 Paywall Hits (Leads)</small>
          <b style="color:#f87171">\${fmtNum(d.paywallHits?.length || overview.totalPaywallHits || 0)}</b>
          <span class="subtext">Ran out of free trial · Ready for offers</span>
        </div>
        <div class="kpi-card" data-tab="installs" style="border-color:rgba(16,185,129,0.35);background:linear-gradient(135deg,rgba(16,185,129,0.12),var(--card))">
          <small style="color:#34d399">📱 App Installs (PWA/TV)</small>
          <b style="color:#34d399">\${fmtNum(d.installedUsers?.length || overview.totalAppInstalls || 0)}</b>
          <span class="subtext">Installed on home screen / device</span>
        </div>`;

if (!content.includes('data-tab="paywall" style="border-color:rgba(239,68,68,0.35)')) {
  content = content.replace(kpiTarget, kpiReplacement);
}

// 4. In openMsg click listener, enhance offer prefilling
const offerMsgTarget = `if (offerText) {
          $('#send-msg-text').value = offerText;
          if ($('#send-msg-title')) $('#send-msg-title').value = 'Avioc Cinema VIP Offer';
          if ($('#send-msg-cta-type')) $('#send-msg-cta-type').value = 'payment';
          if ($('#send-msg-cta-text')) $('#send-msg-cta-text').value = 'Proceed to Payment';
          if ($('#send-msg-btn-yes')) $('#send-msg-btn-yes').value = 'Proceed to Payment';
          if ($('#send-msg-btn-no')) $('#send-msg-btn-no').value = 'Later';
        }`;

const offerMsgReplacement = `if (offerText) {
          const offerPlan = openMsg.dataset.offerPlan || 'offer-500';
          const offerPrice = Number(openMsg.dataset.offerPrice) || 500;
          const btnLabel = \`Claim UGX \${offerPrice.toLocaleString()} Pass\`;
          $('#send-msg-text').value = offerText;
          if ($('#send-msg-title')) $('#send-msg-title').value = \`👑 VIP Pass Special — UGX \${offerPrice.toLocaleString()}\`;
          if ($('#send-msg-cta-type')) $('#send-msg-cta-type').value = 'payment';
          if ($('#send-msg-offer-group')) $('#send-msg-offer-group').style.display = 'block';
          if ($('#send-msg-offer-plan')) $('#send-msg-offer-plan').value = offerPlan;
          if ($('#send-msg-cta-text')) $('#send-msg-cta-text').value = btnLabel;
          if ($('#send-msg-btn-yes')) $('#send-msg-btn-yes').value = btnLabel;
          if ($('#send-msg-btn-no')) $('#send-msg-btn-no').value = 'Later';
        }`;

content = content.replace(offerMsgTarget, offerMsgReplacement);

// 5. Add search filter state variables
if (!content.includes('let paywallQuery =')) {
  content = content.replace('let memberQuery = \'\';', `let memberQuery = '';\n    let memberFilter = 'all';\n    let paywallQuery = '';\n    let paywallFilter = 'all';\n    let installQuery = '';\n    let installFilter = 'all';`);
}

// 6. Define paywallSectionHtml and installsSectionHtml
const sectionsCode = `    function paywallSectionHtml(d) {
      let list = d.paywallHits || [];
      if (paywallFilter === 'members') list = list.filter(h => h.userId);
      else if (paywallFilter === 'guests') list = list.filter(h => !h.userId);
      else if (paywallFilter === 'converted') list = list.filter(h => h.hasActivePass);
      else if (paywallFilter === 'locked') list = list.filter(h => !h.hasActivePass);

      if (paywallQuery.trim()) {
        const q = paywallQuery.trim().toLowerCase();
        list = list.filter(h => \`\${h.userName || ''} \${h.userEmail || ''} \${h.phone || ''} \${h.itemTitle || ''} \${h.visitorId || ''}\`.toLowerCase().includes(q));
      }

      const totalHits = d.paywallHits?.length || 0;
      const lockedHits = (d.paywallHits || []).filter(h => !h.hasActivePass).length;

      return \`
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2>💳 Viewers Who Hit the Payment Wall (\${fmtNum(totalHits)})</h2>
              <small>Visitors and members who ran out of their 3-hour free trial / preview time. High-intent leads ready for offers!</small>
            </div>
            <button type="button" class="btn sm gold" data-msg-type="all" data-msg-id="all" data-offer-plan="offer-500" data-offer-price="500" data-offer-text="👑 Weekend VIP Pass Special! Get unlimited access to all translated movies, series & Live TV for only 500 UGX! Tap below to claim now.">📢 Broadcast 500 UGX Offer to All</button>
          </div>
          <div class="toolbar">
            <input type="search" class="search-in" id="paywall-search-in" placeholder="Search by viewer name, email, phone, movie, or visitor ID…" value="\${esc(paywallQuery)}">
            <button type="button" class="pill-filter \${paywallFilter === 'all' ? 'active' : ''}" data-paywall-filter="all">All Leads (\${totalHits})</button>
            <button type="button" class="pill-filter \${paywallFilter === 'locked' ? 'active' : ''}" data-paywall-filter="locked">⛔ Locked / Not Converted (\${lockedHits})</button>
            <button type="button" class="pill-filter \${paywallFilter === 'members' ? 'active' : ''}" data-paywall-filter="members">👤 Signed-in Members (\${(d.paywallHits || []).filter(h => h.userId).length})</button>
            <button type="button" class="pill-filter \${paywallFilter === 'guests' ? 'active' : ''}" data-paywall-filter="guests">👥 Guests (\${(d.paywallHits || []).filter(h => !h.userId).length})</button>
            <button type="button" class="pill-filter \${paywallFilter === 'converted' ? 'active' : ''}" data-paywall-filter="converted">👑 Converted to VIP (\${(d.paywallHits || []).filter(h => h.hasActivePass).length})</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Viewer</th>
                  <th>Stopped At (Movie / Channel)</th>
                  <th>Watch Time</th>
                  <th>App Opens (Day 1 to Now)</th>
                  <th>When Hit</th>
                  <th>Status</th>
                  <th>Direct Action</th>
                </tr>
              </thead>
              <tbody>
                \${list.length ? list.map((h) => {
                  const offerDefaultText = \`Hey \${h.userName || 'there'}! We noticed your free watch time ended. Get 24 Hours Unlimited VIP Access for only 500 UGX! Tap below to claim.\`;
                  return \`
                    <tr>
                      <td>
                        <div class="user-meta">
                          <b>\${esc(h.userName || 'Guest Viewer')}</b>
                          <small>\${esc(h.userEmail || h.visitorId)}\${h.phone ? \` · 📞 \${esc(h.phone)}\` : ''}</small>
                          <small style="color:var(--muted)">\${esc(h.deviceType || 'Device')} · \${esc(h.os || '')}\${h.isPwa ? ' · 📱 App Installed' : ''}</small>
                        </div>
                      </td>
                      <td>
                        <b>🎬 \${esc(h.itemTitle || 'VIP Pass Prompt')}</b>
                        \${h.vj ? \`<small style="display:block;color:var(--gold)">VJ \${esc(h.vj)}</small>\` : ''}
                      </td>
                      <td>
                        <span class="tag green">\${fmtDuration(h.watchSeconds || 0)}</span>
                        <small style="display:block;color:var(--muted)">\${h.watchSeconds >= 10800 ? '🔥 Completed 3h Trial' : 'Trial Ended'}</small>
                      </td>
                      <td>
                        <b>\${fmtNum(h.openCount || 1)} opens</b>
                        <small style="display:block;color:var(--muted)">First seen: \${fmtDate(h.firstSeen)}</small>
                      </td>
                      <td>
                        <span class="tag red">\${timeAgo(h.hitAt)}</span>
                      </td>
                      <td>
                        \${h.hasActivePass
                          ? '<span class="tag gold">👑 VIP Active</span>'
                          : '<span class="tag red">⛔ Paywall Locked</span>'}
                      </td>
                      <td>
                        <div style="display:flex;gap:6px;flex-wrap:wrap">
                          <button type="button" class="btn sm gold" data-msg-type="\${h.userId ? 'user' : 'visitor'}" data-msg-id="\${esc(h.userId || h.visitorId)}" data-msg-name="\${esc(h.userName)}" data-offer-plan="offer-500" data-offer-price="500" data-offer-text="\${esc(offerDefaultText)}" title="Send 500 UGX pass offer to this viewer">🔥 Send 500 UGX Offer</button>
                          <button type="button" class="btn sm" data-msg-type="\${h.userId ? 'user' : 'visitor'}" data-msg-id="\${esc(h.userId || h.visitorId)}" data-msg-name="\${esc(h.userName)}" title="Send custom message">💬 Message</button>
                        </div>
                      </td>
                    </tr>
                  \`;
                }).join('') : \`<tr><td colspan="7" class="empty-row">No paywall leads found matching criteria.</td></tr>\`}
              </tbody>
            </table>
          </div>
        </section>
      \`;
    }

    function installsSectionHtml(d) {
      let list = d.installedUsers || [];
      if (installFilter === 'vip') list = list.filter(u => u.hasActivePass);
      else if (installFilter === 'free') list = list.filter(u => !u.hasActivePass);
      else if (installFilter === 'tv') list = list.filter(u => String(u.deviceType || '').toLowerCase().includes('tv'));

      if (installQuery.trim()) {
        const q = installQuery.trim().toLowerCase();
        list = list.filter(u => \`\${u.userName || ''} \${u.userEmail || ''} \${u.phone || ''} \${u.deviceType || ''} \${u.os || ''} \${u.visitorId || ''}\`.toLowerCase().includes(q));
      }

      const totalInstalls = d.installedUsers?.length || 0;
      const tvInstalls = (d.installedUsers || []).filter(u => String(u.deviceType || '').toLowerCase().includes('tv')).length;

      return \`
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2>📱 Devices with Avioc Cinema Installed (\${fmtNum(totalInstalls)})</h2>
              <small>Users who added the app to their Android Phone, Smart TV, or PC home screen via PWA or APK</small>
            </div>
            <div style="display:flex;gap:6px">
              <span class="tag green">📱 \${fmtNum(totalInstalls)} Total Installed</span>
              <span class="tag blue">📺 \${fmtNum(tvInstalls)} Smart TVs</span>
            </div>
          </div>
          <div class="toolbar">
            <input type="search" class="search-in" id="install-search-in" placeholder="Search by user, email, phone, OS, device, or visitor ID…" value="\${esc(installQuery)}">
            <button type="button" class="pill-filter \${installFilter === 'all' ? 'active' : ''}" data-install-filter="all">All Installs (\${totalInstalls})</button>
            <button type="button" class="pill-filter \${installFilter === 'vip' ? 'active' : ''}" data-install-filter="vip">👑 VIP Active (\${(d.installedUsers || []).filter(u => u.hasActivePass).length})</button>
            <button type="button" class="pill-filter \${installFilter === 'free' ? 'active' : ''}" data-install-filter="free">🆓 Free / Trial (\${(d.installedUsers || []).filter(u => !u.hasActivePass).length})</button>
            <button type="button" class="pill-filter \${installFilter === 'tv' ? 'active' : ''}" data-install-filter="tv">📺 Smart TVs (\${tvInstalls})</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Installed Device / User</th>
                  <th>Device &amp; OS</th>
                  <th>App Opens (Day 1 to Now)</th>
                  <th>Watch Time</th>
                  <th>Pass Status</th>
                  <th>Installed Date / Last Seen</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                \${list.length ? list.map((u) => {
                  const offerText = \`Hey! Exclusive offer for our App Users: Get 24 Hours Unlimited VIP Access for only 500 UGX! Tap below to claim.\`;
                  return \`
                    <tr>
                      <td>
                        <div class="user-meta">
                          <b>\${esc(u.userName || 'Installed Device')}</b>
                          <small>\${esc(u.userEmail || u.visitorId)}\${u.phone ? \` · 📞 \${esc(u.phone)}\` : ''}</small>
                        </div>
                      </td>
                      <td>
                        <b>\${esc(u.deviceType || 'Device')}</b>
                        <small style="display:block;color:var(--muted)">\${esc(u.os || '')} · \${esc(u.browser || '')} · 📱 App</small>
                      </td>
                      <td>
                        <b>\${fmtNum(u.openCount || 1)} opens</b>
                        <small style="display:block;color:var(--muted)">First opened: \${fmtDate(u.firstSeen)}</small>
                      </td>
                      <td>
                        <span class="tag green">\${fmtDuration(u.watchSeconds || 0)}</span>
                      </td>
                      <td>
                        \${u.hasActivePass
                          ? '<span class="tag gold">👑 VIP Active</span>'
                          : \`<span class="tag blue">\${esc(u.passMode || '3h Free Trial')}</span>\`}
                      </td>
                      <td>
                        <small style="display:block">Installed: \${fmtDate(u.installedAt || u.firstSeen)}</small>
                        <small style="color:var(--muted)">Active: \${timeAgo(u.lastSeen)}</small>
                      </td>
                      <td>
                        <div style="display:flex;gap:6px;flex-wrap:wrap">
                          <button type="button" class="btn sm gold" data-msg-type="\${u.userId ? 'user' : 'visitor'}" data-msg-id="\${esc(u.userId || u.visitorId)}" data-msg-name="\${esc(u.userName)}" data-offer-plan="offer-500" data-offer-price="500" data-offer-text="\${esc(offerText)}" title="Send 500 UGX offer">🔥 Send Offer</button>
                          <button type="button" class="btn sm" data-msg-type="\${u.userId ? 'user' : 'visitor'}" data-msg-id="\${esc(u.userId || u.visitorId)}" data-msg-name="\${esc(u.userName)}" title="Send message to installed app">💬 Message</button>
                        </div>
                      </td>
                    </tr>
                  \`;
                }).join('') : \`<tr><td colspan="7" class="empty-row">No installed app devices found matching criteria.</td></tr>\`}
              </tbody>
            </table>
          </div>
        </section>
      \`;
    }`;

if (!content.includes('function paywallSectionHtml')) {
  content = content.replace('function membersSectionHtml', `${sectionsCode}\n\n    function membersSectionHtml`);
}

// 7. Update membersSectionHtml with App Opens column, paywall badge, and filter
const oldMembersThead = `<th>Total Paid</th>
                  <th>Watch Time &amp; Device</th>
                  <th>Joined / Last Active</th>
                  <th>Admin Actions</th>`;

const newMembersThead = `<th>Total Paid</th>
                  <th>App Opens (Day 1 to Now)</th>
                  <th>Watch Time &amp; Device</th>
                  <th>Joined / Last Active</th>
                  <th>Admin Actions</th>`;

if (!content.includes('<th>App Opens (Day 1 to Now)</th>')) {
  content = content.replace(oldMembersThead, newMembersThead);
}

// In members rows, add the app opens cell and paywall badge
const oldMemberRowTd = `<td>
                        <b>\${fmtDuration(m.watchSeconds)}</b>
                        <small style="display:block;color:var(--muted)">\${esc(m.deviceType || '—')}\${m.currentActivity ? \` · \${esc(m.currentActivity)}\` : ''}</small>
                      </td>`;

const newMemberRowTd = `<td>
                        <b>\${fmtNum(m.openCount || m.visit_count || 1)} opens</b>
                        <small style="display:block;color:var(--muted)">Since: \${fmtDate(m.firstSeen || m.createdAt)}</small>
                      </td>
                      <td>
                        <b>\${fmtDuration(m.watchSeconds)}</b>
                        <small style="display:block;color:var(--muted)">\${esc(m.deviceType || '—')}\${m.currentActivity ? \` · \${esc(m.currentActivity)}\` : ''}</small>
                      </td>`;

if (!content.includes('<b>${fmtNum(m.openCount || m.visit_count || 1)} opens</b>')) {
  content = content.replace(oldMemberRowTd, newMemberRowTd);
}

// In members pass status column, show paywall hit badge if applicable
const oldMemberPassTag = `m.subscriptionExpiresAt
                            ? '<span class="tag red">⌛ Pass Expired</span>'
                            : '<span class="tag muted">Standard Member</span>'`;

const newMemberPassTag = `m.subscriptionExpiresAt
                            ? '<span class="tag red">⌛ Pass Expired</span>'
                            : (m.lastPaywallHit ? '<span class="tag red">⛔ Hit Paywall</span>' : '<span class="tag muted">Standard Member</span>')`;

content = content.replace(oldMemberPassTag, newMemberPassTag);

// In members actions, add Send Offer button
const oldMemberActions = `<button type="button" class="btn sm" data-msg-type="user" data-msg-id="\${m.id}" data-msg-name="\${esc(m.displayName)}" title="Send Direct Message to member">💬 Message</button>`;
const newMemberActions = `<button type="button" class="btn sm gold" data-msg-type="user" data-msg-id="\${m.id}" data-msg-name="\${esc(m.displayName)}" data-offer-plan="offer-500" data-offer-price="500" data-offer-text="Hey \${esc(m.displayName)}! Special VIP Offer: Get 24 Hours Unlimited VIP Access for only 500 UGX! Tap below to claim now." title="Send 500 UGX offer">🔥 Send Offer</button>
                          <button type="button" class="btn sm" data-msg-type="user" data-msg-id="\${m.id}" data-msg-name="\${esc(m.displayName)}" title="Send Direct Message to member">💬 Message</button>`;

if (!content.includes('data-offer-plan="offer-500" data-offer-price="500" data-offer-text="Hey ${esc(m.displayName)}')) {
  content = content.replace(oldMemberActions, newMemberActions);
}

// 8. Update visitorsSectionHtml Visits header and cell to App Opens
const oldVisitorHead = `<th>Visits</th>
                    <th>Watch Time</th>`;
const newVisitorHead = `<th>App Opens (Day 1 to Now)</th>
                    <th>Watch Time</th>`;

if (!content.includes('<th>App Opens (Day 1 to Now)</th>')) {
  content = content.replace(oldVisitorHead, newVisitorHead);
}

const oldVisitorCell = `<td><b>\${fmtNum(v.visit_count || 1)}</b></td>`;
const newVisitorCell = `<td>
                        <b>\${fmtNum(v.open_count || v.visit_count || 1)} opens</b>
                        <small style="display:block;color:var(--muted)">First: \${fmtDate(v.first_seen || v.created_at)}</small>
                      </td>`;

if (!content.includes('<b>${fmtNum(v.open_count || v.visit_count || 1)} opens</b>')) {
  content = content.replace(oldVisitorCell, newVisitorCell);
}

// In visitors pass status column, show paywall tag if applicable
const oldVisitorPass = `<span class="tag blue">\${esc(v.pass_mode || '3h Free Trial')}</span>`;
const newVisitorPass = `\${v.last_paywall_hit ? '<span class="tag red">⛔ Hit Paywall</span>' : \`<span class="tag blue">\${esc(v.pass_mode || '3h Free Trial')}</span>\`}`;

content = content.replace(oldVisitorPass, newVisitorPass);

// In visitors actions, add Send Offer button
const oldVisitorAction = `<button type="button" class="btn sm gold" data-msg-type="\${v.user_id ? 'user' : 'visitor'}" data-msg-id="\${esc(v.user_id || v.visitor_id)}" data-msg-name="\${esc(v.user_name || (v.user_email ? v.user_email.split('@')[0] : 'Guest Visitor'))}" title="Send Message to this visitor">💬 Message</button>`;
const newVisitorAction = `<button type="button" class="btn sm gold" data-msg-type="\${v.user_id ? 'user' : 'visitor'}" data-msg-id="\${esc(v.user_id || v.visitor_id)}" data-msg-name="\${esc(v.user_name || (v.user_email ? v.user_email.split('@')[0] : 'Guest Visitor'))}" data-offer-plan="offer-500" data-offer-price="500" data-offer-text="Hey! Unlock unlimited VIP access to all translated movies, series & Live TV for only 500 UGX! Tap below to claim now." title="Send 500 UGX Offer">🔥 Send Offer</button>
                        <button type="button" class="btn sm" data-msg-type="\${v.user_id ? 'user' : 'visitor'}" data-msg-id="\${esc(v.user_id || v.visitor_id)}" data-msg-name="\${esc(v.user_name || (v.user_email ? v.user_email.split('@')[0] : 'Guest Visitor'))}" title="Send Message to this visitor">💬 Message</button>`;

if (!content.includes('data-offer-plan="offer-500" data-offer-price="500" data-offer-text="Hey! Unlock unlimited VIP')) {
  content = content.replace(oldVisitorAction, newVisitorAction);
}

// 9. In renderCurrentTab, add paywall and installs tab renderers
const tabRenderTarget = `} else if (currentTab === 'live') {`;
const tabRenderReplacement = `} else if (currentTab === 'paywall') {
        root.innerHTML = \`
          \${paywallSectionHtml(dashData)}
          \${kpiCardsHtml(dashData)}
        \`;
      } else if (currentTab === 'installs') {
        root.innerHTML = \`
          \${installsSectionHtml(dashData)}
          \${kpiCardsHtml(dashData)}
        \`;
      } else if (currentTab === 'live') {`;

if (!content.includes("} else if (currentTab === 'paywall') {")) {
  content = content.replace(tabRenderTarget, tabRenderReplacement);
}

// 10. In overview tab, also include paywall leads preview
const overviewRenderTarget = `\${liveSessionsPanelHtml(dashData, 10)}
          \${requestsSectionHtml(dashData)}`;
const overviewRenderReplacement = `\${liveSessionsPanelHtml(dashData, 10)}
          \${paywallSectionHtml(dashData)}
          \${requestsSectionHtml(dashData)}`;

if (!content.includes('${paywallSectionHtml(dashData)}\n          ${requestsSectionHtml(dashData)}')) {
  content = content.replace(overviewRenderTarget, overviewRenderReplacement);
}

// 11. Event listeners for paywall and install filters and searches
const filterListenerAnchor = `const mFilter = ev.target.closest('[data-member-filter]');`;
const filterListenerAdd = `const pwFilter = ev.target.closest('[data-paywall-filter]');
      if (pwFilter) {
        paywallFilter = pwFilter.dataset.paywallFilter;
        renderCurrentTab();
        return;
      }

      const insFilter = ev.target.closest('[data-install-filter]');
      if (insFilter) {
        installFilter = insFilter.dataset.installFilter;
        renderCurrentTab();
        return;
      }

      const mFilter = ev.target.closest('[data-member-filter]');`;

if (!content.includes('data-paywall-filter')) {
  content = content.replace(filterListenerAnchor, filterListenerAdd);
}

// Input listeners for search
const searchInputAnchor = `document.addEventListener('input', (ev) => {
      if (ev.target && ev.target.id === 'member-search-in') {
        memberQuery = ev.target.value;
        renderCurrentTab();
      }`;

const searchInputAdd = `document.addEventListener('input', (ev) => {
      if (ev.target && ev.target.id === 'paywall-search-in') {
        paywallQuery = ev.target.value;
        renderCurrentTab();
      }
      if (ev.target && ev.target.id === 'install-search-in') {
        installQuery = ev.target.value;
        renderCurrentTab();
      }
      if (ev.target && ev.target.id === 'member-search-in') {
        memberQuery = ev.target.value;
        renderCurrentTab();
      }`;

if (!content.includes('paywall-search-in')) {
  content = content.replace(searchInputAnchor, searchInputAdd);
}

fs.writeFileSync(adminPath, content, 'utf8');
console.log('Successfully patched admin/index.html with Paywall Leads & App Installs tabs');
