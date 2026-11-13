const fs = require('fs');
const path = require('path');
const https = require('https');
const { pipeline } = require('stream');

const project = 'E:/code/avioc cinema';
const source = 'E:/downloads/set nine';
const zone = 'aviocwatch';
const statePath = path.join(project, 'backups/set-nine-bunny-upload-state.json');
const deploySource = fs.readFileSync(path.join(project, 'scripts/deploy-app-to-bunny.js'), 'utf8');
const keyMatch = deploySource.match(/const key\s*=\s*'([^']+)'/);
if (!keyMatch) throw new Error('Could not read the existing Bunny deployment credential.');
const key = keyMatch[1];

const rootFilmSlugs = {
  Abraham_Lincoln_vs_Zombies_VJ_Emmy: 'abraham-lincoln-vs-zombies',
  Animals_VJ_Junior: 'animals',
  Blood_Creek_VJ_Junior: 'blood-creek',
  By_Any_Means_VJ_Junior: 'by-any-means',
  Fast_Furious_Presents_Hobbs_Shaw_VJ_Junior: 'fast-furious-presents-hobbs-shaw',
  Safe_VJ_Junior: 'safe',
  Shadow_Master_VJ_Junior: 'shadow-master',
  Status_Update_VJ_Junior: 'status-update',
  The_Dark_Side_of_the_Sun_VJ_Junior: 'the-dark-side-of-the-sun',
  The_Mortuary_Collection_VJ_Junior: 'the-mortuary-collection',
};

function collect(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collect(full);
    return /\.(mp4|mkv)$/i.test(entry.name) ? [full] : [];
  });
}

function remotePathFor(full) {
  const rel = path.relative(source, full).replace(/\\/g, '/');
  const name = path.basename(full);
  if (rel.startsWith('binauganda/damalie/')) return `movies/set-nine/damalie/${name}`;
  if (rel.startsWith('binauganda/hanged for love/')) return `movies/set-nine/hanged-for-love/${name}`;
  if (rel.startsWith('binauganda/namwandu/')) return `movies/set-nine/african/namwandu/${name}`;
  if (rel.startsWith('bait/')) return `movies/set-nine/bait/${name}`;
  if (rel.startsWith('carrie/')) return `movies/set-nine/carrie/${name}`;
  if (rel.startsWith('flower crew/')) return `movies/set-nine/flower-crew-joseon-marriage-agency/${name}`;
  if (rel.startsWith('indian/')) return `movies/set-nine/films/bhooth-bangla/${name}`;
  if (rel.startsWith('vission/')) return `movies/set-nine/visionquest/${name}`;
  if (rel.includes('/')) throw new Error(`No destination folder is defined for ${rel}`);
  const keyName = path.parse(name).name.replace(/\.\d+$/, '');
  const slug = rootFilmSlugs[keyName];
  if (!slug) throw new Error(`No movie title is defined for ${name}`);
  return `movies/set-nine/films/${slug}/${name}`;
}

function encodedStoragePath(remote) {
  return `/${zone}/${remote.split('/').map(encodeURIComponent).join('/')}`;
}

function mimeFor(file) {
  return path.extname(file).toLowerCase() === '.mkv' ? 'video/x-matroska' : 'video/mp4';
}

function uploadAttempt(item, index, total, state, attempt) {
  return new Promise((resolve, reject) => {
    const { full, remote, size } = item;
    const req = https.request({
      hostname: 'storage.bunnycdn.com',
      port: 443,
      path: encodedStoragePath(remote),
      method: 'PUT',
      headers: { AccessKey: key, 'Content-Type': mimeFor(full), 'Content-Length': size },
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          state.completed[remote] = size;
          fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
          console.log(`DONE ${index + 1}/${total}: ${remote} (${(size / 1024 / 1024).toFixed(1)} MB)`);
          resolve();
        } else reject(new Error(`Upload failed for ${remote}: HTTP ${res.statusCode} ${body.slice(0, 300)}`));
      });
    });
    req.setTimeout(15 * 60 * 1000, () => req.destroy(new Error(`Upload timed out for ${remote}`)));
    req.on('error', (err) => {
      if (attempt < 4) {
        console.warn(`Retry ${attempt + 1}/4 for ${remote}: ${err.code || err.message}`);
        setTimeout(() => uploadAttempt(item, index, total, state, attempt + 1).then(resolve, reject), attempt * 3000);
      } else reject(err);
    });
    const stream = fs.createReadStream(full);
    stream.on('error', (err) => req.destroy(err));
    let sent = 0;
    let lastNotice = 0;
    stream.on('data', (chunk) => {
      sent += chunk.length;
      if (sent - lastNotice >= 128 * 1024 * 1024) {
        lastNotice = sent;
        console.log(`PROGRESS ${index + 1}/${total}: ${remote} ${(sent / 1024 / 1024).toFixed(0)}/${(size / 1024 / 1024).toFixed(0)} MB (attempt ${attempt + 1})`);
      }
    });
    stream.pipe(req);
  });
}

function uploadOne(item, index, total, state) {
  return uploadAttempt(item, index, total, state, 0);
}

async function main() {
  const files = collect(source).map((full) => ({ full, remote: remotePathFor(full), size: fs.statSync(full).size }));
  const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : { completed: {} };
  const queue = files.filter((x) => state.completed[x.remote] !== x.size);
  const totalBytes = files.reduce((sum, x) => sum + x.size, 0);
  console.log(`Bunny upload: ${files.length} completed video files, ${(totalBytes / 1024 ** 3).toFixed(2)} GB total.`);
  console.log(`${queue.length} files need uploading; using two streaming transfers at a time.`);
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  let next = 0;
  const workers = Array.from({ length: 2 }, async () => {
    while (next < queue.length) {
      const item = queue[next++];
      const index = files.findIndex((x) => x.remote === item.remote);
      console.log(`START ${index + 1}/${files.length}: ${item.remote} (${(item.size / 1024 / 1024).toFixed(1)} MB)`);
      await uploadOne(item, index, files.length, state);
    }
  });
  await Promise.all(workers);
  console.log(`All ${files.length} videos are on Bunny at https://${zone}.b-cdn.net/movies/set-nine/`);
}

main().catch((err) => { console.error(err.message); process.exitCode = 1; });
