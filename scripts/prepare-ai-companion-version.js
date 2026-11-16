const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const appPath = path.join(repoRoot, 'store-apps', 'ai-companion', 'package.json');
const rootVersion = require(path.join(repoRoot, 'package.json')).version;
const appPackage = JSON.parse(fs.readFileSync(appPath, 'utf8'));
appPackage.version = rootVersion;
fs.writeFileSync(appPath, `${JSON.stringify(appPackage, null, 2)}\n`);
console.log(`Set AI Companion desktop package version to ${rootVersion}.`);
