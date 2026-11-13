const fs = require('fs');
const path = require('path');

function getAllFiles(dir, allFiles = []) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        getAllFiles(fullPath, allFiles);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.mp4', '.mkv', '.avi', '.mov', '.webm'].includes(ext)) {
          const stat = fs.statSync(fullPath);
          allFiles.push({
            name: entry.name,
            fullPath: fullPath,
            sizeMb: (stat.size / (1024 * 1024)).toFixed(1)
          });
        }
      }
    }
  } catch(e) {
    console.error(e.message);
  }
  return allFiles;
}

const localVideos = getAllFiles('E:\\downloads');
console.log(`Total local video files found in E:\\downloads: ${localVideos.length}\n`);

// Group by folder
const byFolder = {};
localVideos.forEach(v => {
  const folder = path.dirname(v.fullPath);
  if (!byFolder[folder]) byFolder[folder] = [];
  byFolder[folder].push(v);
});

for (const [folder, files] of Object.entries(byFolder)) {
  console.log(`FOLDER: ${folder} (${files.length} videos)`);
  files.forEach(f => console.log(`  - ${f.name} (${f.sizeMb} MB)`));
}
