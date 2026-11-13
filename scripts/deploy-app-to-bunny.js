const fs = require('fs');
const path = require('path');
const https = require('https');

const root = path.join(__dirname, '..');
const zone = 'aviocwatch';
const key = '936d5fc0-203e-4995-8943a1e59562-03d4-4923';

function getMime(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.webp')) return 'image/webp';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
  if (filePath.endsWith('.webp')) return 'image/webp';
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
    // HTML/JS/JSON files must not be cached by the CDN pull zone so changes are instant
    const isNoCacheFile = remotePath.endsWith('.html') || remotePath === 'sw.js' || remotePath === 'api-config.js' || remotePath === 'catalog-data.json';
    console.log(`Uploading ${remotePath} (${(buf.length / 1024).toFixed(1)} KB, ${mime}) to BunnyCDN...`);
    const options = {
      hostname: 'storage.bunnycdn.com',
      port: 443,
      path: `/${zone}/${encodeURI(remotePath)}`,
      method: 'PUT',
      headers: {
        'AccessKey': key,
        'Content-Type': mime,
        'Content-Length': buf.length,
        ...(isNoCacheFile ? { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' } : {})
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

function uploadDir(localDir, remotePrefix = '') {
  return new Promise(async (resolve, reject) => {
    try {
      const fullDir = path.join(root, localDir);
      if (!fs.existsSync(fullDir)) return resolve();
      const entries = fs.readdirSync(fullDir);
      for (const entry of entries) {
        const fullPath = path.join(fullDir, entry);
        const relPath = path.join(localDir, entry).replace(/\\/g, '/');
        const remotePath = (remotePrefix ? `${remotePrefix}/${entry}` : relPath).replace(/\\/g, '/');
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          await uploadDir(relPath, remotePath);
        } else {
          await uploadDiskFile(relPath, remotePath);
        }
      }
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

(async () => {
  try {
    console.log('--- Deploying Avioc Cinema App to BunnyCDN ---');
    // 1. Core Web App
    await uploadDiskFile('index.html', 'index.html');
    await uploadDiskFile('api-config.js', 'api-config.js');
    await uploadDiskFile('new body/catalog-data.json', 'catalog-data.json');
    await uploadDiskFile('new body/catalog-data.json', 'new body/catalog-data.json');
    await uploadDiskFile('manifest.json', 'manifest.json');
    await uploadDiskFile('sw.js', 'sw.js');
    await uploadDiskFile('favicon.svg', 'favicon.svg');
    await uploadDiskFile('icon-192.png', 'icon-192.png');
    await uploadDiskFile('icon-512.png', 'icon-512.png');

    // 2. Upload assets folder
    console.log('\n--- Uploading Assets (Posters, Backdrops, Icons) ---');
    await uploadDir('assets', 'assets');

    // 3. Upload social share & embed landing pages
    console.log('\n--- Uploading Social Share & Embed Landing Pages ---');
    await uploadDir('firebase-public/m', 'm');
    await uploadDir('firebase-public/tv', 'tv');
    await uploadDir('firebase-public/embed', 'embed');

    console.log('\nAll core app files & assets deployed successfully to BunnyCDN!');
    console.log('App live at: https://aviocwatch.b-cdn.net/');
  } catch (e) {
    console.error('Deploy error:', e);
    process.exit(1);
  }
})();
