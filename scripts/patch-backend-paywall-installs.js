const fs = require('fs');

const serverFile = 'backend/server.js';
let content = fs.readFileSync(serverFile, 'utf8');

// 1. Declare let paywallHits;
if (!content.includes('let paywallHits;')) {
  content = content.replace('let shareReferrals;', 'let shareReferrals;\nlet paywallHits;');
}

// 2. In ensureSchema(), initialize paywallHits and create indexes
const schemaTarget = `  adminMessages = db.collection('admin_messages');
  shareReferrals = db.collection('share_referrals');`;

const schemaReplacement = `  adminMessages = db.collection('admin_messages');
  shareReferrals = db.collection('share_referrals');
  paywallHits = db.collection('paywall_hits');`;

if (!content.includes("paywallHits = db.collection('paywall_hits');")) {
  content = content.replace(schemaTarget, schemaReplacement);
}

const indexTarget = `    adminMessages.createIndex({ target_id: 1, status: 1 }),
    adminMessages.createIndex({ target_type: 1, status: 1 }),
    adminMessages.createIndex({ created_at: -1 }),`;

const indexReplacement = `    adminMessages.createIndex({ target_id: 1, status: 1 }),
    adminMessages.createIndex({ target_type: 1, status: 1 }),
    adminMessages.createIndex({ created_at: -1 }),
    paywallHits.createIndex({ visitor_id: 1 }),
    paywallHits.createIndex({ user_id: 1 }),
    paywallHits.createIndex({ hit_at: -1 }),`;

if (!content.includes('paywallHits.createIndex({ hit_at: -1 })')) {
  content = content.replace(indexTarget, indexReplacement);
}

// 3. In /api/analytics/event, update visitorInc & visitorSet and save paywall hit doc
const eventTarget = `    if (eventType === 'visit') visitorInc.visit_count = 1;
    if (watchSec > 0) visitorInc.watch_seconds = watchSec;
    if (eventType === 'share') visitorInc.shares = 1;`;

const eventReplacement = `    if (eventType === 'visit' || eventType === 'app_open') {
      visitorInc.visit_count = 1;
      visitorInc.open_count = 1;
    }
    if (watchSec > 0) visitorInc.watch_seconds = watchSec;
    if (eventType === 'share') visitorInc.shares = 1;
    if (eventType === 'pwa_install' || isPwa) {
      visitorSet.is_pwa = true;
      visitorSet.installed_at = now;
      if (userId) {
        users.updateOne({ id: userId }, { $set: { is_pwa: true, installed_at: now } }).catch(() => {});
      }
    }
    if (eventType === 'paywall_hit') {
      visitorSet.last_paywall_hit = now;
      visitorSet.paywall_item = itemTitle || itemId || 'VIP Pass Prompt';
      visitorInc.paywall_hits_count = 1;
      paywallHits.insertOne({
        visitor_id: visitorId,
        user_id: userId || null,
        user_email: userEmail || null,
        user_name: userName || (userEmail ? userEmail.split('@')[0] : 'Guest Visitor'),
        item_id: itemId || null,
        item_title: itemTitle || 'VIP Pass Prompt',
        item_type: itemType || 'film',
        vj: vj || null,
        device_type: deviceType,
        os: os,
        browser: browser,
        is_pwa: isPwa,
        watch_seconds: watchSec || 0,
        open_count: Number(body.openCount) || 1,
        first_seen: prevSession?.startedAt || now,
        hit_at: now,
        status: 'pending_offer',
        created_at: now
      }).catch(err => console.warn('paywallHits insert error:', err.message));

      if (userId) {
        users.updateOne({ id: userId }, {
          $set: { last_paywall_hit: now, paywall_item: itemTitle || 'VIP Pass Prompt', updated_at: now },
          $inc: { paywall_hits_count: 1 }
        }).catch(() => {});
      }
    }`;

if (!content.includes('paywallHits.insertOne({')) {
  content = content.replace(eventTarget, eventReplacement);
}

