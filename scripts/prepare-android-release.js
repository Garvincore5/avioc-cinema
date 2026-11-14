const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const appDir = path.join(root, 'android', 'app');
const gradlePath = path.join(appDir, 'build.gradle');
const manifestPath = path.join(appDir, 'src', 'main', 'AndroidManifest.xml');
const valuesDir = path.join(appDir, 'src', 'main', 'res', 'values');
const stringsPath = path.join(valuesDir, 'strings.xml');
const versionCode = Number(process.env.ANDROID_VERSION_CODE);
const versionName = process.env.ANDROID_VERSION_NAME || '1.0.0';

if (!Number.isInteger(versionCode) || versionCode < 1 || versionCode > 2100000000) {
  throw new Error('ANDROID_VERSION_CODE must be a valid, increasing Android version code.');
}
for (const file of [gradlePath, manifestPath]) {
  if (!fs.existsSync(file)) throw new Error(`Capacitor Android project is missing ${file}`);
}

let gradle = fs.readFileSync(gradlePath, 'utf8');
if (!/versionCode\s+\d+/.test(gradle)) throw new Error('Could not find the generated Android versionCode.');
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
if (/versionName\s+["'][^"']+["']/.test(gradle)) {
  gradle = gradle.replace(/versionName\s+["'][^"']+["']/, `versionName "${versionName}"`);
} else {
  throw new Error('Could not find the generated Android versionName.');
}
fs.writeFileSync(gradlePath, gradle);

let manifest = fs.readFileSync(manifestPath, 'utf8');
if (!manifest.includes('android:name="asset_statements"')) {
  const applicationClose = manifest.indexOf('</application>');
  if (applicationClose < 0) throw new Error('Could not find the Android application element.');
  manifest = `${manifest.slice(0, applicationClose)}    <meta-data android:name="asset_statements" android:resource="@string/asset_statements" />\n${manifest.slice(applicationClose)}`;
  fs.writeFileSync(manifestPath, manifest);
}

fs.mkdirSync(valuesDir, { recursive: true });
const statement = '[{\\"relation\\":[\\"delegate_permission/common.handle_all_urls\\"],\\"target\\":{\\"namespace\\":\\"web\\",\\"site\\":\\"https://aviocwatch.b-cdn.net\\"}}]';
if (fs.existsSync(stringsPath)) {
  let strings = fs.readFileSync(stringsPath, 'utf8');
  const element = `<string name="asset_statements">${statement}</string>`;
  if (/<string\s+name="asset_statements">/.test(strings)) {
    strings = strings.replace(/<string\s+name="asset_statements">[\s\S]*?<\/string>/, element);
  } else {
    strings = strings.replace('</resources>', `  ${element}\n</resources>`);
  }
  fs.writeFileSync(stringsPath, strings);
} else {
  fs.writeFileSync(stringsPath, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n  <string name="asset_statements">${statement}</string>\n</resources>\n`);
}

console.log(`Configured Avioc Cinema Android version ${versionName} (${versionCode}) and store install detection.`);
