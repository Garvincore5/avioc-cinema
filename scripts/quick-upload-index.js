const fs = require('fs');
const path = require('path');
const https = require('https');

const zone = 'aviocwatch';
const key = '936d5fc0-203e-4995-8943a1e59562-03d4-4923';

function uploadFile(remotePath, content, contentType) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'storage.bunnycdn.com',
      port: 443,
      path: `/${zone}/${remotePath}`,
      method: 'PUT',
      headers: {
        'AccessKey': key,
        'Content-Type': contentType,
        'Content-Length': Buffer.byteLength(content),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✓ Uploaded ${remotePath} (${Buffer.byteLength(content)} bytes)`);
          resolve();
        } else {
          console.error(`✗ Failed ${remotePath}: ${res.statusCode} - ${responseBody}`);
          reject(new Error(responseBody));
        }
      });
    });

    req.on('error', reject);
    req.write(content);
    req.end();
  });
}

async function main() {
  console.log('Uploading updated index.html...');
  const indexContent = fs.readFileSync('index.html');
  await uploadFile('index.html', indexContent, 'text/html; charset=utf-8');

  console.log('Uploading updated sw.js...');
  const swContent = fs.readFileSync('sw.js');
  await uploadFile('sw.js', swContent, 'application/javascript; charset=utf-8');

  console.log('ALL DONE! Verifying CDN fetch...');
  const verifyRes = await new Promise((resolve) => {
    https.get(`https://aviocwatch.b-cdn.net/index.html?bust=${Date.now()}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
  });

  console.log('Verification results on live CDN:');
  console.log('- Logo clean "AVIOC<b>●</b><small>CINEMA</small>":', verifyRes.includes('AVIOC<b>●</b><small>CINEMA</small>'));
  console.log('- No "â—":', !verifyRes.includes('â—'));
  console.log('- No "ðŸ":', !verifyRes.includes('ðŸ'));
  console.log('- "👑 Choose your VIP Pass":', verifyRes.includes('👑 Choose your VIP Pass'));
  console.log('- "📱 MTN / Airtel":', verifyRes.includes('📱 MTN / Airtel'));
  console.log('- "💳 Card":', verifyRes.includes('💳 Card'));
  console.log('- "📋 Paste Link &amp; Download":', verifyRes.includes('📋') && verifyRes.includes('Paste Link &amp; Download'));
  console.log('- "● 24/7 Free Live":', verifyRes.includes('● 24/7 Free Live'));
  console.log('- "● 24/7 ON AIR":', verifyRes.includes('● 24/7 ON AIR'));
}

main().catch(console.error);
