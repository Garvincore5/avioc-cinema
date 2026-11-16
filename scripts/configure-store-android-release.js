const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const appId = process.env.STORE_ANDROID_APP_ID;
const appName = process.env.STORE_ANDROID_APP_NAME;
const versionCode = Number(process.env.ANDROID_VERSION_CODE);
const versionName = process.env.ANDROID_VERSION_NAME || '1.0.0';
if (!appId || !/^com\.[a-z0-9.]+$/.test(appId)) throw new Error('A valid STORE_ANDROID_APP_ID is required.');
if (!appName) throw new Error('STORE_ANDROID_APP_NAME is required.');
if (!Number.isInteger(versionCode) || versionCode < 1) throw new Error('ANDROID_VERSION_CODE must be a positive integer.');

const androidRoot = path.join(root, 'android');
const gradlePath = path.join(androidRoot, 'app', 'build.gradle');
const manifestPath = path.join(androidRoot, 'app', 'src', 'main', 'AndroidManifest.xml');
const stringsPath = path.join(androidRoot, 'app', 'src', 'main', 'res', 'values', 'strings.xml');
const iconSource = path.join(root, process.env.STORE_ANDROID_ICON_FILE || 'store-apps/family-hub/android-res/ic_familyhub.xml');
for (const file of [gradlePath, manifestPath, stringsPath, iconSource]) {
  if (!fs.existsSync(file)) throw new Error(`Generated Android project is missing ${file}`);
}

let gradle = fs.readFileSync(gradlePath, 'utf8');
gradle = gradle.replace(/applicationId\s+["'][^"']+["']/, `applicationId "${appId}"`)
  .replace(/versionCode\s+\d+/, `versionCode ${versionCode}`)
  .replace(/versionName\s+["'][^"']+["']/, `versionName "${versionName}"`);
fs.writeFileSync(gradlePath, gradle);

let manifest = fs.readFileSync(manifestPath, 'utf8');
const applicationTag = manifest.match(/<application\b[^>]*>/);
if (!applicationTag) throw new Error('Generated Android manifest has no application element.');
let updatedApplicationTag = applicationTag[0];
const iconResource = path.basename(iconSource, path.extname(iconSource));
for (const attribute of ['icon', 'roundIcon']) {
  const expression = new RegExp(`android:${attribute}="[^"]*"`);
  if (expression.test(updatedApplicationTag)) {
    updatedApplicationTag = updatedApplicationTag.replace(expression, `android:${attribute}="@drawable/${iconResource}"`);
  } else {
    updatedApplicationTag = updatedApplicationTag.replace(/>$/, ` android:${attribute}="@drawable/${iconResource}">`);
  }
}
manifest = manifest.replace(applicationTag[0], updatedApplicationTag);
fs.writeFileSync(manifestPath, manifest);
fs.copyFileSync(iconSource, path.join(androidRoot, 'app', 'src', 'main', 'res', 'drawable', `${iconResource}.xml`));

let strings = fs.readFileSync(stringsPath, 'utf8');
if (/<string\s+name="app_name">[\s\S]*?<\/string>/.test(strings)) {
  strings = strings.replace(/<string\s+name="app_name">[\s\S]*?<\/string>/, `<string name="app_name">${appName}</string>`);
} else {
  strings = strings.replace('</resources>', `  <string name="app_name">${appName}</string>\n</resources>`);
}
fs.writeFileSync(stringsPath, strings);
console.log(`Configured ${appName} (${appId}) version ${versionName} (${versionCode}).`);
