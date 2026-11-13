const fs = require('fs');
const path = require('path');

const posterDir = path.join(__dirname, 'assets', 'posters');

async function downloadUrl(url, dest) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    console.log(`✓ Saved ${path.basename(dest)} (${(buf.length / 1024).toFixed(1)} KB)`);
    return true;
  } catch(e) {
    console.error(`✕ Failed to download ${dest}:`, e.message);
    return false;
  }
}

async function main() {
  // 1. Sweet tooth official vertical poster
  const sweetToothUrl = 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/rgMfh0V75x5h9guuqWdbf79NW1n.jpg';
  await downloadUrl(sweetToothUrl, path.join(posterDir, 'sweet_tooth.jpg'));

  // 2. Exquisite Bodyguard (绝色保镖)
  try {
    const r = await fetch('https://movie.douban.com/subject/35880407/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const t = await r.text();
    const m = t.match(/https:\/\/img\d+\.doubanio\.com\/view\/photo\/[^\s"']+/);
    if (m) {
      const img = m[0].replace(/\/s_ratio_poster\//, '/l_ratio_poster/');
      console.log('Found Douban poster:', img);
      await downloadUrl(img, path.join(posterDir, 'exquisite_bodyguard.jpg'));
    } else {
      console.log('Douban image not found');
    }
  } catch(e) {
    console.error('Douban fetch error:', e.message);
  }
}

main();
