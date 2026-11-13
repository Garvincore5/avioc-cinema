const fs = require('fs');
const path = require('path');

const posterDir = path.join(__dirname, 'assets', 'posters');

async function download(url, dest) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    console.log(`✓ Saved ${dest} (${buf.length} bytes)`);
    return true;
  } catch (e) {
    console.error(`✕ Failed: ${e.message}`);
    return false;
  }
}

async function main() {
  // Sweet tooth
  const stUrl = 'https://upload.wikimedia.org/wikipedia/en/5/59/Sweet_Tooth_%28TV_series%29_Title_Card.png';
  await download(stUrl, path.join(posterDir, 'sweet_tooth.jpg'));

  // Exquisite Bodyguard from baike
  try {
    const res = await fetch('https://baike.baidu.com/item/%E7%BB%9D%E8%89%B2%E4%BF%9D%E9%95%96/63704257', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const html = await res.text();
    const m = html.match(/https:\/\/bkimg\.cdn\.bcebos\.com\/pic\/[^\s"']+/);
    if (m) {
      console.log('Found baike img:', m[0]);
      await download(m[0], path.join(posterDir, 'exquisite_bodyguard.jpg'));
    }
  } catch(e) {
    console.error('Baike error:', e.message);
  }
}

main();
