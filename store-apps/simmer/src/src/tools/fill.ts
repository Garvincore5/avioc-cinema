import type { HealUndo } from './heal';
import type { Pt } from '../face/landmarks';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Push-pull hole filling: fills pixels with weight 0 by smoothly interpolating from known ones
 * (3 channels). Used both to inpaint colour and to spread seam differences for seamless pasting.
 */
export function pushPull(vals: Float32Array, wts: Float32Array, w: number, h: number): Float32Array {
  if (w <= 1 && h <= 1) return vals.slice();
  const w2 = Math.ceil(w / 2), h2 = Math.ceil(h / 2);
  const v2 = new Float32Array(w2 * h2 * 3);
  const t2 = new Float32Array(w2 * h2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x, j = (y >> 1) * w2 + (x >> 1);
      const wt = wts[i];
      if (!wt) continue;
      t2[j] += wt;
      v2[j * 3] += vals[i * 3] * wt;
      v2[j * 3 + 1] += vals[i * 3 + 1] * wt;
      v2[j * 3 + 2] += vals[i * 3 + 2] * wt;
    }
  }
  for (let j = 0; j < w2 * h2; j++) {
    if (t2[j] > 0) {
      v2[j * 3] /= t2[j];
      v2[j * 3 + 1] /= t2[j];
      v2[j * 3 + 2] /= t2[j];
      t2[j] = Math.min(1, t2[j]);
    }
  }
  const coarse = pushPull(v2, t2, w2, h2);
  const out = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      // Bilinear sample of the coarse level.
      const cx = Math.min(w2 - 1, Math.max(0, (x + 0.5) / 2 - 0.5));
      const cy = Math.min(h2 - 1, Math.max(0, (y + 0.5) / 2 - 0.5));
      const x0 = Math.floor(cx), y0 = Math.floor(cy);
      const x1 = Math.min(w2 - 1, x0 + 1), y1 = Math.min(h2 - 1, y0 + 1);
      const fx = cx - x0, fy = cy - y0;
      const wt = Math.min(1, wts[i]);
      for (let c = 0; c < 3; c++) {
        const s = (coarse[(y0 * w2 + x0) * 3 + c] * (1 - fx) + coarse[(y0 * w2 + x1) * 3 + c] * fx) * (1 - fy)
          + (coarse[(y1 * w2 + x0) * 3 + c] * (1 - fx) + coarse[(y1 * w2 + x1) * 3 + c] * fx) * fy;
        out[i * 3 + c] = wt * vals[i * 3 + c] + (1 - wt) * s;
      }
    }
  }
  return out;
}

/** Rasterises a polygon (in canvas coords) into a 0..1 mask over `r`, grown by `grow` px and feathered by `feather` px. */
export function polygonMask(poly: Pt[], r: Rect, grow: number, feather: number): Float32Array {
  const c = document.createElement('canvas');
  c.width = r.w;
  c.height = r.h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  if (feather > 0) ctx.filter = `blur(${feather}px)`;
  ctx.fillStyle = ctx.strokeStyle = '#fff';
  ctx.lineWidth = grow * 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  poly.forEach((p, i) => (i ? ctx.lineTo(p.x - r.x, p.y - r.y) : ctx.moveTo(p.x - r.x, p.y - r.y)));
  ctx.closePath();
  ctx.fill();
  if (grow > 0) ctx.stroke();
  const d = ctx.getImageData(0, 0, r.w, r.h).data;
  const m = new Float32Array(r.w * r.h);
  for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] / 255;
  return m;
}

export function circleMask(r: Rect, cx: number, cy: number, radius: number): Float32Array {
  const m = new Float32Array(r.w * r.h);
  for (let y = 0; y < r.h; y++) {
    for (let x = 0; x < r.w; x++) {
      const d = Math.hypot(r.x + x + 0.5 - cx, r.y + y + 0.5 - cy) / radius;
      m[y * r.w + x] = d >= 1 ? 0 : d < 0.6 ? 1 : 1 - (d - 0.6) / 0.4;
    }
  }
  return m;
}