// 4. In /api/analytics/sync-browser, handle openCount, isAppOpen, hitPaywall & isPwa
const syncTarget = `    const watchSecondsUsed = Math.max(0, Number(body.watchSecondsUsed) || 0);
    const activity = String(body.activity || 'Browsing Home').slice(0, 140);
    const hasActivePass = Boolean(body.hasActivePass);
    const passMode = String(body.passMode || (hasActivePass ? 'VIP Pass' : '3h Free Trial')).slice(0, 40);`;

const syncReplacement = `    const watchSecondsUsed = Math.max(0, Number(body.watchSecondsUsed) || 0);
    const activity = String(body.activity || 'Browsing Home').slice(0, 140);
    const hasActivePass = Boolean(body.hasActivePass);
    const passMode = String(body.passMode || (hasActivePass ? 'VIP Pass' : '3h Free Trial')).slice(0, 40);
    const openCount = Math.max(1, Number(body.openCount) || Number(body.visitCount) || 1);
    const isAppOpen = Boolean(body.isAppOpen);
    const hasHitPaywall = Boolean(body.hitPaywall || passMode.includes('Exhausted') || body.freeRemainingSec === 0);
    const isPwa = Boolean(body.isPwa);`;

if (!content.includes('const hasHitPaywall = Boolean(body.hitPaywall')) {
  content = content.replace(syncTarget, syncReplacement);
}

const syncVisitorUpdateTarget = `    await visitors.updateOne(
      { visitor_id: visitorId },
      {
        $set: {
          last_seen: now,
          device_type: uaInfo.deviceType,
          os: uaInfo.os,
          browser: uaInfo.browser,
          is_pwa: Boolean(body.isPwa),
          pass_mode: passMode,
          has_active_pass: hasActivePass,
          current_activity: activity,
          watch_seconds: totalVisWatch,
          synced_item_ids: newSyncedIds.slice(-300),
          ...(user?.id ? { user_id: user.id } : {}),
          ...(user?.email ? { user_email: user.email } : {}),
          ...(user?.displayName ? { user_name: user.displayName } : {})
        },
        $setOnInsert: {
          visitor_id: visitorId,
          first_seen: now,
          visit_count: 1,
          referrer: 'Direct'
        }
      },
      { upsert: true }
    );`;

const syncVisitorUpdateReplacement = `    const visSetObj = {
      last_seen: now,
      device_type: uaInfo.deviceType,
      os: uaInfo.os,
      browser: uaInfo.browser,
      is_pwa: isPwa || Boolean(existingVisitor?.is_pwa),
      pass_mode: passMode,
      has_active_pass: hasActivePass,
      current_activity: activity,
      watch_seconds: totalVisWatch,
      open_count: Math.max(existingVisitor?.open_count || 1, openCount),
      synced_item_ids: newSyncedIds.slice(-300),
      ...(user?.id ? { user_id: user.id } : {}),
      ...(user?.email ? { user_email: user.email } : {}),
      ...(user?.displayName ? { user_name: user.displayName } : {})
    };
    if (hasHitPaywall) {
      visSetObj.last_paywall_hit = now;
      visSetObj.paywall_item = body.itemTitle || body.itemId || 'VIP Pass Prompt';
    }
    const visIncObj = {};
    if (isAppOpen) {
      visIncObj.visit_count = 1;
      visIncObj.open_count = 1;
    }

    await visitors.updateOne(
      { visitor_id: visitorId },
      {
        $set: visSetObj,
        ...(Object.keys(visIncObj).length ? { $inc: visIncObj } : {}),
        $setOnInsert: {
          visitor_id: visitorId,
          first_seen: body.firstOpenDate ? new Date(body.firstOpenDate) : now,
          visit_count: 1,
          open_count: openCount,
          referrer: 'Direct'
        }
      },
      { upsert: true }
    );

    if (user?.id) {
      const userUpdateSet = {
        last_seen: now,
        updated_at: now,
        ...(hasHitPaywall ? { last_paywall_hit: now, paywall_item: body.itemTitle || 'VIP Pass Prompt' } : {}),
        ...(isPwa ? { is_pwa: true, installed_at: now } : {})
      };
      users.updateOne(
        { id: user.id },
        {
          $set: userUpdateSet,
          $max: { open_count: openCount },
          ...(isAppOpen ? { $inc: { visit_count: 1, open_count: 1 } } : {})
        }
      ).catch(() => {});
    }

    if (hasHitPaywall) {
      paywallHits.updateOne(
        { visitor_id: visitorId, hit_at: { $gte: new Date(Date.now() - 30 * 60 * 1000) } },
        {
          $setOnInsert: {
            visitor_id: visitorId,
            user_id: user?.id || null,
            user_email: user?.email || null,
            user_name: user?.displayName || (user?.email ? user.email.split('@')[0] : 'Guest Visitor'),
            item_id: body.itemId || null,
            item_title: body.itemTitle || 'VIP Pass Prompt',
            item_type: body.itemType || 'film',
            vj: body.vj || null,
            device_type: uaInfo.deviceType,
            os: uaInfo.os,
            browser: uaInfo.browser,
            is_pwa: isPwa,
            watch_seconds: totalVisWatch,
            open_count: openCount,
            first_seen: existingVisitor?.first_seen || (body.firstOpenDate ? new Date(body.firstOpenDate) : now),
            hit_at: now,
            status: 'pending_offer',
            created_at: now
          }
        },
        { upsert: true }
      ).catch(() => {});
    }`;

