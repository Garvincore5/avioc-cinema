const CACHE='family-hub-v1';
const FILES=['./','./index.html','./manifest.json','./app-icon.svg','./css/styles.css','./js/app.js','./js/bundle.js','./js/store.js','./js/sync.js','./js/components/calendar.js','./js/components/chat.js','./js/components/chores.js','./js/components/familyTree.js','./js/components/feed.js','./js/components/navbar.js','./js/components/recipes.js','./js/components/vault.js','./js/data/initialData.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(fetch(e.request).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(e.request,r.clone()));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))))});