export function polygonBounds(poly: Pt[], pad: number, W: number, H: number): Rect {
  const xs = poly.map((p) => p.x), ys = poly.map((p) => p.y);
  const x = Math.max(0, Math.floor(Math.min(...xs) - pad));
  const y = Math.max(0, Math.floor(Math.min(...ys) - pad));
  return { x, y, w: Math.min(W, Math.ceil(Math.max(...xs) + pad)) - x, h: Math.min(H, Math.ceil(Math.max(...ys) + pad)) - y };
}

/**
 * Copies pixels from (target + d) into the masked target area.
 * With `seamless`, colour/brightness differences along the edge are spread across the
 * patch (a fast Poisson-style blend), so it melts into its new surroundings.
 */
export function pasteRegion(canvas: HTMLCanvasElement, r: Rect, mask: Float32Array, dx: number, dy: number, seamless: boolean): HealUndo | null {
  const W = canvas.width, H = canvas.height;
  dx = Math.round(dx);
  dy = Math.round(dy);
  if (r.w <= 0 || r.h <= 0) return null;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  // Source area, clamped to the canvas.
  const sx = Math.max(0, r.x + dx), sy = Math.max(0, r.y + dy);
  const sw = Math.min(W, r.x + dx + r.w) - sx, sh = Math.min(H, r.y + dy + r.h) - sy;
  if (sw <= 0 || sh <= 0) return null;
  const S = ctx.getImageData(sx, sy, sw, sh).data;
  const T = ctx.getImageData(r.x, r.y, r.w, r.h);
  const undo: HealUndo = { x: r.x, y: r.y, data: ctx.getImageData(r.x, r.y, r.w, r.h) };
  const n = r.w * r.h;
  const src = new Float32Array(n * 3);
  const hasSrc = new Uint8Array(n);
  for (let y = 0; y < r.h; y++) {
    for (let x = 0; x < r.w; x++) {
      const gx = r.x + x + dx - sx, gy = r.y + y + dy - sy;
      if (gx < 0 || gy < 0 || gx >= sw || gy >= sh) continue;
      const i = y * r.w + x, j = (gy * sw + gx) * 4;
      src[i * 3] = S[j];
      src[i * 3 + 1] = S[j + 1];
      src[i * 3 + 2] = S[j + 2];
      hasSrc[i] = 1;
    }
  }
  const D = T.data;
  let diff: Float32Array | null = null;
  if (seamless) {
    const dv = new Float32Array(n * 3);
    const wt = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      if (mask[i] > 0.001 || !hasSrc[i]) continue;
      wt[i] = 1;
      for (let c = 0; c < 3; c++) dv[i * 3 + c] = D[i * 4 + c] - src[i * 3 + c];
    }
    diff = pushPull(dv, wt, r.w, r.h);
  }
  for (let i = 0; i < n; i++) {
    const m = mask[i];
    if (m <= 0 || !hasSrc[i]) continue;
    for (let c = 0; c < 3; c++) {
      const v = src[i * 3 + c] + (diff ? diff[i * 3 + c] : 0);
      D[i * 4 + c] = D[i * 4 + c] * (1 - m) + v * m;
    }
  }
  ctx.putImageData(T, r.x, r.y);
  return undo;
}

/**
 * "AI remove": fills a lasso selection with the best-matching nearby texture, blended seamlessly.
 * Donor areas are scored on how well their edge matches the hole's edge and how calm they are inside.
 */
