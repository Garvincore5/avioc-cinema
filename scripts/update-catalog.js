const fs = require('fs');

// 1. Update catalog-data.json
const catalogPath = './new body/catalog-data.json';
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

const upload = catalog.find(d => d.id === 'upload-prime');
if (upload) {
  upload.vj = 'English';
  if (upload.seasons) {
    upload.seasons.forEach(s => s.episodes.forEach(e => e.vj = 'English'));
  }
  console.log('Updated upload-prime in catalog-data.json');
}

const adw = catalog.find(d => d.id === 'a-different-world');
if (adw) {
  adw.vj = 'VJ Junior';
  if (adw.seasons) {
    adw.seasons.forEach(s => s.episodes.forEach(e => e.vj = 'VJ Junior'));
  }
  console.log('Updated a-different-world in catalog-data.json');
}

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');

// 2. Update index.html
let indexHtml = fs.readFileSync('./index.html', 'utf8');

// Replace SOURCE_CATALOG in index.html with new catalog JSON
const catalogMarker = 'const SOURCE_CATALOG=';
const startCatalog = indexHtml.indexOf(catalogMarker);
if (startCatalog !== -1) {
  const endCatalog = indexHtml.indexOf(';\nconst TITLES=SOURCE_CATALOG;', startCatalog);
  if (endCatalog !== -1) {
    const newCatalogJson = JSON.stringify(catalog);
    indexHtml = indexHtml.slice(0, startCatalog + catalogMarker.length) + newCatalogJson + indexHtml.slice(endCatalog);
    console.log('Successfully replaced SOURCE_CATALOG in index.html');
  } else {
    console.log('Could not find end of SOURCE_CATALOG in index.html');
  }
} else {
  console.log('Could not find start of SOURCE_CATALOG in index.html');
}

fs.writeFileSync('./index.html', indexHtml, 'utf8');
console.log('Done updating catalog in files.');
