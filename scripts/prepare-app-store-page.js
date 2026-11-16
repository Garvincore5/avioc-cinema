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
  .replace(/(Avioc-Apps(?:-Setup)?(?:-[A-Za-z0-9-]+)?-v)\d+\.\d+\.\d+/g, `$1${version}`));
update('manifest.json', json => json.replace(/apps-ota-v\d+\.\d+\.\d+/g, `apps-ota-v${version}`));
update('sw.js', worker => worker
  .replace(/apps-ota-v\d+\.\d+\.\d+/g, `apps-ota-v${version}`)
  .replace(/avioc-apps-v(?:\d+|\d+\.\d+\.\d+)/g, `avioc-apps-v${version}`));
console.log(`Prepared Avioc Apps page and PWA metadata for v${version}.`);
