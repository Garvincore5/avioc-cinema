import type { Settings } from '../settings';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const toLin = (v: number) => Math.pow(v, 2.2);

/** Looks at the photo's histogram and suggests Light / Color settings, like Camera Raw's "Auto". */
export function autoSettings(img: HTMLCanvasElement, hasFaces: boolean): Settings {
  const size = 256;
  const s = Math.min(1, size / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * s));
  const h = Math.max(1, Math.round(img.height * s));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;

  const lum: number[] = [];
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) {
    const R = d[i] / 255, G = d[i + 1] / 255, B = d[i + 2] / 255;
    const L = 0.2126 * R + 0.7152 * G + 0.0722 * B;
    lum.push(L);
    if (L > 0.15 && L < 0.9) { r += R; g += G; b += B; n++; }
  }
  lum.sort((x, y) => x - y);
  const pct = (q: number) => lum[Math.floor(q * (lum.length - 1))];
  const median = pct(0.5), lo = pct(0.01), hi = pct(0.99);

  const ev = Math.log2(toLin(0.46) / Math.max(toLin(median), 1e-4));
  const out: Settings = {
    exposure: Math.round(clamp((ev / 2.5) * 100 * 0.8, -60, 60)),
    contrast: Math.round(clamp((0.85 - (hi - lo)) * 80, -10, 35)),
    highlights: hi > 0.97 ? -30 : -10,
    shadows: lo < 0.04 ? 25 : 10,
    whites: Math.round(clamp((0.97 - hi) * 150, -20, 30)),
    blacks: Math.round(clamp(-(lo - 0.02) * 150, -30, 10)),
    vibrance: 15,
  };
  if (n) {
    r /= n; g /= n; b /= n;
    const avg = (r + g + b) / 3;
    // Gray-world white balance, halved for portraits since skin is naturally warm.
    const k = hasFaces ? 0.5 : 1;
    out.temperature = Math.round(clamp(((b - r) / avg) * 120 * k, -40, 40));
    out.tint = Math.round(clamp(((g - (r + b) / 2) / avg) * 120 * k, -30, 30));
  }
  return out;
}
