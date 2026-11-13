const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const downloaderDir = path.join(root, 'downloader');
const templatePath = path.join(downloaderDir, 'templates', 'index.html');
const outputPath = path.join(downloaderDir, 'index.html');

if (!fs.existsSync(templatePath)) {
  console.error('Template not found at:', templatePath);
  process.exit(1);
}

let html = fs.readFileSync(templatePath, 'utf8');

// Replace static asset paths with relative paths for standalone hosting
html = html.replace('href="/static/css/garvinix.css"', 'href="./static/css/garvinix.css"');
html = html.replace('src="/static/js/player.js"', 'src="./static/js/player.js"');
html = html.replace('src="/static/js/app.js"', 'src="./static/js/app.js"');

// Inject API configuration and automatic fetch router to Render backend
const injectHead = `  <!-- Avioc Cinema API Configuration & Smart Backend Router -->
  <script src="../api-config.js"></script>
  <script>
    (function() {
      const origFetch = window.fetch;
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const apiBase = (window.AVIOC_API_BASE_URL || (!isLocal && window.location.hostname ? 'https://avioc-cinema-backend.onrender.com' : '')).replace(/\\/+$/, '');
      if (apiBase) {
        window.fetch = function(url, opts) {
          if (typeof url === 'string' && url.startsWith('/api/')) {
            url = apiBase + url;
          }
          return origFetch.call(this, url, opts);
        };
      }
    })();
  </script>
`;

html = html.replace('</head>', `${injectHead}</head>`);

// Add quick return to Avioc Cinema button in header actions
const cinemaBtn = `        <a href="../" class="btn-hdr-action" style="text-decoration:none;color:#f3a43b;border-color:rgba(243,164,59,0.4);font-weight:700" title="Return to Avioc Cinema">
          <span>🍿</span> Avioc Cinema
        </a>
`;
html = html.replace('<div id="system-status-chip"', `${cinemaBtn}        <div id="system-status-chip"`);

fs.writeFileSync(outputPath, html, 'utf8');
console.log('✓ Created downloader/index.html successfully! Size:', html.length);
