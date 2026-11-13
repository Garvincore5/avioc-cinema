const fs = require('fs');

async function download(url, dest) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    console.log('Successfully saved', dest, '(' + buf.length + ' bytes)');
    return true;
  } catch (e) {
    console.error('Failed to download', dest, ':', e.message);
    return false;
  }
}

async function findFromTmdb(movieId) {
  try {
    const r = await fetch('https://www.themoviedb.org/movie/' + movieId, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const html = await r.text();
    const imgs = [...html.matchAll(/image\.tmdb\.org\/t\/p\/[^\s"'<>]+/g)].map(m => 'https://' + m[0]);
    return [...new Set(imgs)];
  } catch(e) {
    return [];
  }
}

async function main() {
  const comaImgs = await findFromTmdb(556678);
  console.log('Coma images:', comaImgs.slice(0, 5));
  const poster = comaImgs.find(u => u.includes('w500') || u.includes('w600_and_h900') || u.includes('w300'));
  if (poster) {
    await download(poster.replace(/w\d+/, 'w600_and_h900_bestv2'), 'assets/posters/coma.jpg');
  }
}

main();
