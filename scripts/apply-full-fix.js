const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
let content = fs.readFileSync(indexPath, 'utf8');

console.log('Original index.html length:', content.length);

// 1. Replace catalog line with clean catalog
const catPath = path.join(root, 'catalog-data.json');
const cat = JSON.parse(fs.readFileSync(catPath, 'utf8'));
content = content.replace(/const SOURCE_CATALOG=\[[\s\S]*?\];/, `const SOURCE_CATALOG=${JSON.stringify(cat)};`);
console.log('1. Replaced catalog line with clean catalog.');

// 2. Comprehensive Mojibake Fix Map
const map = [
  // Logo & Headers
  ['AVIOC<b>â— </b><small>CINEMA</small>', 'AVIOC<b>●</b><small>CINEMA</small>'],
  ['â—  24/7 Free Live', '● 24/7 Free Live'],
  ['â—  24/7 ON AIR', '● 24/7 ON AIR'],
  ['â— ', '● '],
  ['â—', '●'],
  ['â€”', '—'],
  ['â€“', '–'],
  ['â€˜', '‘'],
  ['â€™', '’'],
  ['â€œ', '“'],
  ['\u00e2\u20ac\u009d', '”'],
  ['â€ ', '” '],
  ['â€"', '”"'],
  ['â€\'', '”\''],
  ['â€,', '”,'],
  ['â€.', '”.'],
  ['â€<', '”<'],
  ['â€?', '”?'],
  ['â€!', '”!'],
  ['â€¦', '…'],
  ['â€¢', '•'],
  ['Â·', '·'],
  ['â‰¤', '≤'],
  ['âœ•', '✕'],
  ['âœ✓', '✓'],
  ['âœ“', '✓'],
  ['âœ…', '✅'],
  ['â Œ', '❌'],
  ['\u00e2\u009d\u0152', '❌'],
  ['\u00e2\u2020\u2019', '→'],
  ['â–¶ï¸ ', '▶️'],
  ['â–¶', '▶'],
  ['â–¾', '▾'],
  ['â–´', '▴'],
  ['â€º', '›'],
  ['â†‘', '↑'],
  ['â‹®', '⋮'],
  ['\u00e2\u008f\u00ad\u00ef\u00b8\u008f', '⏭️'],
  ['\u00e2\u008f\u00ae\u00ef\u00b8\u008f', '⏮️'],
  ['âš¡', '⚡'],
  ['\u00e2\u008f\u00b3', '⏳'],
  ['\u00e2\u0153\u02c6\u00ef\u00b8\u008f', '✈️'],
  ['âœˆï¸ ', '✈️'],
  ['âœ¨', '✨'],
  ['â›¶', '⛶'],
  ['\u00e2\u009d\u00a4\u00ef\u00b8\u008f', '❤️'],
  ['\u00e2\u0161\u00bd', '⚽'],

  // Emojis across all views, modals and Vidor tab
  ['\u00f0\u0178\u008d\u00bf', '🍿'],
  ['ðŸ ¿', '🍿'],
  ['\u00f0\u0178\u2013\u00bc\u00ef\u00b8\u008f', '🖼️'],
  ['ðŸ–¼ï¸ ', '🖼️'],
  ['ðŸ‘‘', '👑'],
  ['ðŸš€', '🚀'],
  ['ðŸ’¬', '💬'],
  ['ðŸ“‹', '📋'],
  ['ðŸ”‘', '🔑'],
  ['ðŸ”¥', '🔥'],
  ['ðŸ“±', '📱'],
  ['ðŸ\'³', '💳'],
  ['ðŸ’³', '💳'],
  ['ðŸ‘†', '👆'],
  ['\u00f0\u0178\u2018\u008f', '👍'],
  ['ðŸ‘ ', '👍'],
  ['ðŸŽ¬', '🎬'],
  ['ðŸ“º', '📺'],
  ['\u00f0\u0178\u201c\u0081', '📁'],
  ['ðŸ“ ', '📁'],
  ['ðŸ“¥', '📥'],
  ['ðŸŽµ', '🎵'],
  ['\u00f0\u0178\u201d\u008d', '🔍'],
  ['ðŸ” ', '🔍'],
  ['ðŸ”', '🔍'],
  ['\u00f0\u0178\u02dc\u201a', '😂'],
  ['\u00f0\u0178\u017d\u00ae', '🎮'],
  ['ðŸªŸ', '🪟'],
  ['ðŸ——', '🗖'],
  ['ðŸ”Š', '🔊'],
  ['ðŸ”—', '🔗'],
  ['ðŸŽ‰', '🎉'],
  ['ðŸ’¯', '💯'],
  ['ðŸ™Œ', '🙌'],
  ['ðŸ‘Œ', '👌'],
  ['ðŸ“²', '📲'],
  ['\u00f0\u0178\u201c\u00a2', '📢'],
  ['ðŸ“¢', '📢'],
  ['ðŸ“‚', '📂'],
  ['ðŸŸ¢', '🟢']
];

