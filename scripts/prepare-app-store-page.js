const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Invalid Avioc Apps version: ${version}`);
const update = (file, change) => {
  const target = path.join(root, file);
  fs.writeFileSync(target, change(fs.readFileSync(target, 'utf8')));
};

update('index.html', html => html
  .replace(/apps-ota-v\d+\.\d+\.\d+/g, `apps-ota-v${version}`)
  .replace(/(Avioc-Apps(?:-Setup)?(?:-[A-Za-z0-9-]+)?-v)\d+\.\d+\.\d+/g, `$1${version}`)
  .replace(/register\('\/sw(?:-v\d+\.\d+\.\d+)?\.js(?:\?v=[^']+)?'\)/g, `register('/sw-v${version}.js')`));
update('manifest.json', json => json.replace(/apps-ota-v\d+\.\d+\.\d+/g, `apps-ota-v${version}`));
update('index.html', html => html.replace(/(Avioc-AI-Companion-(?:Android|Windows-(?:x64|arm64)|Mac-(?:x64|arm64)|Linux-(?:x64|x86_64|arm64))-v)\d+\.\d+\.\d+/g, `$1${version}`));
const jarvisProject = fs.readFileSync(path.join(root, 'store-apps/jarvis-desktop/JarvisDesktop.csproj'), 'utf8');
const jarvisVersion = (jarvisProject.match(/<Version>(\d+\.\d+\.\d+)<\/Version>/) || [])[1];
if (!jarvisVersion) throw new Error('J.A.R.V.I.S. Desktop project has no valid version.');
update('index.html', html => html.replace(/(JARVIS-Desktop-Windows-x64-v)\d+\.\d+\.\d+/g, `$1${jarvisVersion}`));
let worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
worker = worker
  .replace(/apps-ota-v\d+\.\d+\.\d+/g, `apps-ota-v${version}`)
  .replace(/avioc-apps-v(?:\d+\.\d+\.\d+|\d+)(?![\d.])/g, `avioc-apps-v${version}`);
fs.writeFileSync(path.join(root, `sw-v${version}.js`), worker);
console.log(`Prepared Avioc Apps page and PWA metadata for v${version}.`);
