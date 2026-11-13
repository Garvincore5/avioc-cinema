/**
 * Upload Admin APK to Bunny Storage Zone
 * Usage:
 *   node scripts/upload-admin-to-bunny.js [storageZone] [accessKey]
 * Or set environment variables:
 *   BUNNY_STORAGE_ZONE=aviocwatch
 *   BUNNY_STORAGE_KEY=your-storage-api-key
 */

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

const root = path.resolve(__dirname, '..');
const apkPath = path.join(root, 'admin', 'Avioc-Cinema-Admin.apk');

const zone = process.argv[2] || process.env.BUNNY_STORAGE_ZONE || 'aviocwatch';
const key = process.argv[3] || process.env.BUNNY_STORAGE_KEY || '';

if (!fs.existsSync(apkPath)) {
  console.error('Error: Avioc-Cinema-Admin.apk not found at:', apkPath);
  process.exit(1);
}

const stats = fs.statSync(apkPath);
console.log(`Ready to upload Admin APK (${(stats.size / 1024 / 1024).toFixed(2)} MB) to Bunny CDN...`);
console.log(`Target: https://storage.bunnycdn.com/${zone}/admin/Avioc-Cinema-Admin.apk`);

if (!key) {
  console.log('\n[NOTICE] Bunny Storage Access Key not provided.');
  console.log('To push the APK to Bunny CDN Storage, run:');
  console.log(`node scripts/upload-admin-to-bunny.js ${zone} <YOUR_BUNNY_STORAGE_ACCESS_KEY>\n`);
  console.log('Or set the BUNNY_STORAGE_KEY environment variable.');
  process.exit(0);
}

const fileStream = fs.createReadStream(apkPath);
const options = {
  hostname: 'storage.bunnycdn.com',
  port: 443,
  path: `/${zone}/admin/Avioc-Cinema-Admin.apk`,
  method: 'PUT',
  headers: {
    'AccessKey': key,
    'Content-Type': 'application/vnd.android.package-archive',
    'Content-Length': stats.size
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('SUCCESS! Admin APK uploaded to Bunny CDN.');
      console.log(`Public URL: https://${zone}.b-cdn.net/admin/Avioc-Cinema-Admin.apk`);
    } else {
      console.error(`Upload failed with HTTP ${res.statusCode}:`, data);
    }
  });
});

req.on('error', (err) => {
  console.error('Upload error:', err);
});

fileStream.pipe(req);
