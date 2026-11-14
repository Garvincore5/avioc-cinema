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

const launcherIconSources = {
  mdpi: 'ic_launcher_mdpi.png',
  hdpi: 'ic_launcher_hdpi.png',
  xhdpi: 'ic_launcher_xhdpi.png',
  xxhdpi: 'ic_launcher_xxhdpi.png',
  xxxhdpi: 'ic_launcher_xxxhdpi.png',
};
for (const [density, file] of Object.entries(launcherIconSources)) {
  const source = path.join(root, 'assets', 'icons', 'launcher', file);
  const targetDir = path.join(appDir, 'src', 'main', 'res', `mipmap-${density}`);
  if (!fs.existsSync(source) || !fs.existsSync(targetDir)) {
    throw new Error(`Android launcher icon resources are missing for ${density}.`);
  }
  for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) {
    fs.copyFileSync(source, path.join(targetDir, name));
  }
}

const drawableDir = path.join(appDir, 'src', 'main', 'res', 'drawable');
const adaptiveDir = path.join(appDir, 'src', 'main', 'res', 'mipmap-anydpi-v26');
fs.mkdirSync(drawableDir, { recursive: true });
fs.mkdirSync(adaptiveDir, { recursive: true });
fs.writeFileSync(path.join(valuesDir, 'ic_launcher_background.xml'), `<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="ic_launcher_background">#0F0C17</color></resources>\n`);
fs.writeFileSync(path.join(drawableDir, 'ic_avioc_launcher_foreground.xml'), `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
  <path android:fillColor="#00000000" android:pathData="M27,82 L48,31 C51,23 57,23 60,31 L81,82" android:strokeColor="#F4C36A" android:strokeWidth="8" android:strokeLineCap="round" android:strokeLineJoin="round"/>
  <path android:fillColor="#00000000" android:pathData="M38,63 L70,63" android:strokeColor="#F4C36A" android:strokeWidth="8" android:strokeLineCap="round"/>
  <path android:fillColor="#FFF0C9" android:pathData="M50,46 L67,55 L50,64 Z"/>
</vector>\n`);
const adaptiveIcon = `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/ic_launcher_background"/><foreground android:drawable="@drawable/ic_avioc_launcher_foreground"/></adaptive-icon>\n`;
for (const file of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
  fs.writeFileSync(path.join(adaptiveDir, file), adaptiveIcon);
}

console.log(`Configured Avioc Cinema Android version ${versionName} (${versionCode}) and store install detection.`);
console.log('Applied Avioc Cinema launcher icons for legacy and adaptive Android launchers.');
