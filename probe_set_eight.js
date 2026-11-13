const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dir = 'E:\\downloads\\set eight';
const files = fs.readdirSync(dir);

console.log('=== PROBING SET EIGHT FILES ===\n');

for (const f of files) {
  const full = path.join(dir, f);
  if (fs.statSync(full).isDirectory()) continue;
  try {
    const out = execSync(`ffprobe -v error -show_entries format=duration,tags -show_entries stream=width,height,codec_name -of json "${full}"`, { encoding: 'utf8' });
    const meta = JSON.parse(out);
    const durationSec = Math.round(Number(meta.format?.duration || 0));
    const mins = Math.floor(durationSec / 60);
    const secs = durationSec % 60;
    const stream = meta.streams?.find(s => s.width) || {};
    console.log(`[${f}]`);
    console.log(`   Duration: ${mins}m ${secs}s (${durationSec}s) | Res: ${stream.width}x${stream.height}`);
    if (meta.format?.tags?.title) console.log(`   Tag Title: ${meta.format.tags.title}`);
  } catch(e) {
    console.log(`[${f}] probe failed: ${e.message}`);
  }
}
