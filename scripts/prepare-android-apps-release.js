const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const androidRoot = path.join(root, 'android');
const gradlePath = path.join(androidRoot, 'app', 'build.gradle');
const manifestPath = path.join(androidRoot, 'app', 'src', 'main', 'AndroidManifest.xml');
const configPath = path.join(androidRoot, 'app', 'src', 'main', 'assets', 'capacitor.config.json');
const stringsPath = path.join(androidRoot, 'app', 'src', 'main', 'res', 'values', 'strings.xml');
const assetsDir = path.join(root, 'assets', 'icons');
const versionCode = Number(process.env.ANDROID_VERSION_CODE);
const versionName = process.env.ANDROID_VERSION_NAME || '1.0.0';

if (!Number.isInteger(versionCode) || versionCode < 1 || versionCode > 2100000000) {
  throw new Error('ANDROID_VERSION_CODE must be a valid Android version code.');
}
for (const file of [gradlePath, configPath, stringsPath, manifestPath]) {
  if (!fs.existsSync(file)) throw new Error(`Generated Avioc Apps Android project is missing ${file}`);
}

let gradle = fs.readFileSync(gradlePath, 'utf8');
if (!/applicationId\s+["']com\.avioc\.apps["']/.test(gradle)) {
  throw new Error('Android package ID is not com.avioc.apps; refusing to build the wrong app.');
}
if (!/versionCode\s+\d+/.test(gradle) || !/versionName\s+["'][^"']+["']/.test(gradle)) {
  throw new Error('Could not locate Android version fields.');
}
gradle = gradle
  .replace(/versionCode\s+\d+/, `versionCode ${versionCode}`)
  .replace(/versionName\s+["'][^"']+["']/, `versionName "${versionName}"`);
fs.writeFileSync(gradlePath, gradle);

const capacitorConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
if (capacitorConfig.appId !== 'com.avioc.apps') throw new Error('Generated Capacitor config has the wrong package ID.');
capacitorConfig.server = {
  ...(capacitorConfig.server || {}),
  url: 'https://aviocwatch.b-cdn.net/apps-ota-v1.0.21.html',
  errorPath: 'index.html',
};
fs.writeFileSync(configPath, `${JSON.stringify(capacitorConfig, null, 2)}\n`);

let strings = fs.readFileSync(stringsPath, 'utf8');
if (/<string\s+name="app_name">[\s\S]*?<\/string>/.test(strings)) {
  strings = strings.replace(/<string\s+name="app_name">[\s\S]*?<\/string>/, '<string name="app_name">Avioc Apps</string>');
} else {
  strings = strings.replace('</resources>', '  <string name="app_name">Avioc Apps</string>\n</resources>');
}
fs.writeFileSync(stringsPath, strings);

const iconDensities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [density, size] of Object.entries(iconDensities)) {
  const mipmapDir = path.join(androidRoot, 'app', 'src', 'main', 'res', `mipmap-${density}`);
  if (!fs.existsSync(mipmapDir)) fs.mkdirSync(mipmapDir, { recursive: true });
  const iconSource = path.join(assetsDir, `avioc-apps-${size}.png`);
  if (!fs.existsSync(iconSource)) throw new Error(`Missing Avioc Apps launcher icon ${iconSource}`);
  fs.copyFileSync(iconSource, path.join(mipmapDir, 'ic_launcher.png'));
  fs.copyFileSync(iconSource, path.join(mipmapDir, 'ic_launcher_round.png'));
  fs.copyFileSync(path.join(assetsDir, 'avioc-apps-192.png'), path.join(mipmapDir, 'ic_launcher_foreground.png'));
}
const adaptiveDir = path.join(androidRoot, 'app', 'src', 'main', 'res', 'mipmap-anydpi-v26');
fs.mkdirSync(adaptiveDir, { recursive: true });
const adaptiveIcon = `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/avioc_apps_icon_background"/><foreground android:drawable="@mipmap/ic_launcher_foreground"/></adaptive-icon>\n`;
fs.writeFileSync(path.join(adaptiveDir, 'ic_launcher.xml'), adaptiveIcon);
fs.writeFileSync(path.join(adaptiveDir, 'ic_launcher_round.xml'), adaptiveIcon);
// Allow the Apps PWA to hand off to the installed native Apps application.
let manifest = fs.readFileSync(manifestPath, 'utf8');
if (!manifest.includes('avioc-apps-open-scheme')) {
  const activityStart = manifest.search(/<activity\b(?=[^>]*android:name="[^"]*MainActivity")/);
  if (activityStart < 0) throw new Error('Could not find the Avioc Apps Android MainActivity for its open link.');
  const activityOpenEnd = manifest.indexOf('>', activityStart);
  const activityClose = manifest.indexOf('</activity>', activityOpenEnd);
  if (activityOpenEnd < 0 || activityClose < 0) throw new Error('Could not locate the Avioc Apps Android MainActivity element.');
  const appSchemeFilter = `\n            <!-- avioc-apps-open-scheme: verified handoff from the Apps PWA -->\n            <intent-filter android:autoVerify="true">\n                <action android:name="android.intent.action.VIEW" />\n                <category android:name="android.intent.category.DEFAULT" />\n                <category android:name="android.intent.category.BROWSABLE" />\n                <data android:scheme="https" android:host="aviocwatch.b-cdn.net" android:pathPrefix="/apps-ota-v1.0.21.html" />\n            </intent-filter>\n        `;
  manifest = `${manifest.slice(0, activityClose)}${appSchemeFilter}${manifest.slice(activityClose)}`;
  fs.writeFileSync(manifestPath, manifest);
}
const valuesDir = path.dirname(stringsPath);
const colorsPath = path.join(valuesDir, 'colors.xml');
let colors = fs.existsSync(colorsPath) ? fs.readFileSync(colorsPath, 'utf8') : '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n</resources>\n';
if (!colors.includes('name="avioc_apps_icon_background"')) {
  colors = colors.replace('</resources>', '  <color name="avioc_apps_icon_background">#0c0a14</color>\n</resources>');
  fs.writeFileSync(colorsPath, colors);
}
console.log(`Prepared signed Avioc Apps Android version ${versionName} (${versionCode}) with OTA store loading.`);
