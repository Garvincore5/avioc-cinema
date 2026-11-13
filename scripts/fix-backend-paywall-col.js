const fs = require('fs');

const serverFile = 'backend/server.js';
let content = fs.readFileSync(serverFile, 'utf8');

// 1. Rename module-level variable
content = content.replace('let paywallHits;', 'let paywallHitsCol;');

// 2. Rename in ensureSchema()
content = content.replace("paywallHits = db.collection('paywall_hits');", "paywallHitsCol = db.collection('paywall_hits');");
content = content.replace(/paywallHits\.createIndex/g, 'paywallHitsCol.createIndex');

// 3. Rename insert and update in events / sync
content = content.replace(/paywallHits\.insertOne/g, 'paywallHitsCol.insertOne');
content = content.replace(/paywallHits\.updateOne/g, 'paywallHitsCol.updateOne');

// 4. Rename in dashboard Promise.all
content = content.replace('paywallHits.find({}).sort({ hit_at: -1 })', 'paywallHitsCol.find({}).sort({ hit_at: -1 })');
content = content.replace(
  'visitors.find({ is_pwa: true }).sort({ last_seen: -1 }).limit(120).toArray()',
  "visitors.find({ $or: [{ is_pwa: true }, { is_pwa: 'true' }, { pwa_installs: { $gt: 0 } }] }).sort({ last_seen: -1 }).limit(120).toArray()"
);

// 5. In dashboard local counter loop:
// Rename let paywallHits = 0 to let counterPaywallHits = 0
content = content.replace('let paywallHits = 0;\n    let pwaInstalls = 0;', 'let counterPaywallHits = 0;\n    let pwaInstalls = 0;');
content = content.replace('paywallHits += Number(d.paywall_hits) || 0;', 'counterPaywallHits += Number(d.paywall_hits) || 0;');
content = content.replace('paywallHits,\n        pwaInstalls', 'paywallHits: counterPaywallHits,\n        pwaInstalls');

// 6. Ensure error handling inside dashboard won't hide stack trace in console
content = content.replace(
  "  } catch (error) {\n    res.status(500).json(publicError(error));\n  }",
  "  } catch (error) {\n    console.error('DASHBOARD ERROR:', error.stack || error.message);\n    res.status(500).json({ error: error.message || 'Dashboard failed' });\n  }"
);

fs.writeFileSync(serverFile, content, 'utf8');
console.log('Successfully patched backend/server.js');
