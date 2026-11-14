const fs = require('fs');
const path = require('path');
const https = require('https');

const root = path.join(__dirname, '..');
const zone = 'aviocwatch';
const key = process.env.BUNNY_STORAGE_ZONE_KEY;
if (!key) throw new Error('Set BUNNY_STORAGE_ZONE_KEY in your environment before uploading.');

function getMime(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.xml')) return 'application/xml; charset=utf-8';
  if (filePath.endsWith('.txt')) return 'text/plain; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

function uploadBuffer(buf, remotePath) {
  return new Promise((resolve, reject) => {
    const mime = getMime(remotePath);
    const options = {
      hostname: 'storage.bunnycdn.com',
      port: 443,
      path: `/${zone}/${encodeURI(remotePath)}`,
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
          resolve({ ok: true, remotePath });
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

async function uploadPool(items, concurrency = 8) {
  let index = 0;
  let finished = 0;
  const total = items.length;

  async function worker() {
    while (index < total) {
      const current = items[index++];
      try {
        const buf = fs.readFileSync(current.localPath);
        await uploadBuffer(buf, current.remotePath);
        finished++;
        if (finished % 20 === 0 || finished === total) {
          console.log(`Progress: ${finished}/${total} uploaded (${((finished/total)*100).toFixed(0)}%)`);
        }
      } catch (err) {
        console.error(`Error on ${current.remotePath}:`, err.message);
      }
    }
  }

  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
}

(async () => {
  try {
    console.log('--- Uploading Social Share & Embed Pages to BunnyCDN ---');
    const items = [];

    // 1. Updated index.html
    items.push({
      localPath: path.join(root, 'index.html'),
      remotePath: 'index.html'
    });

    // 2. SEO & Sitemap
    ['sitemap.xml', 'robots.txt'].forEach(f => {
      const p = path.join(root, 'firebase-public', f);
      if (fs.existsSync(p)) {
        items.push({ localPath: p, remotePath: f });
      }
    });

    // 3. m/ directory (movie social landing pages)
    const mDir = path.join(root, 'firebase-public', 'm');
    if (fs.existsSync(mDir)) {
      fs.readdirSync(mDir).forEach(f => {
        items.push({ localPath: path.join(mDir, f), remotePath: `m/${f}` });
      });
    }

    // 4. tv/ directory (live TV social landing pages)
    const tvDir = path.join(root, 'firebase-public', 'tv');
    if (fs.existsSync(tvDir)) {
      fs.readdirSync(tvDir).forEach(f => {
        items.push({ localPath: path.join(tvDir, f), remotePath: `tv/${f}` });
      });
    }

    // 5. embed/ directory (mini players)
    const embedDir = path.join(root, 'firebase-public', 'embed');
    if (fs.existsSync(embedDir)) {
      fs.readdirSync(embedDir).forEach(f => {
        items.push({ localPath: path.join(embedDir, f), remotePath: `embed/${f}` });
      });
    }

    console.log(`Total pages queued for BunnyCDN: ${items.length}`);
    await uploadPool(items, 10);
    console.log('\nAll social share pages & embed players uploaded successfully to BunnyCDN!');
    console.log('Example test: https://aviocwatch.b-cdn.net/m/the-four-2.html');
  } catch (err) {
    console.error('Upload failed:', err);
    process.exit(1);
  }
})();
