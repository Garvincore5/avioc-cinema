import type { Rect } from './fill';

function blank(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

const ctx2d = (c: HTMLCanvasElement) => c.getContext('2d', { willReadFrequently: true })!;

export function cropCanvas(src: HTMLCanvasElement, r: Rect) {
  const out = blank(r.w, r.h);
  ctx2d(out).drawImage(src, r.x, r.y, r.w, r.h, 0, 0, out.width, out.height);
  return out;
}

export function rotateCanvas(src: HTMLCanvasElement, clockwise: boolean) {
  const out = blank(src.height, src.width);
  const ctx = ctx2d(out);
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate(clockwise ? Math.PI / 2 : -Math.PI / 2);
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  return out;
}

/**
 * How much a w×h photo must be scaled down so that, rotated by `deg`, it still has no empty corners
 * (the largest same-shaped rectangle that fits inside the rotated photo).
 */
export function straightenScale(w: number, h: number, deg: number) {
  const t = Math.abs((deg * Math.PI) / 180), c = Math.cos(t), s = Math.sin(t);
  return Math.min(w / (w * c + h * s), h / (w * s + h * c));
}

/** Rotates by any angle and crops to the largest clean rectangle (same aspect, no empty corners). */
export function straightenCanvas(src: HTMLCanvasElement, deg: number) {
  const k = straightenScale(src.width, src.height, deg);
  const out = blank(src.width * k, src.height * k);
  const ctx = ctx2d(out);
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  return out;
}

export function flipCanvas(src: HTMLCanvasElement) {
  const out = blank(src.width, src.height);
  const ctx = ctx2d(out);
  ctx.translate(out.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  return out;
}

export const ASPECTS: { label: string; value: number | 'original' | 0 }[] = [
  { label: 'Free', value: 0 },
  { label: 'Original', value: 'original' },
  { label: '1:1 square', value: 1 },
  { label: '4:5 portrait', value: 4 / 5 },
  { label: '2:3', value: 2 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16 story', value: 9 / 16 },
];

/** Largest rect of the given aspect, centred inside `r`. */
export function fitAspect(r: Rect, aspect: number): Rect {
  let w = r.w, h = w / aspect;
  if (h > r.h) { h = r.h; w = h * aspect; }
  return { x: r.x + (r.w - w) / 2, y: r.y + (r.h - h) / 2, w, h };
}

/** Moves or resizes the crop box by a handle drag, keeping the aspect if one is set. */
export function dragCrop(handle: string, r0: Rect, dx: number, dy: number, aspect: number, W: number, H: number): Rect {
  if (handle === 'move') {
    return { ...r0, x: Math.min(W - r0.w, Math.max(0, r0.x + dx)), y: Math.min(H - r0.h, Math.max(0, r0.y + dy)) };
  }
  let l = r0.x, t = r0.y, rr = r0.x + r0.w, b = r0.y + r0.h;
  if (handle.includes('w')) l += dx;
  if (handle.includes('e')) rr += dx;
  if (handle.includes('n')) t += dy;
  if (handle.includes('s')) b += dy;
  const min = 16;
  if (rr - l < min || b - t < min) return r0;
  if (aspect) {
    if (handle === 'n' || handle === 's') {
      const nw = (b - t) * aspect, cx = r0.x + r0.w / 2;
      l = cx - nw / 2;
      rr = cx + nw / 2;
    } else if (handle === 'e' || handle === 'w') {
      const nh = (rr - l) / aspect, cy = r0.y + r0.h / 2;
      t = cy - nh / 2;
      b = cy + nh / 2;
    } else {
      const nh = (rr - l) / aspect;
      if (handle.includes('n')) t = b - nh;
      else b = t + nh;
    }
  }
  if (l < -0.5 || t < -0.5 || rr > W + 0.5 || b > H + 0.5) return r0;
  return { x: Math.max(0, l), y: Math.max(0, t), w: Math.min(W, rr) - Math.max(0, l), h: Math.min(H, b) - Math.max(0, t) };
}
