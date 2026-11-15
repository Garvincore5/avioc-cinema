const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const appDir = path.join(root, 'android', 'app');
const gradlePath = path.join(appDir, 'build.gradle');
const manifestPath = path.join(appDir, 'src', 'main', 'AndroidManifest.xml');
const valuesDir = path.join(appDir, 'src', 'main', 'res', 'values');
const stringsPath = path.join(valuesDir, 'strings.xml');
const javaRoot = path.join(appDir, 'src', 'main', 'java');
const nativeConfigPath = path.join(appDir, 'src', 'main', 'assets', 'capacitor.config.json');
const versionCode = Number(process.env.ANDROID_VERSION_CODE);
const versionName = process.env.ANDROID_VERSION_NAME || '1.0.0';

if (!Number.isInteger(versionCode) || versionCode < 1 || versionCode > 2100000000) {
  throw new Error('ANDROID_VERSION_CODE must be a valid, increasing Android version code.');
}
for (const file of [gradlePath, manifestPath]) {
  if (!fs.existsSync(file)) throw new Error(`Capacitor Android project is missing ${file}`);
}

if (!fs.existsSync(nativeConfigPath)) throw new Error('Capacitor Android runtime config is missing.');
const nativeConfig = JSON.parse(fs.readFileSync(nativeConfigPath, 'utf8'));
nativeConfig.server = { ...(nativeConfig.server || {}), url: 'https://aviocwatch.b-cdn.net/cinema-app.html', errorPath: 'index.html' };
fs.writeFileSync(nativeConfigPath, `${JSON.stringify(nativeConfig, null, 2)}\n`);

let gradle = fs.readFileSync(gradlePath, 'utf8');
if (!/versionCode\s+\d+/.test(gradle)) throw new Error('Could not find the generated Android versionCode.');
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
if (/versionName\s+["'][^"']+["']/.test(gradle)) {
  gradle = gradle.replace(/versionName\s+["'][^"']+["']/, `versionName "${versionName}"`);
} else {
  throw new Error('Could not find the generated Android versionName.');
}
fs.writeFileSync(gradlePath, gradle);

// Media3 gives the Android app native container/codec and adaptive-streaming
// support that the embedded WebView does not provide (notably Matroska/MKV).
const media3Version = '1.4.1';
if (!gradle.includes('androidx.media3:media3-exoplayer:')) {
  const dependenciesBlock = gradle.match(/dependencies\s*\{[\s\S]*?\n\}/);
  if (!dependenciesBlock) throw new Error('Could not find Android Gradle dependencies block.');
  const media3 = `\n    implementation "androidx.media3:media3-exoplayer:${media3Version}"\n    implementation "androidx.media3:media3-exoplayer-hls:${media3Version}"\n    implementation "androidx.media3:media3-exoplayer-dash:${media3Version}"\n    implementation "androidx.media3:media3-exoplayer-smoothstreaming:${media3Version}"\n    implementation "androidx.media3:media3-ui:${media3Version}"\n`;
  const patchedDependencies = dependenciesBlock[0].replace(/\n\}$/, `${media3}}`);
  gradle = gradle.replace(dependenciesBlock[0], patchedDependencies);
  fs.writeFileSync(gradlePath, gradle);
}

const nativeSource = path.join(root, 'scripts', 'android-media3');
const nativeFiles = ['Media3PlayerPlugin.java', 'Media3PlayerActivity.java'];
const mainActivityFiles = [];
function findJava(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) findJava(file);
    else if (entry.name === 'MainActivity.java') mainActivityFiles.push(file);
  }
}
findJava(javaRoot);
if (mainActivityFiles.length !== 1) throw new Error(`Expected one generated MainActivity.java; found ${mainActivityFiles.length}.`);
const generatedPackageDir = path.dirname(mainActivityFiles[0]);
for (const file of nativeFiles) {
  const source = path.join(nativeSource, file);
  if (!fs.existsSync(source)) throw new Error(`Missing native Media3 source: ${source}`);
  fs.copyFileSync(source, path.join(generatedPackageDir, file));
}
let mainActivity = fs.readFileSync(mainActivityFiles[0], 'utf8');
if (!mainActivity.includes('Media3PlayerPlugin.class')) {
  mainActivity = mainActivity.replace(/(public\s+class\s+MainActivity\s+extends\s+BridgeActivity\s*\{)/,
    '$1\n    @Override\n    public void onCreate(android.os.Bundle savedInstanceState) {\n        registerPlugin(Media3PlayerPlugin.class);\n        super.onCreate(savedInstanceState);\n    }');
  if (!mainActivity.includes('Media3PlayerPlugin.class')) throw new Error('Could not register Media3 player with generated MainActivity.');
  fs.writeFileSync(mainActivityFiles[0], mainActivity);
}

let manifest = fs.readFileSync(manifestPath, 'utf8');
if (!manifest.includes('Media3PlayerActivity')) {
  const appClose = manifest.indexOf('</application>');
  if (appClose < 0) throw new Error('Could not find the Android application element.');
  manifest = `${manifest.slice(0, appClose)}    <activity android:name=".Media3PlayerActivity" android:configChanges="orientation|screenSize|keyboardHidden" android:exported="false" android:screenOrientation="fullSensor" android:theme="@style/Media3PlayerTheme" />\n${manifest.slice(appClose)}`;
}
if (!manifest.includes('android:name="asset_statements"')) {
  const applicationClose = manifest.indexOf('</application>');
  if (applicationClose < 0) throw new Error('Could not find the Android application element.');
  manifest = `${manifest.slice(0, applicationClose)}    <meta-data android:name="asset_statements" android:resource="@string/asset_statements" />\n${manifest.slice(applicationClose)}`;
}
fs.writeFileSync(manifestPath, manifest);

fs.mkdirSync(valuesDir, { recursive: true });
const playerStylesPath = path.join(valuesDir, 'styles.xml');
let playerStyles = fs.existsSync(playerStylesPath) ? fs.readFileSync(playerStylesPath, 'utf8') : '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n</resources>\n';
if (!playerStyles.includes('name="Media3PlayerTheme"')) {
  playerStyles = playerStyles.replace('</resources>', '  <style name="Media3PlayerTheme" parent="@android:style/Theme.Material.NoActionBar">\n    <item name="android:colorAccent">#F4A535</item>\n    <item name="android:windowBackground">#000000</item>\n  </style>\n</resources>');
  fs.writeFileSync(playerStylesPath, playerStyles);
}
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
console.log('Configured Android to receive Cinema web-content updates from BunnyCDN.');
