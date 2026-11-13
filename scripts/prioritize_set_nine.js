const fs = require('fs');
const path = require('path');

const root = 'E:/code/avioc cinema';
const catalogPath = path.join(root, 'new body/catalog-data.json');
const prioritized = new Set([
  'abraham-lincoln-vs-zombies-set-nine',
  'animals-set-nine',
  'blood-creek-set-nine',
  'by-any-means-set-nine',
  'hobbs-and-shaw-set-nine',
  'safe-set-nine',
  'shadow-master-set-nine',
  'status-update-set-nine',
  'dark-side-of-the-sun-set-nine',
  'mortuary-collection-set-nine',
  'damalie-uganda',
  'hanged-for-love-uganda',
  'namwandu-uganda',
  'bait-set-nine',
  'flower-crew-joseon-marriage-agency',
  'bhooth-bangla-set-nine',
  'visionquest-set-nine',
]);

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const first = catalog.filter((item) => prioritized.has(item.id));
const rest = catalog.filter((item) => !prioritized.has(item.id));
if (first.length !== prioritized.size) throw new Error(`Expected ${prioritized.size} new entries, found ${first.length}`);
const ordered = [...first, ...rest];
ordered.forEach((item, index) => { item.order = index; });
fs.writeFileSync(catalogPath, JSON.stringify(ordered, null, 2) + '\n');

const indexPath = path.join(root, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const marker = 'const SOURCE_CATALOG=';
const start = html.indexOf(marker);
const end = html.indexOf(';\nconst TITLES=SOURCE_CATALOG;', start);
if (start < 0 || end < 0) throw new Error('Could not locate embedded catalog in index.html');
html = html.slice(0, start + marker.length) + JSON.stringify(ordered) + html.slice(end);
fs.writeFileSync(indexPath, html);
fs.copyFileSync(indexPath, path.join(root, 'firebase-public/index.html'));
console.log(`Moved ${first.length} Set Nine titles to the front of the ${ordered.length}-title catalog.`);
