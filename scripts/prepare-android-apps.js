const fs = require('node:fs');
const path = require('node:path');

const configPath = path.resolve(__dirname, '..', 'capacitor.config.json');
require('./generate-apps-icon');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
config.appId = 'com.avioc.apps';
config.appName = 'Avioc Apps';
config.server = {
  ...(config.server || {}),
  url: 'https://aviocwatch.b-cdn.net/apps-ota-v1.0.21.html',
  errorPath: 'index.html',
};
fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
console.log('Configured the Android package as Avioc Apps (com.avioc.apps) with the hosted store page for OTA updates.');
