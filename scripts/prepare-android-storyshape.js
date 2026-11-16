const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const configPath = path.join(root, 'capacitor.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
config.appId = 'com.avioc.storyshape';
config.appName = 'StoryShape';
config.webDir = 'store-apps/storyshape/www';
delete config.server;
fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
console.log('Configured the offline StoryShape Android app.');
