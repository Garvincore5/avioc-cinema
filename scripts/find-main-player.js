const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');
lines.forEach((l, i) => {
  if (l.includes('class="pwrap"') || l.includes('class="ptop"') || l.includes('class="pbot"') || l.includes('class="pseek"')) {
    console.log(`L${i+1}: ${l.substring(0, 80)}`);
  }
});
