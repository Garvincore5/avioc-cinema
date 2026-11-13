const https = require('https');

https.get('https://aviocwatch.b-cdn.net/tv/bukedde-1.html', (res) => {
  console.log('TV Status code:', res.statusCode);
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    const titleMatch = data.match(/<title>([^<]+)<\/title>/);
    const ogImgMatch = data.match(/property="og:image" content="([^"]+)"/);
    console.log('TV Page Title:', titleMatch ? titleMatch[1] : 'none');
    console.log('TV OpenGraph Poster:', ogImgMatch ? ogImgMatch[1] : 'none');
    if (ogImgMatch && ogImgMatch[1]) {
      https.get(ogImgMatch[1], (imgRes) => {
        console.log('TV Poster HTTP Status:', imgRes.statusCode);
      });
    }
  });
}).on('error', console.error);