for (const [bad, good] of map) {
  content = content.replaceAll(bad, good);
}
console.log('2. Replaced all mojibake characters.');

// 3. Ensure YouTube embed origin is passed for reliable autoplay on ended
const ytEmbedOld = `src="https://www.youtube-nocookie.com/embed/\${encodeURIComponent(vidId)}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1&playsinline=1"`;
const ytEmbedNew = `src="https://www.youtube-nocookie.com/embed/\${encodeURIComponent(vidId)}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1&playsinline=1&origin=\${encodeURIComponent(location.origin)}"`;
if (content.includes(ytEmbedOld)) {
  content = content.replace(ytEmbedOld, ytEmbedNew);
  console.log('3. Added origin to YouTube embed URL for reliable autoplay events.');
}

// 4. Update download query parameters to include &title=
const dlCallOld = `const streamUrl = \`\${base}/api/download?url=\${encodeURIComponent('https://www.youtube.com/watch?v=' + ytId)}&quality=\${quality}&type=\${isAudio ? 'audio' : 'video'}&stream=1\`;`;
const dlCallNew = `const streamUrl = \`\${base}/api/download?url=\${encodeURIComponent('https://www.youtube.com/watch?v=' + ytId)}&quality=\${quality}&type=\${isAudio ? 'audio' : 'video'}&title=\${encodeURIComponent(t.title || ytId)}&stream=1\`;`;
if (content.includes(dlCallOld)) {
  content = content.replace(dlCallOld, dlCallNew);
  console.log('4. Added title parameter to /api/download URL.');
}

// 5. Update header branding in search bar
content = content.replace(
  'sd.innerHTML=`<div class="sd-head">Universal Media Downloader',
  'sd.innerHTML=`<div class="sd-head">Vidor Universal Media Downloader'
);
content = content.replace(
  '<b>Search Downloader for',
  '<b>Search Vidor for'
);
console.log('5. Updated search dropdown branding to Vidor.');

// 6. Automatically trigger file save when download task completes
const autoSaveTarget = `toast(\`✅ Download complete: \${newTask.title}! Tap "📥 Save" or "▶ Play"\`);`;
const autoSaveReplace = `toast(\`✅ Download complete: \${newTask.title}! Tap "📥 Save" or "▶ Play"\`);\n      try { triggerSaveFile(newTask.id); } catch (_) {}`;
if (content.includes(autoSaveTarget)) {
  content = content.replace(autoSaveTarget, autoSaveReplace);
  console.log('6. Added automatic file save trigger on download completion.');
}

// Save back to index.html with UTF-8 encoding
fs.writeFileSync(indexPath, content, 'utf8');
console.log('7. Successfully saved cleaned UTF-8 index.html.');

// Verify remaining suspicious characters
const remainingBad = [];
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (/[âðÃ]/.test(l) || l.includes('Â·') || l.includes('\uFFFD')) {
    remainingBad.push({ line: i + 1, text: l.trim().substring(0, 100) });
  }
});
console.log('Remaining suspicious lines count in index.html:', remainingBad.length);
if (remainingBad.length > 0) {
  remainingBad.forEach(b => console.log(`L${b.line}: ${b.text}`));
}
