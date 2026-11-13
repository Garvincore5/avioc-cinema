const https = require('https');

function checkUrl(url, testFn) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve(testFn(data));
      });
    }).on('error', (err) => resolve('Error: ' + err.message));
  });
}

async function run() {
  const mRes = await checkUrl('https://avioc-cinema.web.app/m/the-four-1.html', (html) => ({
    isWebsiteType: html.includes('property="og:type" content="website"'),
    hasSocialPoster: html.includes('assets/social/the_four_1.jpg')
  }));
  console.log('M/THE-FOUR-1:', mRes);

  const adminRes = await checkUrl('https://avioc-cinema.web.app/admin/index.html', (html) => ({
    hasFixedDashData: html.includes('dashData.topReferrers'),
    hasOldBug: html.includes('d.topReferrers')
  }));
  console.log('ADMIN INDEX:', adminRes);
}

run();
