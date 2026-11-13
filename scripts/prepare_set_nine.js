const fs = require('fs');
const path = require('path');

const project = 'E:/code/avioc cinema';
const source = 'E:/downloads/set nine';
const catalogPath = path.join(project, 'new body/catalog-data.json');
const posterDir = path.join(project, 'assets/posters');
const base = 'https://aviocwatch.b-cdn.net/';
const segment = (s) => encodeURIComponent(s);
const mediaUrl = (remote) => base + remote.split('/').map(segment).join('/');
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function downloadPoster(name, url) {
  const dest = path.join(posterDir, name);
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Poster ${name}: HTTP ${res.status}`);
  const type = res.headers.get('content-type') || '';
  if (!type.startsWith('image/')) throw new Error(`Poster ${name}: unexpected ${type}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < 2500) throw new Error(`Poster ${name}: response too small`);
  fs.writeFileSync(dest, bytes);
  console.log(`Downloaded poster ${name} (${Math.round(bytes.length / 1024)} KB)`);
}

function videoFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return videoFiles(full);
    return /\.(mp4|mkv)$/i.test(entry.name) ? [full] : [];
  });
}

function episodesFor(folder, remoteFolder) {
  return videoFiles(path.join(source, folder)).map((full, index) => {
    const file = path.basename(full);
    const match = file.match(/S(\d+)E(\d+)/i);
    const seasonNumber = match ? Number(match[1]) : 1;
    const n = match ? Number(match[2]) : index + 1;
    return {
      full,
      seasonNumber,
      episode: { n, name: `Episode ${n}`, min: 0, streamUrl: mediaUrl(`${remoteFolder}/${file}`), vj: 'VJ Junior' }
    };
  }).sort((a, b) => a.seasonNumber - b.seasonNumber || a.episode.n - b.episode.n);
}

function seasonsFromEpisodes(items) {
  const bySeason = new Map();
  for (const item of items) {
    if (!bySeason.has(item.seasonNumber)) bySeason.set(item.seasonNumber, []);
    bySeason.get(item.seasonNumber).push(item.episode);
  }
  return [...bySeason].map(([seasonNumber, episodes]) => ({ seasonNumber, episodes }));
}

function seriesItem({ id, title, year, genres, poster, synopsis, cast = [], region, episodes, folder, vj = 'VJ Junior' }) {
  const remoteFolder = `movies/set-nine/${slug(title)}`;
  const items = episodesFor(folder, remoteFolder);
  return {
    id, title, type: 'series', year: String(year), yearNum: year, rating: 0, len: 0,
    genres, moods: ['heart'], vj, isTrending: false, isFeatured: false, isJustAdded: true,
    synopsis, cast, poster, backdrop: poster, streamUrl: '', seasons: seasonsFromEpisodes(items),
    order: -1, stars: '', region: region || undefined,
  };
}

function filmItem({ id, title, year, genres, poster, synopsis, files, region, vj = 'VJ Junior', len = 0 }) {
  const remoteFolder = `movies/set-nine/${region ? 'african' : 'films'}/${slug(title)}`;
  const urls = files.map((file) => mediaUrl(`${remoteFolder}/${path.basename(file)}`));
  return {
    id, title, type: 'film', year: String(year || ''), yearNum: year || 0, rating: 0, len,
    genres, moods: ['wired'], vj, isTrending: false, isFeatured: false, isJustAdded: true,
    synopsis, cast: [], poster, backdrop: poster, streamUrl: urls[0],
    parts: files.length, partTitles: files.length > 1 ? files.map((_, i) => `${title} - Part ${i + 1}`) : undefined,
    partUrls: files.length > 1 ? urls : undefined, seasons: [], order: -1, stars: '', region: region || undefined,
  };
}

