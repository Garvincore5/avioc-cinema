const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const adminHtmlPath = path.join(root, 'admin', 'index.html');
let adminHtml = fs.readFileSync(adminHtmlPath, 'utf8');

// 1. Load catalog-data.json
const catalogRaw = JSON.parse(fs.readFileSync(path.join(root, 'catalog-data.json'), 'utf8'));
const minimalCatalog = catalogRaw.map(t => ({
  id: t.id,
  title: t.title,
  type: t.type || 'film',
  vj: t.vj || '',
  year: t.year || 2026,
  poster: t.poster || t.backdrop || '',
  streamUrl: t.streamUrl || ''
}));

console.log(`Loaded ${minimalCatalog.length} catalog items for inline injection.`);

// 2. Replace INLINE_CATALOG
const inlineCatalogRegex = /const INLINE_CATALOG = \[[^;]+\];/;
if (!inlineCatalogRegex.test(adminHtml)) {
  console.error('Error: INLINE_CATALOG regex match failed');
  process.exit(1);
}
adminHtml = adminHtml.replace(inlineCatalogRegex, `const INLINE_CATALOG = ${JSON.stringify(minimalCatalog)};`);

// 3. Replace loadCatalogMetadata with robust multi-URL fallback
const targetLoadCatalog = `    async function loadCatalogMetadata() {
      try {
        let res = await fetch('https://avioc-cinema.web.app/catalog-data.json?v=' + Date.now());
        if (!res.ok) res = await fetch('../catalog-data.json?v=' + Date.now());
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
    }`;

const replaceLoadCatalog = `    async function loadCatalogMetadata() {
      const urls = [
        'https://aviocwatch.b-cdn.net/catalog-data.json?v=' + Date.now(),
        'https://avioc-cinema.web.app/catalog-data.json?v=' + Date.now(),
        '../catalog-data.json?v=' + Date.now(),
        '/catalog-data.json?v=' + Date.now()
      ];
      for (const u of urls) {
        try {
          const res = await fetch(u);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length) {
              catalogItems = data.map((t) => ({
                id: t.id,
                title: t.title,
                type: t.type || 'film',
                vj: fmtVj(t.vj),
                year: t.year || 2026,
                poster: t.poster || t.backdrop || '',
                streamUrl: t.streamUrl || ''
              }));
              catalogById.clear();
              catalogItems.forEach((item) => catalogById.set(item.id, item));
              TV_CHANNELS.forEach((ch) => catalogById.set(ch.id, ch));
              renderCurrentTab();
              return;
            }
          }
        } catch {}
      }
    }`;

if (adminHtml.includes(targetLoadCatalog)) {
  adminHtml = adminHtml.replace(targetLoadCatalog, replaceLoadCatalog);
  console.log('Replaced loadCatalogMetadata.');
} else {
  console.warn('targetLoadCatalog exact match not found; checking with regex...');
  const loadCatRegex = /async function loadCatalogMetadata\(\) \{[\s\S]*?TV_CHANNELS\.forEach\(\(ch\) => catalogById\.set\(ch\.id, ch\)\);\s*return;\s*\}\s*\}\s*\}\s*catch\s*\{\}\s*\}/;
  if (loadCatRegex.test(adminHtml)) {
    adminHtml = adminHtml.replace(loadCatRegex, replaceLoadCatalog.trim());
    console.log('Replaced loadCatalogMetadata via regex.');
  } else {
    console.error('Could not find loadCatalogMetadata in admin/index.html');
    process.exit(1);
  }
}

// 4. Update searchesSectionHtml to add delete buttons and Clear All button
// In panel head of "Who Searched What", add "Clear All Searches" button
const targetStreamHead = `<button type="button" class="btn sm ghost" id="btn-export-searches-stream">📥 Export CSV</button>`;
const replaceStreamHead = `<button type="button" class="btn sm ghost" id="btn-export-searches-stream">📥 Export CSV</button>
              <button type="button" class="btn sm danger" id="btn-clear-all-searches" title="Wipe all viewer search history and query logs">🗑️ Clear All Searches</button>`;

