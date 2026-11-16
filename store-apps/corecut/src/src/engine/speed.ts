import type { Clip, CurvePoint } from '../types';

/**
 * Speed: a clip either has a constant `speed` or a `speedCurve` (a ramp over the clip's
 * length). The source time at a point in the clip is the integral of speed up to it.
 */

export const MIN_SPEED = 0.1;
export const MAX_SPEED = 10;

const lerpCurve = (pts: CurvePoint[], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if (x <= x1) {
      const t = x1 === x0 ? 1 : (x - x0) / (x1 - x0);
      const s = t * t * (3 - 2 * t); // smooth ease between points
      return y0 + (y1 - y0) * s;
    }
  }
  return pts[pts.length - 1][1];
};

const hasRamp = (c: Clip) => !!c.speedCurve && c.speedCurve.length >= 2;

/** Speed multiplier at local time (seconds from clip start on the timeline). */
export function speedAt(c: Clip, local: number): number {
  if (!hasRamp(c)) return c.speed ?? 1;
  const x = c.duration > 0 ? Math.min(1, Math.max(0, local / c.duration)) : 0;
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, lerpCurve([...c.speedCurve!].sort((a, b) => a[0] - b[0]), x)));
}

// Integral cache: the curve is integrated once per (curve, duration) into a table.
const tables = new Map<string, Float64Array>();
const STEPS = 400;

function table(c: Clip): Float64Array {
  const key = `${c.duration}|${JSON.stringify(c.speedCurve)}`;
  let t = tables.get(key);
  if (!t) {
    t = new Float64Array(STEPS + 1);
    const dt = c.duration / STEPS;
    for (let i = 1; i <= STEPS; i++) t[i] = t[i - 1] + ((speedAt(c, (i - 1) * dt) + speedAt(c, i * dt)) / 2) * dt;
    if (tables.size > 200) tables.clear();
    tables.set(key, t);
  }
  return t;
}

/** Seconds of source consumed from the clip's in point up to `local`. Outside the clip it extends at the edge speed. */
export function sourceOffset(c: Clip, local: number): number {
  if (!hasRamp(c)) return local * (c.speed ?? 1);
  if (local <= 0) return local * speedAt(c, 0);
  const t = table(c);
  if (local >= c.duration) return t[STEPS] + (local - c.duration) * speedAt(c, c.duration);
  const f = (local / c.duration) * STEPS;
  const i = Math.floor(f);
  return t[i] + (t[i + 1] - t[i]) * (f - i);
}

/** Total source seconds the clip uses. */
export const sourceSpan = (c: Clip) => sourceOffset(c, c.duration);
/** Average speed across the clip. */
export const avgSpeed = (c: Clip) => (c.duration > 0 ? sourceSpan(c) / c.duration : c.speed ?? 1);

/** Timeline length that plays `span` source seconds with this ramp shape (or constant speed). */
export function durationForSpan(c: Clip, span: number): number {
  const unit = { ...c, duration: 1 };
  const perSecond = hasRamp(c) ? sourceOffset(unit, 1) : c.speed ?? 1; // avg speed of the shape
  return span / Math.max(MIN_SPEED, perSecond);
}

export const SPEED_PRESETS: { name: string; curve: CurvePoint[] }[] = [
  { name: 'Hero moment', curve: [[0, 1.5], [0.35, 1.5], [0.5, 0.25], [0.65, 1.5], [1, 1.5]] },
  { name: 'Ramp up', curve: [[0, 0.5], [1, 3]] },
  { name: 'Ramp down', curve: [[0, 3], [1, 0.5]] },
  { name: 'Bullet', curve: [[0, 2.5], [0.3, 0.2], [0.7, 0.2], [1, 2.5]] },
  { name: 'Pulse', curve: [[0, 1], [0.25, 3], [0.5, 1], [0.75, 3], [1, 1]] },
  { name: 'Flash in', curve: [[0, 5], [0.3, 1], [1, 1]] },
  { name: 'Flash out', curve: [[0, 1], [0.7, 1], [1, 5]] },
];