if (!content.includes('visSetObj.open_count = Math.max')) {
  content = content.replace(syncVisitorUpdateTarget, syncVisitorUpdateReplacement);
}

// 5. In /api/admin/dashboard, query paywallHits and installed users, and map fields
const dashQueryTarget = `      adminMessages.find({}).sort({ created_at: -1 }).limit(100).toArray(),
      analyticsEvents.find({ type: 'search' }).sort({ created_at: -1 }).limit(100).toArray(),
      shareReferrals.find({}).sort({ visitors_count: -1, last_visit_at: -1 }).limit(100).toArray()
    ]);`;

const dashQueryReplacement = `      adminMessages.find({}).sort({ created_at: -1 }).limit(100).toArray(),
      analyticsEvents.find({ type: 'search' }).sort({ created_at: -1 }).limit(100).toArray(),
      shareReferrals.find({}).sort({ visitors_count: -1, last_visit_at: -1 }).limit(100).toArray(),
      paywallHits.find({}).sort({ hit_at: -1 }).limit(120).toArray(),
      visitors.find({ is_pwa: true }).sort({ last_seen: -1 }).limit(120).toArray()
    ]);`;

if (!content.includes('paywallHits.find({}).sort({ hit_at: -1 })')) {
  content = content.replace(dashQueryTarget, dashQueryReplacement);
}

// Update the Promise.all destructuring array to include allPaywallHits and allInstalledVisitors
const destructureTarget = `      allAdminMessages,
      allRecentSearches,
      allShareReferrals
    ] = await Promise.all([`;

const destructureReplacement = `      allAdminMessages,
      allRecentSearches,
      allShareReferrals,
      allPaywallHits,
      allInstalledVisitors
    ] = await Promise.all([`;

if (!content.includes('allPaywallHits,')) {
  content = content.replace(destructureTarget, destructureReplacement);
}

// Map openCount, firstSeen, lastPaywallHit, isPwa on members
const memberMapTarget = `        grantedByAdmin: Boolean(sub?.granted_by_admin),
        lastPlanId: lastSuccess?.plan_id || sub?.plan_id || payInfo?.lastPayment?.plan_id || null,`;

const memberMapReplacement = `        grantedByAdmin: Boolean(sub?.granted_by_admin),
        openCount: u.open_count || vis?.open_count || vis?.visit_count || u.visit_count || 1,
        firstSeen: u.first_seen || vis?.first_seen || u.created_at,
        isPwa: Boolean(u.is_pwa || vis?.is_pwa),
        installedAt: u.installed_at || vis?.installed_at || null,
        lastPaywallHit: u.last_paywall_hit || vis?.last_paywall_hit || null,
        paywallItem: u.paywall_item || vis?.paywall_item || null,
        paywallHitsCount: u.paywall_hits_count || vis?.paywall_hits_count || 0,
        lastPlanId: lastSuccess?.plan_id || sub?.plan_id || payInfo?.lastPayment?.plan_id || null,`;

if (!content.includes('firstSeen: u.first_seen || vis?.first_seen || u.created_at')) {
  content = content.replace(memberMapTarget, memberMapReplacement);
}