export function removeObject(canvas: HTMLCanvasElement, poly: Pt[]): HealUndo | null {
  const W = canvas.width, H = canvas.height;
  const grow = Math.max(2, Math.round(Math.max(W, H) / 800));
  const r = polygonBounds(poly, grow * 4, W, H);
  if (r.w < 2 || r.h < 2) return null;
  const mask = polygonMask(poly, r, grow, 0);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  // Search area around the hole.
  const size = Math.max(r.w, r.h);
  const ax = Math.max(0, r.x - size * 2), ay = Math.max(0, r.y - size * 2);
  const aw = Math.min(W, r.x + r.w + size * 2) - ax, ah = Math.min(H, r.y + r.h + size * 2) - ay;
  const A = ctx.getImageData(ax, ay, aw, ah).data;
  const at = (x: number, y: number) => ((y - ay) * aw + (x - ax)) * 4;

  // Edge ring (known pixels touching the hole) and hole sample points.
  const ring: number[] = [];
  const hole: number[] = [];
  const step = Math.max(1, Math.round(Math.sqrt((r.w * r.h) / 4000)));
  for (let y = 0; y < r.h; y += step) {
    for (let x = 0; x < r.w; x += step) {
      const i = y * r.w + x;
      if (mask[i] > 0.5) hole.push(i);
      else {
        const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ox, oy]) => {
          const xx = x + ox * grow * 2, yy = y + oy * grow * 2;
          return xx >= 0 && yy >= 0 && xx < r.w && yy < r.h && mask[yy * r.w + xx] > 0.5;
        });
        if (near) ring.push(i);
      }
    }
  }
  if (!hole.length) return null;

  let best: { dx: number; dy: number; score: number } | null = null;
  for (const dist of [1.05, 1.3, 1.6, 2.0]) {
    for (let k = 0; k < 24; k++) {
      const ang = (k / 24) * Math.PI * 2;
      const dx = Math.round(Math.cos(ang) * r.w * dist), dy = Math.round(Math.sin(ang) * r.h * dist);
      if (r.x + dx < ax || r.y + dy < ay || r.x + dx + r.w > ax + aw || r.y + dy + r.h > ay + ah) continue;
      // Donor must not overlap the hole itself.
      let overlap = false;
      for (const i of hole) {
        const x = (i % r.w) + dx, y = Math.floor(i / r.w) + dy;
        if (x >= 0 && y >= 0 && x < r.w && y < r.h && mask[y * r.w + x] > 0.5) { overlap = true; break; }
      }
      if (overlap) continue;
      let e = 0;
      for (const i of ring) {
        const x = r.x + (i % r.w), y = r.y + Math.floor(i / r.w);
        const t = at(x, y), s = at(x + dx, y + dy);
        for (let c = 0; c < 3; c++) e += (A[t + c] - A[s + c]) ** 2;
      }
      const mean = [0, 0, 0], sq = [0, 0, 0];
      for (const i of hole) {
        const s = at(r.x + (i % r.w) + dx, r.y + Math.floor(i / r.w) + dy);
        for (let c = 0; c < 3; c++) { mean[c] += A[s + c]; sq[c] += A[s + c] ** 2; }
      }
      const variance = mean.reduce((sum, v, c) => sum + sq[c] / hole.length - (v / hole.length) ** 2, 0);
      const score = e / Math.max(1, ring.length) + variance * 1.5 + dist * 200;
      if (!best || score < best.score) best = { dx, dy, score };
    }
  }
  if (!best) {
    // No room for a donor (hole is huge or at the border): smooth fill from the edges.
    const T = ctx.getImageData(r.x, r.y, r.w, r.h);
    const vals = new Float32Array(r.w * r.h * 3);
    const wts = new Float32Array(r.w * r.h);
    for (let i = 0; i < r.w * r.h; i++) {
      if (mask[i] > 0.5) continue;
      wts[i] = 1;
      for (let c = 0; c < 3; c++) vals[i * 3 + c] = T.data[i * 4 + c];
    }
    const undo: HealUndo = { x: r.x, y: r.y, data: ctx.getImageData(r.x, r.y, r.w, r.h) };
    const f = pushPull(vals, wts, r.w, r.h);
    for (let i = 0; i < r.w * r.h; i++) {
      if (mask[i] <= 0.5) continue;
      for (let c = 0; c < 3; c++) T.data[i * 4 + c] = f[i * 3 + c];
    }
    ctx.putImageData(T, r.x, r.y);
    return undo;
  }
  return pasteRegion(canvas, r, polygonMask(poly, r, grow, grow), best.dx, best.dy, true);
}

export function pointInPolygon(p: Pt, poly: Pt[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
