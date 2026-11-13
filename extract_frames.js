const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const scratch = 'C:\\Users\\user\\.gemini\\antigravity\\brain\\8cbb259e-8494-402c-b682-53934ccb7bd4\\scratch\\frames';
if (!fs.existsSync(scratch)) fs.mkdirSync(scratch, { recursive: true });

const targets = [
  'EXQUISITE BODY GUARD MUSA 2025.mp4',
  'Family_VJ_Ulio.mp4',
  's0_m_masters-of-the-universe-part-1.mp4',
  's0_m_the-drawn-together-movie.mp4',
  's1_58814.mp4'
];

for (const t of targets) {
  const base = path.basename(t, path.extname(t)).replace(/[^a-zA-Z0-9_-]/g, '_');
  const input = path.join('E:\\downloads\\set eight', t);
  const out1 = path.join(scratch, `${base}_30s.jpg`);
  const out2 = path.join(scratch, `${base}_180s.jpg`);
  try {
    execSync(`ffmpeg -ss 00:00:30 -i "${input}" -frames:v 1 -q:v 2 "${out1}" -y`, { stdio: 'ignore' });
    execSync(`ffmpeg -ss 00:03:00 -i "${input}" -frames:v 1 -q:v 2 "${out2}" -y`, { stdio: 'ignore' });
    console.log('Extracted frames for:', t);
  } catch(e) {
    console.error('Error on', t, e.message);
  }
}