// Format paywallHits and installedUsers in dashboard return object
const dashReturnTarget = `      recentVisitors: recentVisitors.slice(0, 100),
      recentActivity: recentEvents.slice(0, 80)
    });`;

const dashReturnReplacement = `      recentVisitors: recentVisitors.slice(0, 100).map(v => ({
        ...v,
        open_count: v.open_count || v.visit_count || 1,
        first_seen: v.first_seen || v.created_at
      })),
      recentActivity: recentEvents.slice(0, 80),
      paywallHits: (allPaywallHits || []).map(h => {
        const u = h.user_id ? allUsers.find(user => user.id === h.user_id) : null;
        const sub = h.user_id ? subByUser.get(h.user_id) : null;
        const expiresAt = sub?.expires_at ? new Date(sub.expires_at) : null;
        const hasActivePass = Boolean(expiresAt && expiresAt > now);
        const pay = (h.user_id ? paymentsByUser.get(h.user_id) : null);
        const vis = visitorByUser.get(h.user_id) || (h.visitor_id ? recentVisitors.find(v => v.visitor_id === h.visitor_id) : null);
        return {
          id: String(h._id || h.id || ''),
          visitorId: h.visitor_id,
          userId: h.user_id || null,
          userEmail: h.user_email || u?.email || null,
          userName: h.user_name || u?.display_name || (h.user_email ? h.user_email.split('@')[0] : 'Guest Viewer'),
          phone: pay?.lastSuccessPayment?.phone_number || pay?.lastPayment?.phone_number || null,
          itemId: h.item_id || null,
          itemTitle: h.item_title || 'VIP Pass Prompt',
          itemType: h.item_type || 'film',
          vj: h.vj || null,
          deviceType: h.device_type || 'Mobile',
          os: h.os || 'Android',
          browser: h.browser || 'Chrome',
          isPwa: Boolean(h.is_pwa || vis?.is_pwa),
          watchSeconds: h.watch_seconds || vis?.watch_seconds || 0,
          openCount: h.open_count || vis?.open_count || vis?.visit_count || u?.open_count || 1,
          firstSeen: h.first_seen || vis?.first_seen || u?.created_at || h.hit_at,
          hitAt: h.hit_at || h.created_at,
          hasActivePass
        };
      }),
      installedUsers: (allInstalledVisitors || []).map(v => {
        const u = v.user_id ? allUsers.find(user => user.id === v.user_id) : null;
        const sub = v.user_id ? subByUser.get(v.user_id) : null;
        const expiresAt = sub?.expires_at ? new Date(sub.expires_at) : null;
        const hasActivePass = Boolean(expiresAt && expiresAt > now);
        const pay = v.user_id ? paymentsByUser.get(v.user_id) : null;
        return {
          visitorId: v.visitor_id,
          userId: v.user_id || null,
          userEmail: v.user_email || u?.email || null,
          userName: v.user_name || u?.display_name || (v.user_email ? v.user_email.split('@')[0] : 'Installed Device'),
          phone: pay?.lastSuccessPayment?.phone_number || pay?.lastPayment?.phone_number || null,
          deviceType: v.device_type || 'Mobile',
          os: v.os || 'Android',
          browser: v.browser || 'Chrome',
          isPwa: true,
          installedAt: v.installed_at || v.last_seen || v.first_seen,
          firstSeen: v.first_seen || v.created_at,
          lastSeen: v.last_seen,
          openCount: v.open_count || v.visit_count || 1,
          watchSeconds: v.watch_seconds || 0,
          passMode: v.pass_mode || (hasActivePass ? 'VIP Pass' : '3h Free Trial'),
          hasActivePass
        };
      }),
      overview: {
        ...overview,
        totalPaywallHits: (allPaywallHits || []).length,
        totalAppInstalls: (allInstalledVisitors || []).length
      }
    });`;

if (!content.includes('installedUsers: (allInstalledVisitors || []).map')) {
  content = content.replace(dashReturnTarget, dashReturnReplacement);
}

fs.writeFileSync(serverFile, content, 'utf8');
console.log('Successfully patched backend/server.js');
