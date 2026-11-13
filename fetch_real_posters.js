const fs = require('fs');
const path = require('path');

const targets = [
  { id: 'the-fix', query: 'The Fix 2024 movie poster Grace Van Dien' },
  { id: 'ice-cream-man', query: 'Ice Cream Man 1995 movie poster Clint Howard' },
  { id: 'shaka-zulu', query: 'Shaka Zulu 1986 series poster Henry Cele' },
  { id: 'upload-prime', query: 'Upload 2020 tv series poster Robbie Amell' },
  { id: 'ittefaq', query: 'Ittefaq 2017 movie poster Sidharth Malhotra' },
  { id: 'luck-key', query: 'Luck Key 2016 Korean movie poster Yoo Hae-jin' },
  { id: 'a-day', query: 'A Day 2017 Korean movie poster Kim Myung-min' },
  { id: 'the-comeback', query: 'The Comeback 2020 movie poster' },
  { id: 'bikini-model-academy', query: 'Bikini Model Academy 2015 movie poster' },
  { id: 'one-night-only', query: 'One Night Only 2016 movie poster Aaron Kwok' },
  { id: 'weapons-2025', query: 'Weapons 2026 Zach Cregger movie poster' },
  { id: 'drishyam', query: 'Drishyam 2015 movie poster Ajay Devgn' },
  { id: 'affection-2026', query: 'Affection 2026 movie poster' },
  { id: 'furious-attack', query: 'Furious Attack movie poster' },
  { id: 'one-last-shot', query: 'One Last Shot movie poster' },
  { id: 'tarung-unforgiven', query: 'Tarung movie poster' },
  { id: 'the-girl-in-the-river', query: 'The Girl in the River movie poster' },
  { id: 'sheep-detectives', query: 'Sheep Detectives movie poster' },
  { id: 'love-me-love-me-2026', query: 'Love Me Love Me movie poster' },
  { id: 'the-love-hypothesis', query: 'The Love Hypothesis movie poster' },
  { id: 'i-will-find-you', query: 'I Will Find You Harlan Coben poster' }
];

async function getPosterFor(target) {
  try {
    const searchUrl = 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(target.query + ' poster site:imdb.com OR site:themoviedb.org OR site:pinterest.com');
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const html = await res.text();
    
    // Look for image links or direct urls in html
    const matches = [...html.matchAll(/uddg=([^&"]+)/g)].map(m => decodeURIComponent(m[1]));
    console.log(`[${target.id}] Top link:`, matches[0]);
    return { id: target.id, links: matches.slice(0, 3) };
  } catch (e) {
    console.error(`Error for ${target.id}:`, e.message);
    return null;
  }
}

async function main() {
  const results = [];
  for (const t of targets) {
    const res = await getPosterFor(t);
    if (res) results.push(res);
  }
  fs.writeFileSync('poster_search_results.json', JSON.stringify(results, null, 2));
}

main();
