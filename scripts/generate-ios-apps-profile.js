const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const iconPath = path.join(root, 'assets', 'icons', 'avioc-apps-192.png');
const iconBase64 = fs.existsSync(iconPath) ? fs.readFileSync(iconPath).toString('base64') : '';
const mobileconfig = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key><array><dict>
    <key>FullScreen</key><true/>
    ${iconBase64 ? `<key>Icon</key><data>${iconBase64}</data>` : ''}
    <key>IsRemovable</key><true/>
    <key>Label</key><string>Avioc Apps</string>
    <key>PayloadDescription</key><string>Add Avioc Apps to the Home Screen as a website shortcut</string>
    <key>PayloadDisplayName</key><string>Avioc Apps Home Screen Shortcut</string>
    <key>PayloadIdentifier</key><string>com.avioc.apps.webclip</string>
    <key>PayloadType</key><string>com.apple.webClip.managed</string>
    <key>PayloadUUID</key><string>C610C001-C710-4C10-8A10-C710C10E0A01</string>
    <key>PayloadVersion</key><integer>1</integer>
    <key>Precomposed</key><true/>
    <key>URL</key><string>https://aviocwatch.b-cdn.net/apps.html?standalone=1</string>
  </dict></array>
  <key>PayloadDescription</key><string>Installs a removable Home Screen shortcut to Avioc Apps. This is not a native iOS app.</string>
  <key>PayloadDisplayName</key><string>Avioc Apps</string>
  <key>PayloadIdentifier</key><string>com.avioc.apps.profile</string>
  <key>PayloadOrganization</key><string>Avioc</string>
  <key>PayloadRemovalDisallowed</key><false/>
  <key>PayloadType</key><string>Configuration</string>
  <key>PayloadUUID</key><string>D720D002-D820-5D20-9B20-D820D20F1B02</string>
  <key>PayloadVersion</key><integer>1</integer>
</dict>
</plist>`;

const outDir = path.join(root, 'release-binaries');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'Avioc-Apps.mobileconfig'), mobileconfig, 'utf8');
console.log('Generated the Avioc Apps iPhone/iPad Home Screen profile.');