if (adminHtml.includes(targetStreamHead) && !adminHtml.includes('id="btn-clear-all-searches"')) {
  adminHtml = adminHtml.replace(targetStreamHead, replaceStreamHead);
  console.log('Added btn-clear-all-searches to searchesSectionHtml header.');
}

// In stream row action column, add delete button for individual search event
const targetStreamAction = `<td>
                        \${targetId ? \`
                          <button type="button" class="btn sm gold" data-msg-type="visitor" data-msg-id="\${esc(targetId)}" data-msg-name="\${esc(displayName)}">
                            💬 Message
                          </button>
                        \` : '<span style="color:var(--muted)">—</span>'}
                      </td>`;

const replaceStreamAction = `<td>
                        <div style="display:flex;gap:5px;align-items:center">
                          \${targetId ? \`
                            <button type="button" class="btn sm gold" data-msg-type="visitor" data-msg-id="\${esc(targetId)}" data-msg-name="\${esc(displayName)}" title="Message this viewer">
                              💬 Message
                            </button>
                          \` : ''}
                          <button type="button" class="btn sm danger" data-del-search-event="\${esc(s.id || s._id)}" title="Delete this search entry">🗑️</button>
                        </div>
                      </td>`;

if (adminHtml.includes(targetStreamAction)) {
  adminHtml = adminHtml.replace(targetStreamAction, replaceStreamAction);
  console.log('Added per-row delete button to viewer search stream.');
} else {
  console.warn('targetStreamAction exact match not found; checking regex...');
  const streamActionRegex = /<td>\s*\$\{targetId \? `\s*<button type="button" class="btn sm gold" data-msg-type="visitor"[\s\S]*?<\/td>/;
  if (streamActionRegex.test(adminHtml)) {
    adminHtml = adminHtml.replace(streamActionRegex, replaceStreamAction);
    console.log('Added per-row delete button to viewer search stream via regex.');
  }
}

// In Top Search Queries table, add Action column and delete button
const targetTopSearchesHead = `<thead>
                  <tr>
                    <th>#</th>
                    <th>Search Term</th>
                    <th>Times Searched</th>
                    <th>Matches Found</th>
                    <th>Last Searched</th>
                  </tr>
                </thead>`;

const replaceTopSearchesHead = `<thead>
                  <tr>
                    <th>#</th>
                    <th>Search Term</th>
                    <th>Times Searched</th>
                    <th>Matches Found</th>
                    <th>Last Searched</th>
                    <th>Action</th>
                  </tr>
                </thead>`;

if (adminHtml.includes(targetTopSearchesHead)) {
  adminHtml = adminHtml.replace(targetTopSearchesHead, replaceTopSearchesHead);
  console.log('Added Action header to Top Searches table.');
}

const targetTopSearchesRow = `<td>\${timeAgo(s.updated_at)}</td>
                    </tr>`;

const replaceTopSearchesRow = `<td>\${timeAgo(s.updated_at)}</td>
                      <td>
                        <button type="button" class="btn sm danger" data-del-search-query="\${esc(s.query || s.display_query)}" title="Delete keyword and search logs">🗑️ Delete</button>
                      </td>
                    </tr>`;

if (adminHtml.includes(targetTopSearchesRow)) {
  adminHtml = adminHtml.replace(targetTopSearchesRow, replaceTopSearchesRow);
  console.log('Added per-row delete button to Top Searches table.');
}

// 5. Update requestsSectionHtml to add Clear All buttons
const targetReqHeadButtons = `<button type="button" class="btn primary sm" data-msg-type="all" data-msg-id="all" data-msg-name="All Active Viewers">📢 Compose Notification / Message</button>
            </div>`;

const replaceReqHeadButtons = `<button type="button" class="btn primary sm" data-msg-type="all" data-msg-id="all" data-msg-name="All Active Viewers">📢 Compose Notification / Message</button>
              \${isSentTab
                ? (adminMsgs.length ? \`<button type="button" class="btn sm danger" id="btn-clear-all-sent-msgs" title="Delete all sent message records">🗑️ Clear All Sent (\${adminMsgs.length})</button>\` : '')
                : (allReqs.length ? \`<button type="button" class="btn sm danger" id="btn-clear-all-requests" title="Delete all viewer requests and messages">🗑️ Clear All Inbox (\${allReqs.length})</button>\` : '')
              }
            </div>`;

if (adminHtml.includes(targetReqHeadButtons) && !adminHtml.includes('id="btn-clear-all-requests"')) {
  adminHtml = adminHtml.replace(targetReqHeadButtons, replaceReqHeadButtons);
  console.log('Added Clear All buttons to requestsSectionHtml header.');
}

// 6. Update contentSectionHtml to allow searching movies, series AND live TV channels!
// Let's find contentSectionHtml definition
const targetContentSectionHead = `      // Merge play metrics with all catalog items for complete searchability
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
        : allCatalogList.sort((a, b) => (b.count - a.count) || (b.watch_seconds - a.watch_seconds));`;

const replaceContentSectionHead = `      // Merge play metrics with all catalog items AND TV channels for universal search
      const playStatById = new Map([...movies, ...topTv].map((m) => [m.item_id, m]));
      const allUnifiedCatalog = [
        ...catalogItems.map((m) => {
          const stat = playStatById.get(m.id);
          return {
            item_id: m.id,
            title: m.title,
            item_type: m.type || 'film',
            vj: m.vj,
            poster: m.poster,
            count: stat?.count || 0,
            watch_seconds: stat?.watch_seconds || 0
          };
        }),
        ...TV_CHANNELS.map((ch) => {
          const stat = playStatById.get(ch.id);
          return {
            item_id: ch.id,
            title: ch.title,
            item_type: 'tv',
            vj: ch.vj,
            poster: '',
            count: stat?.count || 0,
            watch_seconds: stat?.watch_seconds || 0
          };
        })
      ];

      const q = (contentCatalogQuery || '').trim().toLowerCase();
      const tokens = q ? q.split(/\\s+/).filter(Boolean) : [];
      const filteredMovies = tokens.length
        ? allUnifiedCatalog.filter((m) => {
            const text = \`\${m.title} \${m.vj} \${m.item_id} \${m.item_type}\`.toLowerCase();
            return tokens.every((tok) => text.includes(tok));
          })
        : allUnifiedCatalog.sort((a, b) => (b.count - a.count) || (b.watch_seconds - a.watch_seconds));`;

if (adminHtml.includes(targetContentSectionHead)) {
  adminHtml = adminHtml.replace(targetContentSectionHead, replaceContentSectionHead);
  console.log('Enhanced contentSectionHtml with universal movie + TV channel search.');
}

// Update catalog title header in contentSectionHtml
const targetContentHeader = `<h2>🎬 Movies &amp; Series Catalog (\${fmtNum(filteredMovies.length)} / \${fmtNum(catalogItems.length)} Titles)</h2>`;
const replaceContentHeader = `<h2>🎬 Movies, Series &amp; Live TV (\${fmtNum(filteredMovies.length)} / \${fmtNum(allUnifiedCatalog.length)} Total Titles)</h2>`;
if (adminHtml.includes(targetContentHeader)) {
  adminHtml = adminHtml.replace(targetContentHeader, replaceContentHeader);
  console.log('Updated contentSectionHtml title header.');
}

// 7. Add Click Event Handlers for delete search and delete messages in document.addEventListener('click')
const targetClickListenersStart = `      // Delete admin sent message
      const delAdminMsg = ev.target.closest('[data-del-admin-msg]');
      if (delAdminMsg) {`;

const replaceClickListenersStart = `      // Delete individual search event
      const delSearchEvent = ev.target.closest('[data-del-search-event]');
      if (delSearchEvent) {
        const id = delSearchEvent.dataset.delSearchEvent;
        if (!confirm('Delete this viewer search record?')) return;
        delSearchEvent.disabled = true;
        try {
          await adminApi('/api/admin/delete-search-event', {
            method: 'POST',
            body: JSON.stringify({ id })
          });
          toast('🗑️ Search record deleted.');
          if (dashData?.searches?.recentSearches) {
            dashData.searches.recentSearches = dashData.searches.recentSearches.filter(s => (s.id || s._id) !== id);
            renderCurrentTab();
          }
          await loadDashboard(true);
        } catch (err) {
          toast(\`⚠️ \${err.message}\`);
          delSearchEvent.disabled = false;
        }
        return;
      }

      // Delete search query keyword and its events
      const delSearchQuery = ev.target.closest('[data-del-search-query]');
      if (delSearchQuery) {
        const query = delSearchQuery.dataset.delSearchQuery;
        if (!confirm(\`Delete search keyword "\${query}" and all its logs?\`)) return;
        delSearchQuery.disabled = true;
        try {
          await adminApi('/api/admin/delete-search-query', {
            method: 'POST',
            body: JSON.stringify({ query })
          });
          toast(\`🗑️ Search keyword "\${query}" deleted.\`);
          await loadDashboard(true);
        } catch (err) {
          toast(\`⚠️ \${err.message}\`);
          delSearchQuery.disabled = false;
        }
        return;
      }

      // Clear all searches
      if (ev.target.closest('#btn-clear-all-searches')) {
        if (!confirm('Are you sure you want to delete ALL viewer searches and keyword logs? This cannot be undone.')) return;
        try {
          await adminApi('/api/admin/clear-all-searches', { method: 'POST' });
          try {
            const raw = localStorage.getItem('avioc:local_analytics');
            if (raw) {
              const obj = JSON.parse(raw);
              obj.searches = {};
              localStorage.setItem('avioc:local_analytics', JSON.stringify(obj));
            }
          } catch {}
          toast('🗑️ All search logs cleared.');
          await loadDashboard(true);
        } catch (err) {
          toast(\`⚠️ \${err.message}\`);
        }
        return;
      }

      // Clear all inbox requests / messages
      if (ev.target.closest('#btn-clear-all-requests')) {
        const filterType = requestFilter === 'all' ? 'all' : requestFilter;
        const promptMsg = filterType === 'message'
          ? 'Are you sure you want to delete ALL viewer messages in inbox?'
          : (filterType === 'movie'
              ? 'Are you sure you want to delete ALL movie requests in inbox?'
              : 'Are you sure you want to delete ALL viewer messages and requests in inbox?');
        if (!confirm(promptMsg)) return;
        try {
          await adminApi('/api/admin/clear-requests', {
            method: 'POST',
            body: JSON.stringify({ kind: filterType })
          });
          toast('🗑️ Inbox cleared.');
          await loadDashboard(true);
        } catch (err) {
          toast(\`⚠️ \${err.message}\`);
        }
        return;
      }

      // Clear all sent admin notifications / messages
      if (ev.target.closest('#btn-clear-all-sent-msgs')) {
        if (!confirm('Are you sure you want to delete ALL sent notification/message records?')) return;
        try {
          await adminApi('/api/admin/clear-all-admin-messages', { method: 'POST' });
          toast('🗑️ All sent messages cleared.');
          await loadDashboard(true);
        } catch (err) {
          toast(\`⚠️ \${err.message}\`);
        }
        return;
      }

      // Delete admin sent message
      const delAdminMsg = ev.target.closest('[data-del-admin-msg]');
      if (delAdminMsg) {`;

if (adminHtml.includes(targetClickListenersStart)) {
  adminHtml = adminHtml.replace(targetClickListenersStart, replaceClickListenersStart);
  console.log('Injected click listeners for search and message deletion.');
} else {
  console.error('targetClickListenersStart not found');
  process.exit(1);
}

// 8. Write updated admin/index.html
fs.writeFileSync(adminHtmlPath, adminHtml, 'utf8');
console.log('SUCCESS! Updated admin/index.html.');

// Also sync to firebase-public/admin/index.html
const fbAdminPath = path.join(root, 'firebase-public', 'admin', 'index.html');
if (fs.existsSync(path.dirname(fbAdminPath))) {
  fs.writeFileSync(fbAdminPath, adminHtml, 'utf8');
  console.log('SUCCESS! Updated firebase-public/admin/index.html.');
}
