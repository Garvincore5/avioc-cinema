const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'firebase-public');
const entryPath = path.join(publicDir, 'index.html');
const cinemaPath = path.join(publicDir, 'cinema.html');
const appsPath = path.join(publicDir, 'apps.html');

if (!fs.existsSync(entryPath) || !fs.existsSync(cinemaPath)) {
  throw new Error('Build the hosting files first; firebase-public/index.html and cinema.html are required.');
}

// Capacitor starts from index.html. Preserve the Avioc Apps storefront at
// apps.html, and make the Cinema APK start in the actual movies/TV app.
const appsStoreHtml = fs.readFileSync(entryPath, 'utf8');
let cinemaHtml = fs.readFileSync(cinemaPath, 'utf8');

cinemaHtml = cinemaHtml
  .replace(/href\s*=\s*(["'])index\.html\1/g, 'href=$1apps.html$1')
  .replace(/(\.href\s*=\s*["'])index\.html(?=["'])/g, '$1apps.html');

fs.writeFileSync(appsPath, appsStoreHtml, 'utf8');
fs.writeFileSync(entryPath, cinemaHtml, 'utf8');

console.log('Prepared separate Android entry points: Avioc Cinema at / and Avioc Apps at /apps.html.');
