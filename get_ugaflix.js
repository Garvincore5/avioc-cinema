async function inspectHtml() {
  const pages = [
    { id: 'furious_attack', url: 'https://ugaflix.com/movies/furious-attack' },
    { id: 'affection', url: 'https://ugaflix.com/movies/affection' },
    { id: 'tarung_unforgiven', url: 'https://ugaflix.com/movies/tarung-unforgiven' }
  ];
  for (const p of pages) {
    try {
      const res = await fetch(p.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await res.text();
      const imgs = [...html.matchAll(/<img[^>]+src="([^"]+)"/gi)].map(m => m[1]);
      console.log(`[${p.id}] Images:`, imgs.filter(x => !x.includes('logo') && !x.includes('icon')));
    } catch(e) {
      console.log(p.id, e.message);
    }
  }
}
inspectHtml();
