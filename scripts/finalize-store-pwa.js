const fs = require('node:fs');
const path = require('node:path');

const appKey = process.argv[2];
const displayName = process.argv[3];
if (!/^[a-z0-9-]+$/.test(appKey || '') || !displayName) throw new Error('Usage: node scripts/finalize-store-pwa.js <app-key> <display-name>');
const appPaths = {
  'core-sorter': 'core-sorter/mobile/src/dist',
  'quick-contact': 'quick-contact/dist',
  'ai-companion': 'ai-companion/dist'
};
if (!appPaths[appKey]) throw new Error(`Unsupported store app: ${appKey}`);
const dist = path.resolve(__dirname, '..', 'store-apps', appPaths[appKey]);
const indexPath = path.join(dist, 'index.html');
if (!fs.existsSync(indexPath)) throw new Error(`Build output is missing: ${indexPath}`);
const files = [];
function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(absolute);
    else if (entry.isFile() && entry.name !== 'sw.js') {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.html', '.webmanifest', '.svg', '.js', '.css', '.png', '.webp', '.jpg', '.woff2'].includes(ext)) {
        files.push(`./${path.relative(dist, absolute).replaceAll(path.sep, '/')}`);
      }
    }
  }
}
collect(dist);
const cacheName = `${appKey}-pwa-v1`;
const worker = `const CACHE=${JSON.stringify(cacheName)};\nconst PRECACHE=${JSON.stringify(files)};\nself.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PRECACHE)).then(()=>self.skipWaiting())));\nself.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));\nself.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok)caches.open(CACHE).then(cache=>cache.put(event.request,response.clone()));return response}).catch(()=>caches.match('./index.html'))))});\n`;
fs.writeFileSync(path.join(dist, 'sw.js'), worker);
console.log(`${displayName} offline worker precaches ${files.length} built files.`);
