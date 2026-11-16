import type { CurvePoint, Curves } from '../types';

/**
 * Monotone cubic (Fritsch–Carlson) interpolation through the control points, so curves
 * stay smooth without overshooting. Points are sorted by x; output is clamped to 0..1.
 */
export function evalCurve(points: CurvePoint[], x: number): number {
  const pts = [...points].sort((a, b) => a[0] - b[0]);
  const n = pts.length;
  if (n === 0) return x;
  if (n === 1 || x <= pts[0][0]) return clamp01(pts[0][1]);
  if (x >= pts[n - 1][0]) return clamp01(pts[n - 1][1]);
  const d: number[] = []; // secant slopes
  for (let i = 0; i < n - 1; i++) d.push((pts[i + 1][1] - pts[i][1]) / Math.max(1e-6, pts[i + 1][0] - pts[i][0]));
  const m: number[] = [d[0]];
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  m.push(d[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  let k = 0;
  while (k < n - 2 && x > pts[k + 1][0]) k++;
  const [x0, y0] = pts[k];
  const [x1, y1] = pts[k + 1];
  const h = x1 - x0;
  const t = (x - x0) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  const y = (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * m[k] + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * m[k + 1];
  return clamp01(y);
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const isIdentityCurve = (c: CurvePoint[]) => c.length === 2 && c[0][0] === 0 && c[0][1] === 0 && c[1][0] === 1 && c[1][1] === 1;
export const curvesAreIdentity = (c?: Curves) =>
  !c || (isIdentityCurve(c.master) && isIdentityCurve(c.r) && isIdentityCurve(c.g) && isIdentityCurve(c.b) && isIdentityCurve(c.luma));

/** 256×1 RGBA lookup table: RGB = channel(master(x)), A = luma curve. */
export function buildCurveLut(c: Curves): Uint8Array {
  const out = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    const x = i / 255;
    const m = evalCurve(c.master, x);
    out[i * 4] = Math.round(evalCurve(c.r, m) * 255);
    out[i * 4 + 1] = Math.round(evalCurve(c.g, m) * 255);
    out[i * 4 + 2] = Math.round(evalCurve(c.b, m) * 255);
    out[i * 4 + 3] = Math.round(evalCurve(c.luma, x) * 255);
  }
  return out;
}

export const CURVE_PRESETS: { name: string; curves: Partial<Curves> }[] = [
  { name: 'Soft contrast', curves: { master: [[0, 0], [0.25, 0.2], [0.75, 0.8], [1, 1]] } },
  { name: 'Strong contrast', curves: { master: [[0, 0], [0.25, 0.15], [0.75, 0.87], [1, 1]] } },
  { name: 'Faded film', curves: { master: [[0, 0.1], [0.5, 0.5], [1, 0.92]] } },
  { name: 'Brighten', curves: { luma: [[0, 0], [0.5, 0.62], [1, 1]] } },
  { name: 'Darken', curves: { luma: [[0, 0], [0.5, 0.4], [1, 1]] } },
  { name: 'Cross process', curves: { r: [[0, 0], [0.25, 0.18], [0.75, 0.85], [1, 1]], g: [[0, 0], [0.25, 0.22], [0.75, 0.8], [1, 1]], b: [[0, 0.12], [1, 0.85]] } },
];
