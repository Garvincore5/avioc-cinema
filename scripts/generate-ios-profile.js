const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const iconPath = path.join(root, 'icon-192.png');
let iconBase64 = '';

if (fs.existsSync(iconPath)) {
  iconBase64 = fs.readFileSync(iconPath).toString('base64');
}

const mobileconfig = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>FullScreen</key>
            <true/>
            ${iconBase64 ? `<key>Icon</key>\n            <data>${iconBase64}</data>` : ''}
            <key>IsRemovable</key>
            <true/>
            <key>Label</key>
            <string>Avioc Cinema</string>
            <key>PayloadDescription</key>
            <string>Add Avioc Cinema to the Home Screen as a website shortcut</string>
            <key>PayloadDisplayName</key>
            <string>Avioc Cinema Website Shortcut</string>
            <key>PayloadIdentifier</key>
            <string>com.avioc.cinema.webclip</string>
            <key>PayloadType</key>
            <string>com.apple.webClip.managed</string>
            <key>PayloadUUID</key>
            <string>A510C001-A710-4C10-8A10-A710C10E0A01</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>Precomposed</key>
            <true/>
            <key>URL</key>
            <string>https://aviocwatch.b-cdn.net/cinema.html?standalone=1</string>
        </dict>
    </array>
    <key>PayloadDescription</key>
    <string>Installs a removable Home Screen shortcut to the Avioc Cinema website. This is not a native iOS app.</string>
    <key>PayloadDisplayName</key>
    <string>Avioc Cinema</string>
    <key>PayloadIdentifier</key>
    <string>com.avioc.cinema.profile</string>
    <key>PayloadOrganization</key>
    <string>Avioc Cinema</string>
    <key>PayloadRemovalDisallowed</key>
    <false/>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>B620D002-B820-5D20-9B20-B820D20F1B02</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>`;

const outDir = path.join(root, 'release-binaries');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'Avioc-Cinema.mobileconfig');
fs.writeFileSync(outFile, mobileconfig, 'utf8');

const publicFile = path.join(root, 'firebase-public', 'Avioc-Cinema.mobileconfig');
if (fs.existsSync(path.dirname(publicFile))) {
  fs.writeFileSync(publicFile, mobileconfig, 'utf8');
}

console.log('✓ Successfully generated Avioc-Cinema.mobileconfig for universal iPhone/iPad installation!');
