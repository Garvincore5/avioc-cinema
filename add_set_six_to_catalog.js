const fs = require('fs');
const path = require('path');

const newTitles = [
  {
    id: "dark-wolf-junior",
    title: "The Terminal List: Dark Wolf (VJ Junior)",
    type: "series",
    year: "2025 - 2026",
    yearNum: 2026,
    rating: 9.3,
    len: 4,
    genres: ["Action", "Military", "Thriller", "Crime"],
    moods: ["wired", "mind"],
    vj: "VJ Junior",
    isTrending: true,
    isFeatured: true,
    isJustAdded: true,
    synopsis: "Created by Jack Carr and David DiGilio. High-octane prequel following Navy SEAL Ben Edwards (Taylor Kitsch) into the darkest operations of Special Warfare and CIA covert black ops. Co-starring Chris Pratt and Luke Hemsworth. Narrated with blistering firepower by VJ Junior.",
    cast: ["Taylor Kitsch", "Chris Pratt", "Luke Hemsworth", "Tom Hopper", "Dar Salim", "VJ Junior Voiceover"],
    poster: "assets/posters/the_terminal_list_dark_wolf.jpg",
    backdrop: "assets/posters/the_terminal_list_dark_wolf.jpg",
    streamUrl: "",
    parts: 1,
    seasons: [
      {
        seasonNumber: 1,
        episodes: [
          { n: 1, name: "Episode 1: The Outskirts", min: 62, streamUrl: "https://aviocwatch.b-cdn.net/movies/the_terminal_list_dark_wolf_vj_junior_s01e01.mp4", vj: "VJ Junior" },
          { n: 2, name: "Episode 2: Blood on the Sand", min: 52, streamUrl: "https://aviocwatch.b-cdn.net/movies/the_terminal_list_dark_wolf_vj_junior_s01e02.mp4", vj: "VJ Junior" },
          { n: 3, name: "Episode 3: Target Confirmed", min: 53, streamUrl: "https://aviocwatch.b-cdn.net/movies/the_terminal_list_dark_wolf_vj_junior_s01e03.mp4", vj: "VJ Junior" },
          { n: 4, name: "Episode 4: Black Ops", min: 46, streamUrl: "https://aviocwatch.b-cdn.net/movies/the_terminal_list_dark_wolf_vj_junior_s01e04.mp4", vj: "VJ Junior" }
        ]
      }
    ],
    order: 86,
    stars: "9.3"
  },
  {
    id: "dark-wolf-icp",
    title: "The Terminal List: Dark Wolf (VJ Ice P)",
    type: "series",
    year: "2025 - 2026",
    yearNum: 2026,
    rating: 9.2,
    len: 6,
    genres: ["Action", "Military", "Thriller", "Crime"],
    moods: ["wired", "mind"],
    vj: "VJ Ice P",
    isTrending: true,
    isFeatured: false,
    isJustAdded: true,
    synopsis: "The explosive Navy SEAL covert ops series The Terminal List: Dark Wolf narrated in full high-octane commentary by VJ Ice P. Follow Ben Edwards and James Reece through deadly combat missions and psychological warfare across 6 full episodes.",
    cast: ["Taylor Kitsch", "Chris Pratt", "Luke Hemsworth", "Tom Hopper", "Dar Salim", "VJ Ice P Voiceover"],
    poster: "assets/posters/the_terminal_list_dark_wolf.jpg",
    backdrop: "assets/posters/the_terminal_list_dark_wolf.jpg",
    streamUrl: "",
    parts: 1,
    seasons: [
      {
        seasonNumber: 1,
        episodes: [
          { n: 1, name: "Episode 1: The Awakening", min: 68, streamUrl: "https://aviocwatch.b-cdn.net/movies/the_terminal_list_dark_wolf_vj_icp_s01e01.mp4", vj: "VJ Ice P" },
          { n: 2, name: "Episode 2: Deep Extraction", min: 56, streamUrl: "https://aviocwatch.b-cdn.net/movies/the_terminal_list_dark_wolf_vj_icp_s01e02.mp4", vj: "VJ Ice P" },
          { n: 3, name: "Episode 3: Iron Cross", min: 56, streamUrl: "https://aviocwatch.b-cdn.net/movies/the_terminal_list_dark_wolf_vj_icp_s01e03.mp4", vj: "VJ Ice P" },
          { n: 4, name: "Episode 4: Infiltration", min: 49, streamUrl: "https://aviocwatch.b-cdn.net/movies/the_terminal_list_dark_wolf_vj_icp_s01e04.mp4", vj: "VJ Ice P" },
          { n: 5, name: "Episode 5: Red Line", min: 55, streamUrl: "https://aviocwatch.b-cdn.net/movies/the_terminal_list_dark_wolf_vj_icp_s01e05.mp4", vj: "VJ Ice P" },
          { n: 6, name: "Episode 6: Final Stand", min: 57, streamUrl: "https://aviocwatch.b-cdn.net/movies/the_terminal_list_dark_wolf_vj_icp_s01e06.mp4", vj: "VJ Ice P" }
        ]
      }
    ],
    order: 87,
    stars: "9.2"
  },
  {
    id: "coma-2020",
    title: "Coma (2020)",
    type: "film",
    year: "2020",
    yearNum: 2020,
    rating: 8.9,
    len: 111,
    genres: ["Sci-Fi", "Action", "Fantasy", "Mystery"],
    moods: ["mind", "wired"],
    vj: "VJ Ulio",
    isTrending: true,
    isFeatured: false,
    isJustAdded: true,
    synopsis: "After a colossal and mysterious accident, a gifted young architect awakens in an extraordinary, fragmented world constructed from the memories and subconscious dreams of people suspended in deep comas. Translated with gripping suspense by VJ Ulio.",
    cast: ["Rinal Mukhametov", "Lyubov Aksyonova", "Anton Pampushnyy", "Milos Bikovic", "VJ Ulio Voiceover"],
    poster: "assets/posters/coma.jpg",
    backdrop: "assets/posters/coma.jpg",
    streamUrl: "https://aviocwatch.b-cdn.net/movies/coma_vj_ulio.mp4",
    parts: 1,
    seasons: [],
    order: 88,
    stars: "8.9"
  },
  {
    id: "enola-holmes",
    title: "Enola Holmes (Parts 1 to 3 Complete)",
    type: "film",
    year: "2020 - 2024",
    yearNum: 2024,
    rating: 9.1,
    len: 124,
    genres: ["Mystery", "Adventure", "Comedy", "Crime"],
    moods: ["mind", "laugh", "heart"],
    vj: "VJ Ulio",
    isTrending: true,
    isFeatured: true,
    isJustAdded: true,
    synopsis: "The sensational detective saga following Sherlock Holmes' rebellious teenage sister Enola (Millie Bobby Brown) as she solves breathtaking conspiracies and outwits masterminds across Victorian London. Complete 3-part saga translated by VJ Ulio.",
    cast: ["Millie Bobby Brown", "Henry Cavill", "Sam Claflin", "Helena Bonham Carter", "Louis Partridge", "VJ Ulio Voiceover"],
    poster: "assets/posters/enola_holmes.jpg",
    backdrop: "assets/posters/enola_holmes.jpg",
    streamUrl: "https://aviocwatch.b-cdn.net/movies/enola_holmes_part1_vj_ulio.mp4",
    parts: 3,
    partTitles: [
      "Enola Holmes: The Disappearing Mother (Part 1 - VJ Ulio)",
      "Enola Holmes: The Match Factory Mystery (Part 2 - VJ Ulio)",
      "Enola Holmes: The Royal Conspiracy (Part 3 - VJ Ulio)"
    ],
    partUrls: [
      "https://aviocwatch.b-cdn.net/movies/enola_holmes_part1_vj_ulio.mp4",
      "https://aviocwatch.b-cdn.net/movies/enola_holmes_part2_vj_ulio.mp4",
      "https://aviocwatch.b-cdn.net/movies/enola_holmes_part3_vj_ulio.mp4"
    ],
    seasons: [],
    order: 89,
    stars: "9.1"
  },
  {
    id: "husbands-in-action",
    title: "Husbands in Action (2026)",
    type: "film",
    year: "2026",
    yearNum: 2026,
    rating: 9.0,
    len: 109,
    genres: ["Action", "Comedy", "Crime"],
    moods: ["laugh", "wired", "heart"],
    vj: "VJ Ulio",
    isTrending: true,
    isFeatured: false,
    isJustAdded: true,
    synopsis: "When a fierce drug syndicate kidnaps their family, a grizzled narcotics detective ex-husband and a gentle veterinarian current husband are forced into a chaotic, hilarious, and action-packed rescue mission. Hilariously translated by VJ Ulio.",
    cast: ["Jin Seon-kyu", "Gong Myung", "Kim Ji-seok", "Yoon Kyung-ho", "Kang Han-na", "VJ Ulio Voiceover"],
    poster: "assets/posters/husbands_in_action.jpg",
    backdrop: "assets/posters/husbands_in_action.jpg",
    streamUrl: "https://aviocwatch.b-cdn.net/movies/husbands_in_action_vj_ulio.mp4",
    parts: 1,
    seasons: [],
    order: 90,
    stars: "9.0"
  },
  {
    id: "the-kings-warden",
    title: "The King's Warden (2026)",
    type: "film",
    year: "2026",
    yearNum: 2026,
    rating: 9.3,
    len: 117,
    genres: ["Historical", "Drama", "Action"],
    moods: ["heart", "mind"],
    vj: "VJ Ulio",
    isTrending: true,
    isFeatured: true,
    isJustAdded: true,
    synopsis: "In 1457 Joseon, a poor mountain village chief hosts an exiled royal guest to bring fortune to his people, discovering his guest is actually the deposed young King Danjong. An extraordinary, deep bond of protection and destiny forms between them. Masterfully translated by VJ Ulio.",
    cast: ["Yoo Hae-jin", "Park Ji-hoon", "Yoo Ji-tae", "Jeon Mi-do", "VJ Ulio Voiceover"],
    poster: "assets/posters/the_kings_warden.jpg",
    backdrop: "assets/posters/the_kings_warden.jpg",
    streamUrl: "https://aviocwatch.b-cdn.net/movies/the_kings_warden_vj_ulio.mp4",
    parts: 1,
    seasons: [],
    order: 91,
    stars: "9.3"
  },
  {
    id: "the-uprising",
    title: "The Uprising (2024)",
    type: "film",
    year: "2024",
    yearNum: 2024,
    rating: 9.2,
    len: 128,
    genres: ["Action", "Martial Arts", "Historical", "Drama"],
    moods: ["wired", "heart"],
    vj: "VJ Ulio",
    isTrending: true,
    isFeatured: true,
    isJustAdded: true,
    synopsis: "Set in the tumultuous Joseon dynasty during wartime chaos, two childhood friends who grew up on opposite sides of class divide—a slave with unparalleled martial prowess and his high-born master—reunite on opposing battle lines. Translated with legendary power by VJ Ulio.",
    cast: ["Gang Dong-won", "Park Jeong-min", "Cha Seung-won", "Kim Shin-rok", "Jin Seon-kyu", "VJ Ulio Voiceover"],
    poster: "assets/posters/the_uprising.jpg",
    backdrop: "assets/posters/the_uprising.jpg",
    streamUrl: "https://aviocwatch.b-cdn.net/movies/the_uprising_vj_ulio.mp4",
    parts: 1,
    seasons: [],
    order: 92,
    stars: "9.2"
  },
  {
    id: "wheelman",
    title: "Wheelman (2017)",
    type: "film",
    year: "2017",
    yearNum: 2017,
    rating: 8.8,
    len: 82,
    genres: ["Action", "Crime", "Thriller"],
    moods: ["wired", "mind"],
    vj: "VJ Ulio",
    isTrending: false,
    isFeatured: false,
    isJustAdded: true,
    synopsis: "A getaway driver is thrust into a high-stakes race to survive after a bank robbery goes horribly wrong. With a car full of money and his family on the line, he must find who betrayed him before time runs out. High-adrenaline commentary by VJ Ulio.",
    cast: ["Frank Grillo", "Garret Dillahunt", "Caitlin Carmichael", "Wendy Moniz", "VJ Ulio Voiceover"],
    poster: "assets/posters/wheelman.jpg",
    backdrop: "assets/posters/wheelman.jpg",
    streamUrl: "https://aviocwatch.b-cdn.net/movies/wheelman_vj_ulio.mp4",
    parts: 1,
    seasons: [],
    order: 93,
    stars: "8.8"
  }
];

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/const\s+SOURCE_CATALOG\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) {
    console.warn('SOURCE_CATALOG not found in', filePath);
    return;
  }
  const catalog = JSON.parse(match[1]);
  const existingIds = new Set(catalog.map(t => t.id));
  let added = 0;
  for (const item of newTitles) {
    if (!existingIds.has(item.id)) {
      catalog.push(item);
      existingIds.add(item.id);
      added++;
    }
  }
  const newStr = 'const SOURCE_CATALOG=' + JSON.stringify(catalog) + ';';
  content = content.replace(/const\s+SOURCE_CATALOG\s*=\s*\[[\s\S]*?\];/, newStr);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated', filePath, 'Added', added, 'titles. Total now:', catalog.length);
  return catalog;
}

const updatedCatalog = updateFile('index.html');
if (fs.existsSync('new body/avioc-cinema.html')) {
  updateFile('new body/avioc-cinema.html');
}

// Update catalog-data.json
if (updatedCatalog) {
  fs.writeFileSync('catalog-data.json', JSON.stringify(updatedCatalog, null, 2), 'utf8');
  if (fs.existsSync('new body/catalog-data.json')) {
    fs.writeFileSync('new body/catalog-data.json', JSON.stringify(updatedCatalog, null, 2), 'utf8');
  }
  console.log('Saved catalog-data.json');
}
