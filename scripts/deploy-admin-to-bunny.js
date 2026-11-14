const fs = require('fs');
const path = require('path');
const https = require('https');

const root = path.join(__dirname, '..');
const zone = 'aviocwatch';
const key = process.env.BUNNY_STORAGE_ZONE_KEY;
if (!key) throw new Error('Set BUNNY_STORAGE_ZONE_KEY in your environment before uploading.');

function getMime(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
  if (filePath.endsWith('.zip')) return 'application/zip';
  return 'application/octet-stream';
}

function uploadDiskFile(localRelative, remotePath) {
  return new Promise((resolve, reject) => {
    const fullLocal = path.join(root, localRelative);
    if (!fs.existsSync(fullLocal)) {
      console.warn(`Skip missing: ${localRelative}`);
      return resolve();
    }
    const buf = fs.readFileSync(fullLocal);
    const mime = getMime(remotePath);
    console.log(`Uploading ${remotePath} (${(buf.length / 1024).toFixed(1)} KB, ${mime}) to BunnyCDN...`);
    const options = {
      hostname: 'storage.bunnycdn.com',
      port: 443,
      path: `/${zone}/${remotePath}`,
      method: 'PUT',
      headers: {
        'AccessKey': key,
        'Content-Type': mime,
        'Content-Length': buf.length
      }
    };
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => { responseData += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`  ✓ SUCCESS: https://${zone}.b-cdn.net/${remotePath}`);
          resolve();
        } else {
          console.error(`  ✕ FAILED (${remotePath}) HTTP ${res.statusCode}:`, responseData);
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', (err) => {
      console.error(`Upload error (${remotePath}):`, err);
      reject(err);
    });
    req.write(buf);
    req.end();
  });
}

(async () => {
  try {
    // 1. Admin HTML
    await uploadDiskFile('admin/dashboard.html', 'admin/index.html');
    await uploadDiskFile('admin/dashboard.html', 'admin/dashboard.html');
    await uploadDiskFile('admin/dashboard.html', 'admin/panel.html');
    await uploadDiskFile('admin/dashboard.html', 'admin/console.html');

    // 2. Admin Icons
    await uploadDiskFile('admin/admin-icon-192.png', 'admin/admin-icon-192.png');
    await uploadDiskFile('admin/admin-icon-512.png', 'admin/admin-icon-512.png');
    await uploadDiskFile('admin/favicon-admin.svg', 'admin/favicon-admin.svg');

    // 3. Cinema App Icons (USD Crisis)
    await uploadDiskFile('icon-192.png', 'icon-192.png');
    await uploadDiskFile('icon-512.png', 'icon-512.png');
    await uploadDiskFile('favicon.svg', 'favicon.svg');
    await uploadDiskFile('assets/icons/usd crisis.jpg', 'assets/icons/usd-crisis.jpg');
    await uploadDiskFile('assets/icons/Admin.jpg', 'assets/icons/Admin.jpg');

    // 4. Downloader Web App
    await uploadDiskFile('downloader/index.html', 'downloader/index.html');
    await uploadDiskFile('downloader/static/css/garvinix.css', 'downloader/static/css/garvinix.css');
    await uploadDiskFile('downloader/static/css/vidmate.css', 'downloader/static/css/vidmate.css');
    await uploadDiskFile('downloader/static/js/app.js', 'downloader/static/js/app.js');
    await uploadDiskFile('downloader/static/js/player.js', 'downloader/static/js/player.js');
    await uploadDiskFile('downloader/static/img/logo.svg', 'downloader/static/img/logo.svg');

    console.log('\nAll assets and icons deployed successfully to BunnyCDN!');
  } catch (e) {
    process.exit(1);
  }
})();
