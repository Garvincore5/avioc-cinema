const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const manifest = JSON.parse(fs.readFileSync('set_six_manifest.json', 'utf8'));

const results = {};
manifest.forEach(m => {
  const fullPath = path.join(m.sourceDir, m.source);
  try {
    const durRaw = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${fullPath}"`, { encoding: 'utf8' }).trim();
    const durationSec = Math.round(parseFloat(durRaw) || 0);
    const durationMin = Math.round(durationSec / 60);
    results[m.remote] = { durationSec, durationMin };
  } catch(e) {
    results[m.remote] = { error: e.message };
  }
});

fs.writeFileSync('set_six_probe.json', JSON.stringify(results, null, 2));
console.log('Probed all 18 files. Results:', JSON.stringify(results, null, 2));
