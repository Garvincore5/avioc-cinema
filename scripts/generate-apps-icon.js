const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const outDir = path.resolve(__dirname, '..', 'assets', 'icons');
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c >>> 0;
}
function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type);
  const body = Buffer.concat([name, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  return Buffer.concat([length, body, crc]);
}
function makePng(size) {
  const pixels = Buffer.alloc(size * size * 4, 0);
  const scale = size / 512;
  const set = (x, y, color) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    pixels[i] = color[0]; pixels[i + 1] = color[1]; pixels[i + 2] = color[2]; pixels[i + 3] = color[3] ?? 255;
  };
  const rounded = (x, y, w, h, r, color) => {
    const x0 = Math.max(0, Math.floor(x * scale)); const y0 = Math.max(0, Math.floor(y * scale));
    const x1 = Math.min(size, Math.ceil((x + w) * scale)); const y1 = Math.min(size, Math.ceil((y + h) * scale));
    const radius = r * scale;
    for (let py = y0; py < y1; py++) for (let px = x0; px < x1; px++) {
      const ux = (px + 0.5) / scale, uy = (py + 0.5) / scale;
      const cx = Math.max(x + r, Math.min(x + w - r, ux));
      const cy = Math.max(y + r, Math.min(y + h - r, uy));
      if ((ux - cx) ** 2 + (uy - cy) ** 2 <= r ** 2) set(px, py, color);
    }
  };
  const circle = (cx, cy, radius, color) => {
    const rr = radius * scale, ox = cx * scale, oy = cy * scale;
    for (let y = Math.floor(oy - rr); y <= Math.ceil(oy + rr); y++) for (let x = Math.floor(ox - rr); x <= Math.ceil(ox + rr); x++) {
      if ((x + 0.5 - ox) ** 2 + (y + 0.5 - oy) ** 2 <= rr ** 2) set(x, y, color);
    }
  };
  const line = (x1, y1, x2, y2, width, color) => {
    const sx = x1 * scale, sy = y1 * scale, ex = x2 * scale, ey = y2 * scale;
    const radius = width * scale / 2;
    const minX = Math.floor(Math.min(sx, ex) - radius), maxX = Math.ceil(Math.max(sx, ex) + radius);
    const minY = Math.floor(Math.min(sy, ey) - radius), maxY = Math.ceil(Math.max(sy, ey) + radius);
    const dx = ex - sx, dy = ey - sy, len = dx * dx + dy * dy;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const t = len ? Math.max(0, Math.min(1, ((x + 0.5 - sx) * dx + (y + 0.5 - sy) * dy) / len)) : 0;
      if ((x + 0.5 - sx - t * dx) ** 2 + (y + 0.5 - sy - t * dy) ** 2 <= radius ** 2) set(x, y, color);
    }
  };
  const polygon = (points, color) => {
    const scaled = points.map(([x, y]) => [x * scale, y * scale]);
    const minY = Math.max(0, Math.floor(Math.min(...scaled.map(p => p[1]))));
    const maxY = Math.min(size - 1, Math.ceil(Math.max(...scaled.map(p => p[1]))));
    for (let y = minY; y <= maxY; y++) {
      const intersections = [];
      for (let i = 0, j = scaled.length - 1; i < scaled.length; j = i++) {
        const [xi, yi] = scaled[i], [xj, yj] = scaled[j];
        if ((yi > y + 0.5) !== (yj > y + 0.5)) intersections.push((xj - xi) * (y + 0.5 - yi) / (yj - yi) + xi);
      }
      intersections.sort((a, b) => a - b);
      for (let i = 0; i < intersections.length; i += 2) for (let x = Math.ceil(intersections[i] - 0.5); x < intersections[i + 1]; x++) set(x, y, color);
    }
  };
  const roundedContains = (x, y, inset) => {
    const left = 24 + inset, top = 24 + inset, right = 488 - inset, bottom = 488 - inset, radius = 108 - inset;
    const cx = Math.max(left + radius, Math.min(right - radius, x));
    const cy = Math.max(top + radius, Math.min(bottom - radius, y));
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
  };

  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const ux = (x + 0.5) / scale, uy = (y + 0.5) / scale;
    if (!roundedContains(ux, uy, 0)) continue;
    const distance = Math.sqrt((ux - 210) ** 2 + (uy - 176) ** 2) / 410;
    const glow = Math.max(0, 1 - distance);
    set(x, y, [Math.round(6 + 17 * glow), Math.round(5 + 15 * glow), Math.round(13 + 25 * glow), 255]);
  }
  const border = [[255, 42, 95, 255], [255, 184, 0, 255], [0, 240, 255, 255], [168, 85, 247, 255]];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const ux = (x + 0.5) / scale, uy = (y + 0.5) / scale;
    if (roundedContains(ux, uy, 0) && !roundedContains(ux, uy, 8)) {
      const t = ((ux + uy) / 1024) * (border.length - 1), i = Math.floor(t), f = t - i;
      set(x, y, border[i].map((v, k) => Math.round(v * (1 - f) + border[Math.min(i + 1, border.length - 1)][k] * f)));
    }
  }
  for (const p of [160, 256, 352]) {
    line(80, p, 432, p, 1.5, [255, 255, 255, 28]);
    line(p, 80, p, 432, 1.5, [255, 255, 255, 28]);
  }
  rounded(140, 140, 104, 104, 26, [238, 36, 87, 255]);
  rounded(268, 140, 104, 104, 26, [255, 184, 0, 255]);
  rounded(140, 268, 104, 104, 26, [0, 166, 231, 255]);
  rounded(268, 268, 104, 104, 26, [32, 25, 52, 255]);
  polygon([[182, 172], [182, 212], [214, 192]], [255, 255, 255, 255]);
  circle(320, 186, 16, [18, 14, 3, 255]); circle(320, 186, 9, [255, 184, 0, 255]);
  line(320, 200, 320, 218, 8, [18, 14, 3, 255]);
  line(192, 294, 192, 340, 9, [255, 255, 255, 255]);
  line(174, 322, 192, 340, 9, [255, 255, 255, 255]); line(210, 322, 192, 340, 9, [255, 255, 255, 255]);
  line(174, 352, 210, 352, 8, [255, 255, 255, 255]);
  circle(320, 330, 7, [255, 184, 0, 255]);
  line(302, 309, 338, 309, 5, [0, 240, 255, 255]);
  line(308, 318, 332, 318, 5, [255, 42, 95, 255]);
  line(294, 342, 346, 342, 5, [168, 85, 247, 255]);
  const star = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 10 : 23;
    star.push([256 + Math.cos(a) * r, 130 + Math.sin(a) * r]);
  }
  polygon(star, [255, 215, 0, 255]);

  const scanlines = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) pixels.copy(scanlines, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(scanlines, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.mkdirSync(outDir, { recursive: true });
for (const size of [512, 192, 144, 96, 72, 48]) {
  const file = path.join(outDir, `avioc-apps-${size}.png`);
  fs.writeFileSync(file, makePng(size));
}
console.log('Generated the Avioc Apps icon set for desktop and Android builds.');