async function main() {
  fs.mkdirSync(posterDir, { recursive: true });

  // Keep the poster images the user supplied with this download set.
  const supplied = [
    ['bait.jpg', 'bait_set_nine.jpg'],
    ['bhooth bangla.jpeg', 'bhooth_bangla.jpg'],
    ['carrie.webp', 'carrie_set_nine.webp'],
    ['flower crew.jpg', 'flower_crew.jpg'],
    ['vission.jpg', 'visionquest.jpg'],
  ];
  for (const [from, to] of supplied) fs.copyFileSync(path.join(source, 'posters', from), path.join(posterDir, to));

  const downloaded = [
    ['abraham_lincoln_vs_zombies_set_nine.jpg', 'https://resizing.flixster.com/-XZAfHZM39UwaGJIFWKAE8fS0ak%3D/v3/t/assets/p9132585_p_v8_ad.jpg'],
    ['animals_set_nine.jpg', 'https://image.tmdb.org/t/p/original/i2nfVNvDTyqe9RLg2Vm3gDopH2U.jpg'],
    ['blood_creek_set_nine.jpg', 'https://m.media-amazon.com/images/M/MV5BMTkwNzMzNzA0OF5BMl5BanBnXkFtZTcwNjQ0NDM1Mw%40%40._V1_.jpg'],
    ['by_any_means_set_nine.jpg', 'https://imgix.hoyts.com.au/mx/posters/au/by-any-means-953be1fc.jpg'],
    ['hobbs_and_shaw_set_nine.webp', 'https://resizing.flixster.com/3junDUcLJvCox0F3MpWAm7zDSbg%3D/ems.cHJkLWVtcy1hc3NldHMvbW92aWVzL2Q5ODY2MDc2LTBhNzktNDg2Ni04MWE2LTAzNzZlNTM1ODQxYi53ZWJw'],
    ['safe_set_nine.jpg', 'https://image.tmdb.org/t/p/original/An5cTuw8RmY232n1Dx21z1bXz1o.jpg'],
    ['shadow_master_set_nine.jpg', 'https://media.senscritique.com/media/000021371999/0/shadow_master.jpg'],
    ['status_update_set_nine.jpg', 'https://image.tmdb.org/t/p/original/3GnPqZ71PLiOeru3zSoFvFB9peL.jpg'],
    ['dark_side_of_the_sun_set_nine.jpg', 'https://resizing.flixster.com/-XZAfHZM39UwaGJIFWKAE8fS0ak%3D/v3/t/assets/p21760_v_v12_ab.jpg'],
    ['mortuary_collection_set_nine.jpg', 'https://resizing.flixster.com/bRH_4y690uXaIQndVOv6AFZto8M%3D/ems.cHJkLWVtcy1hc3NldHMvbW92aWVzLzUyMmI3NjcyLTBmMzQtNDYwYS05YmRiLTA2YWY3MWJiMzNlNi5qcGc%3D'],
    ['damalie.jpg', 'https://cdn-pearlmagicprime.dstv.com/images/000/003/134/original/Untitled_design_-_2023-09-04T105201.108.jpg'],
    ['hanged_for_love.jpg', 'https://m.media-amazon.com/images/M/MV5BMjM3NjkwMzEzOF5BMl5BanBnXkFtZTgwNDQ5MTczNTE%40._V1_.jpg'],
  ];
  for (const [name, url] of downloaded) {
    try { await downloadPoster(name, url); }
    catch (err) { console.warn(`Poster download skipped: ${name}: ${err.message}`); }
  }

  // Namwandu has no verifiable poster image in the available catalog/search results,
  // so make a branded title card rather than use unrelated artwork.
  fs.writeFileSync(path.join(posterDir, 'namwandu_uganda.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#182d2b"/><stop offset=".55" stop-color="#8f4d2d"/><stop offset="1" stop-color="#ed9a3a"/></linearGradient><radialGradient id="r"><stop stop-color="#f4ca77" stop-opacity=".72"/><stop offset="1" stop-color="#f4ca77" stop-opacity="0"/></radialGradient></defs><rect width="600" height="900" fill="url(#g)"/><circle cx="300" cy="330" r="270" fill="url(#r)"/><path d="M0 620Q140 510 260 640T600 580V900H0Z" fill="#101820" opacity=".78"/><path d="M0 700Q160 610 300 710T600 650" fill="none" stroke="#e6b15c" stroke-width="3" opacity=".7"/><text x="300" y="740" text-anchor="middle" fill="#fff4df" font-family="Georgia,serif" font-size="58" letter-spacing="8">NAMWANDU</text><text x="300" y="794" text-anchor="middle" fill="#f4bd66" font-family="Arial,sans-serif" font-size="18" letter-spacing="5">UGANDAN CINEMA</text></svg>`);

  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const existing = new Map(catalog.map((item) => [item.id, item]));
  const startOrder = Math.max(...catalog.map((item) => Number(item.order) || 0)) + 1;
  const additions = [];
  const add = (item) => { item.order = startOrder + additions.length; additions.push(item); };

  const filmSpecs = [
    ['abraham-lincoln-vs-zombies-set-nine', 'Abraham Lincoln vs. Zombies', 2012, ['Horror','Action'], 'assets/posters/abraham_lincoln_vs_zombies_set_nine.jpg', 'President Abraham Lincoln leads a small team against a Confederate zombie threat during the Civil War.', 'Abraham_Lincoln_vs_Zombies_VJ_Emmy.mp4', 96, 'VJ Emmy'],
    ['animals-set-nine', 'Animals', 0, ['Drama','Thriller'], 'assets/posters/animals_set_nine.jpg', 'A dark drama about people confronting the consequences of their choices.', 'Animals_VJ_Junior.mp4', 0, 'VJ Junior'],
    ['blood-creek-set-nine', 'Blood Creek', 2009, ['Horror','Thriller'], 'assets/posters/blood_creek_set_nine.jpg', 'Two brothers return to a remote family farm and uncover a terrifying secret tied to occult experiments.', 'Blood_Creek_VJ_Junior.mp4', 90, 'VJ Junior'],
    ['by-any-means-set-nine', 'By Any Means', 2026, ['Crime','Thriller','Drama'], 'assets/posters/by_any_means_set_nine.jpg', 'A determined investigator turns to an unlikely partner to pursue a dangerous criminal case.', 'By_Any_Means_VJ_Junior.mp4', 0, 'VJ Junior'],
    ['hobbs-and-shaw-set-nine', 'Fast & Furious Presents: Hobbs & Shaw', 2019, ['Action','Adventure','Comedy'], 'assets/posters/hobbs_and_shaw_set_nine.webp', 'Luke Hobbs and Deckard Shaw join forces to stop a threat that puts the world at risk.', 'Fast_Furious_Presents_Hobbs_Shaw_VJ_Junior.mp4', 137, 'VJ Junior'],
    ['safe-set-nine', 'Safe', 2012, ['Action','Thriller','Crime'], 'assets/posters/safe_set_nine.jpg', 'A former elite agent protects a young girl whose memory holds a valuable code.', 'Safe_VJ_Junior.mp4', 94, 'VJ Junior'],
    ['shadow-master-set-nine', 'Shadow Master', 2022, ['Action','Fantasy','Martial Arts'], 'assets/posters/shadow_master_set_nine.jpg', 'A martial artist gains animal-inspired powers and fights the forces threatening his city.', 'Shadow_Master_VJ_Junior.mp4', 90, 'VJ Junior'],
    ['status-update-set-nine', 'Status Update', 2018, ['Comedy','Fantasy','Romance'], 'assets/posters/status_update_set_nine.jpg', 'A teenager discovers an app that makes his social media updates come true.', 'Status_Update_VJ_Junior.mp4', 106, 'VJ Junior'],
    ['dark-side-of-the-sun-set-nine', 'The Dark Side of the Sun', 1988, ['Drama','Romance'], 'assets/posters/dark_side_of_the_sun_set_nine.jpg', 'A young man living with a rare skin condition sets out in search of freedom and love.', 'The_Dark_Side_of_the_Sun_VJ_Junior.mp4', 101, 'VJ Junior'],
    ['mortuary-collection-set-nine', 'The Mortuary Collection', 2019, ['Horror','Fantasy'], 'assets/posters/mortuary_collection_set_nine.jpg', 'A mortician tells a visitor a series of macabre stories from the people who passed through his funeral home.', 'The_Mortuary_Collection_VJ_Junior.mp4', 108, 'VJ Junior'],
  ];
  for (const [id,title,year,genres,poster,synopsis,file,len,vj] of filmSpecs) {
    const full = path.join(source, file);
    add(filmItem({ id, title, year, genres, poster, synopsis, files: [full], len, vj }));
  }

  const regionalSeries = [
    seriesItem({ id:'damalie-uganda', title:'Damalie', year:2023, genres:['Drama','Family'], poster:'assets/posters/damalie.jpg', synopsis:'A Ugandan family drama follows Damalie as she tries to conceal a web of secrets after her husband returns home from medical training abroad.', cast:['Doreen Mirembe','Denis Kinani','Ssewanyana Arthur','Phillip Luswata'], region:'African', folder:'binauganda/damalie' }),
    seriesItem({ id:'hanged-for-love-uganda', title:'Hanged for Love', year:2014, genres:['Drama','Romance'], poster:'assets/posters/hanged_for_love.jpg', synopsis:'A Ugandan drama about love, relationships, and the choices that shape a family.', region:'African', folder:'binauganda/hanged for love' }),
  ];
  for (const item of regionalSeries) add(item);

  const namwandu = path.join(source, 'binauganda/namwandu/s0_m_namwandu-part-1.mp4');
  add(filmItem({ id:'namwandu-uganda', title:'Namwandu', year:0, genres:['Drama'], poster:'assets/posters/namwandu_uganda.svg', synopsis:'A Ugandan film, presented in Luganda.', files:[namwandu], region:'African', vj:'VJ Junior' }));

  add(seriesItem({ id:'bait-set-nine', title:'Bait', year:2026, genres:['Comedy','Drama'], poster:'assets/posters/bait_set_nine.jpg', synopsis:'A comedy-drama series about an actor navigating a high-stakes audition and the chaos surrounding it.', folder:'bait' }));
  add(seriesItem({ id:'flower-crew-joseon-marriage-agency', title:'Flower Crew: Joseon Marriage Agency', year:2019, genres:['Romance','Comedy','Historical'], poster:'assets/posters/flower_crew.jpg', synopsis:'A group of Joseon-era matchmakers take on a royal request that changes the lives of their clients.', folder:'flower crew' }));
  const bhoothFiles = videoFiles(path.join(source, 'indian')).sort();
  add(filmItem({ id:'bhooth-bangla-set-nine', title:'Bhooth Bangla', year:2026, genres:['Horror','Comedy'], poster:'assets/posters/bhooth_bangla.jpg', synopsis:'A horror-comedy set around a haunted mansion.', files:bhoothFiles, vj:'VJ Junior' }));
  add(seriesItem({ id:'visionquest-set-nine', title:'VisionQuest', year:2026, genres:['Sci-Fi','Drama','Superhero'], poster:'assets/posters/visionquest.jpg', synopsis:'Marvel’s Vision faces the question of what it means to be human after regaining his memories.', folder:'vission' }));

  // The catalog already contains Carrie; append the downloaded third episode to its first season.
  const carrie = existing.get('carrie-2026');
  if (carrie) {
    const ep = episodesFor('carrie', 'movies/set-nine/carrie')[0];
    const s1 = carrie.seasons.find((s) => s.seasonNumber === 1);
    if (s1 && !s1.episodes.some((e) => e.n === ep.episode.n)) s1.episodes.push(ep.episode);
    carrie.seasons.forEach((s) => s.episodes.sort((a,b) => a.n-b.n));
    carrie.poster = 'assets/posters/carrie_set_nine.webp';
    carrie.backdrop = carrie.poster;
  }

  for (const item of additions) {
    if (existing.has(item.id)) throw new Error(`Duplicate catalog id ${item.id}`);
    catalog.push(item);
  }
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');

  const indexPath = path.join(project, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  const marker = 'const SOURCE_CATALOG=';
  const start = html.indexOf(marker);
  const end = html.indexOf(';\nconst TITLES=SOURCE_CATALOG;', start);
  if (start < 0 || end < 0) throw new Error('Could not locate embedded catalog');
  const serialized = JSON.stringify(catalog);
  html = html.slice(0, start + marker.length) + serialized + html.slice(end);
  html = html.replace('<button class="cinema-tab" type="button" disabled aria-label="African section coming soon">African</button>', '<button class="cinema-tab" data-v="african">African</button>');
  const oldViews = 'const cinemaViews=["cinema","films","series","new"];';
  html = html.replace(oldViews, 'const cinemaViews=["cinema","films","series","new","african"];');
  const viewMarker = 'else if(state.view==="new")html=gridView("New &amp; More",applyFilters(TITLES),filtersOn()?"No titles match these filters yet.":"");';
  const africanBranch = 'else if(state.view==="african")html=gridView("African Films &amp; Series",applyFilters(TITLES.filter(t=>t.region==="African")),"No African films or series are listed yet.");';
  if (!html.includes(viewMarker)) throw new Error('Could not locate New & More view branch');
  html = html.replace(viewMarker, viewMarker + '\n  ' + africanBranch);
  fs.writeFileSync(indexPath, html);
  fs.copyFileSync(indexPath, path.join(project, 'firebase-public/index.html'));

  console.log(`Catalog ready: ${catalog.length} entries (${additions.length} new; Carrie now has its third episode).`);
  console.log(`New African entries: ${regionalSeries.length} series and Namwandu film.`);
  console.log(`Completed videos to upload: ${videoFiles(source).length}; incomplete downloads are excluded.`);
}

main().catch((err) => { console.error(err.message); process.exitCode = 1; });
