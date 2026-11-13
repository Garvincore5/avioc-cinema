const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const catalogPath = path.join(root, 'new body', 'catalog-data.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const today = new Date().toISOString().split('T')[0];

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

const baseUrls = [
  { loc: 'https://avioc-cinema.web.app/', priority: '1.0', changefreq: 'daily' },
  { loc: 'https://avioc-cinema.web.app/?v=films', priority: '0.9', changefreq: 'daily' },
  { loc: 'https://avioc-cinema.web.app/?v=series', priority: '0.9', changefreq: 'daily' },
  { loc: 'https://avioc-cinema.web.app/?v=tv', priority: '0.8', changefreq: 'daily' },
  { loc: 'https://avioc-cinema.web.app/?v=new', priority: '0.8', changefreq: 'daily' }
];

baseUrls.forEach(u => {
  xml += '  <url>\n';
  xml += `    <loc>${u.loc}</loc>\n`;
  xml += `    <lastmod>${today}</lastmod>\n`;
  xml += `    <changefreq>${u.changefreq}</changefreq>\n`;
  xml += `    <priority>${u.priority}</priority>\n`;
  xml += '  </url>\n';
});

catalog.forEach(item => {
  xml += '  <url>\n';
  xml += `    <loc>https://avioc-cinema.web.app/m/${encodeURIComponent(item.id)}.html</loc>\n`;
  xml += `    <lastmod>${today}</lastmod>\n`;
  xml += '    <changefreq>weekly</changefreq>\n';
  xml += '    <priority>0.8</priority>\n';
  xml += '  </url>\n';
});

xml += '</urlset>\n';

fs.writeFileSync(path.join(root, 'sitemap.xml'), xml);
const pubSitemap = path.join(root, 'firebase-public', 'sitemap.xml');
if (fs.existsSync(path.join(root, 'firebase-public'))) {
  fs.writeFileSync(pubSitemap, xml);
}

console.log(`Generated sitemap.xml with ${baseUrls.length + catalog.length} total URLs.`);
