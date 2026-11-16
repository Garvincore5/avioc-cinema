import { circleMask, pasteRegion } from './fill';

export interface HealUndo {
  x: number;
  y: number;
  data: ImageData;
}

/**
 * Spot-heal: replaces a circular area with the best-matching nearby patch,
 * colour-matched to the surroundings and feathered at the edge.
 */
export function heal(canvas: HTMLCanvasElement, cx: number, cy: number, r: number): HealUndo | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  r = Math.max(2, Math.round(r));
  const W = canvas.width;
  const H = canvas.height;
  const size = r * 2;
  const x0 = Math.round(cx - r);
  const y0 = Math.round(cy - r);
  if (x0 + size <= 0 || y0 + size <= 0 || x0 >= W || y0 >= H) return null;

  // Read a padded area so we can search for donor patches around the spot.
  const reach = Math.round(r * 2.4);
  const ax = Math.max(0, x0 - reach);
  const ay = Math.max(0, y0 - reach);
  const aw = Math.min(W, x0 + size + reach) - ax;
  const ah = Math.min(H, y0 + size + reach) - ay;
  const area = ctx.getImageData(ax, ay, aw, ah);
  const A = area.data;
  const px = (x: number, y: number) => ((y - ay) * aw + (x - ax)) * 4;
  const inside = (x: number, y: number) => x >= ax && y >= ay && x < ax + aw && y < ay + ah;

  // Ring samples just outside the spot, used to judge how well a donor fits.
  const ring: [number, number][] = [];
  for (let k = 0; k < 48; k++) {
    const a = (k / 48) * Math.PI * 2;
    ring.push([Math.round(Math.cos(a) * r * 0.95), Math.round(Math.sin(a) * r * 0.95)]);
  }
  const tcx = Math.round(cx);
  const tcy = Math.round(cy);

  let best: { ox: number; oy: number; score: number } | null = null;
  const step = Math.max(1, Math.round(r / 8));
  for (let k = 0; k < 48; k++) {
    const a = (k / 16) * Math.PI * 2;
    const d = r * [1.9, 2.15, 2.4][Math.floor(k / 16)];
    const ox = Math.round(tcx + Math.cos(a) * d);
    const oy = Math.round(tcy + Math.sin(a) * d);
    if (!inside(ox - r, oy - r) || !inside(ox + r - 1, oy + r - 1)) continue;
    let ringErr = 0;
    let n = 0;
    for (const [dx, dy] of ring) {
      const t = [tcx + dx, tcy + dy], s = [ox + dx, oy + dy];
      if (!inside(t[0], t[1])) continue;
      const i = px(t[0], t[1]), j = px(s[0], s[1]);
      for (let c = 0; c < 3; c++) ringErr += (A[i + c] - A[j + c]) ** 2;
      n++;
    }
    // Donors should be smooth inside (no edges, folds or hair), so penalise their variance heavily.
    const mean = [0, 0, 0], sq = [0, 0, 0];
    let m = 0;
    for (let yy = -r; yy < r; yy += step) for (let xx = -r; xx < r; xx += step) {
      if (xx * xx + yy * yy > r * r) continue;
      const i = px(ox + xx, oy + yy);
      for (let c = 0; c < 3; c++) { mean[c] += A[i + c]; sq[c] += A[i + c] ** 2; }
      m++;
    }
    const variance = mean.reduce((s, v, c) => s + sq[c] / m - (v / m) ** 2, 0);
    const score = (n ? ringErr / n : 1e9) + variance * 4;
    if (!best || score < best.score) best = { ox, oy, score };
  }
  if (!best) return null;

  // Paste the donor with a seamless (Poisson-style) blend so light and colour match the spot's surroundings.
  const pad = 3;
  const bx = Math.max(0, x0 - pad), by = Math.max(0, y0 - pad);
  const rect = { x: bx, y: by, w: Math.min(W, x0 + size + pad) - bx, h: Math.min(H, y0 + size + pad) - by };
  return pasteRegion(canvas, rect, circleMask(rect, cx, cy, r), best.ox - tcx, best.oy - tcy, true);
}

export function undoHeal(canvas: HTMLCanvasElement, u: HealUndo) {
  canvas.getContext('2d', { willReadFrequently: true })!.putImageData(u.data, u.x, u.y);
}
