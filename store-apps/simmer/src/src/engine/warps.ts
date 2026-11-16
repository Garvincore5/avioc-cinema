import { num, type Settings } from '../settings';
import {
  CHIN, FOREHEAD, JAW_A, JAW_B, JAW_LOW, MOUTH_BOTTOM, MOUTH_CORNER_A, MOUTH_CORNER_B, MOUTH_TOP, NOSE_TIP, NOSE_WING_A, NOSE_WING_B,
  dist, faceGeometry, lerp, type Pt,
} from '../face/landmarks';

export interface Warp {
  cx: number;
  cy: number;
  r: number;
  type: 0 | 1; // 0 = move content by (vx, vy); 1 = scale by vx (>0 enlarges)
  vx: number;
  vy: number;
}

/**
 * Turns the face-shape sliders into local warps, in GL pixel space (origin bottom-left)
 * for a render of size w x h.
 */
export function computeWarps(faces: Pt[][], s: Settings, w: number, h: number): Warp[] {
  const slim = num(s, 'faceSlim') / 100;
  const eye = num(s, 'eyeSize') / 100;
  const nose = num(s, 'noseSize') / 100;
  const mouth = num(s, 'mouthSize') / 100;
  const smile = num(s, 'smile') / 100;
  const chin = num(s, 'chin') / 100;
  const forehead = num(s, 'forehead') / 100;
  const noseWidth = num(s, 'noseWidth') / 100;
  if (!slim && !eye && !nose && !mouth && !smile && !chin && !forehead && !noseWidth) return [];

  const out: Warp[] = [];
  const done = () => out.map((wp) => {
    // Safety limits: beyond these the image would fold over itself (tearing, doubled features).
    if (wp.type === 1) return { ...wp, vx: Math.max(-0.3, Math.min(0.3, wp.vx)) };
    const len = Math.hypot(wp.vx, wp.vy), max = wp.r * 0.3;
    return len > max ? { ...wp, vx: (wp.vx / len) * max, vy: (wp.vy / len) * max } : wp;
  });
  for (const lm of faces) {
    const g = faceGeometry(lm, w, h);
    const fw = g.faceWidth;
    // Convert to GL space: flip y, and flip y of direction vectors.
    const gl = (p: Pt) => ({ x: p.x, y: h - p.y });
    const down = { x: g.down.x, y: -g.down.y };
    const move = (p: Pt, r: number, vx: number, vy: number) => {
      const q = gl(p);
      out.push({ cx: q.x, cy: q.y, r, type: 0, vx, vy });
    };
    const scale = (p: Pt, r: number, a: number) => {
      const q = gl(p);
      out.push({ cx: q.x, cy: q.y, r, type: 1, vx: a, vy: 0 });
    };

    if (slim) {
      // Push each cheek/jaw side in sideways (across the face axis). Small radii keep the two sides
      // from overlapping in the middle, which would fold the lips/chin into a ghosted double image.
      const across = { x: -down.y, y: down.x }; // GL space, perpendicular to the face's up-down axis
      const axisPt = gl(g.center);
      for (const [i, wgt] of [...JAW_A, ...JAW_B, ...JAW_LOW].map((i) => [i, JAW_LOW.includes(i) ? 0.8 : 1] as const)) {
        const p = gl(g.P(i));
        const side = Math.sign((p.x - axisPt.x) * across.x + (p.y - axisPt.y) * across.y) || 1;
        const k = -side * slim * fw * 0.035 * wgt;
        out.push({ cx: p.x, cy: p.y, r: fw * 0.17, type: 0, vx: across.x * k, vy: across.y * k });
      }
    }
    // Wide radii for chin/forehead so the change blends into the whole lower/upper face.
    if (chin) move(g.P(CHIN), fw * 0.45, down.x * chin * fw * 0.07, down.y * chin * fw * 0.07);
    if (forehead) move(g.P(FOREHEAD), fw * 0.55, -down.x * forehead * fw * 0.06, -down.y * forehead * fw * 0.06);
    if (eye) for (const e of g.eyes) scale(e.center, e.width * 1.1, eye * 0.28);
    if (nose) scale(g.P(NOSE_TIP), fw * 0.17, nose * 0.22);
    if (noseWidth) {
      // Positive = wider: push each nostril wing away from the nose centre line.
      const tip = g.P(NOSE_TIP);
      for (const i of [NOSE_WING_A, NOSE_WING_B]) {
        const p = g.P(i);
        const len = Math.hypot(p.x - tip.x, p.y - tip.y) || 1;
        const k = noseWidth * fw * 0.025;
        move(p, fw * 0.08, ((p.x - tip.x) / len) * k, (-(p.y - tip.y) / len) * k);
      }
    }
    const mw = dist(g.P(MOUTH_CORNER_A), g.P(MOUTH_CORNER_B));
    if (mouth) scale(lerp(g.P(MOUTH_TOP), g.P(MOUTH_BOTTOM), 0.5), mw * 0.85, mouth * 0.22);
    if (smile) {
      for (const i of [MOUTH_CORNER_A, MOUTH_CORNER_B]) {
        move(g.P(i), mw * 0.4, -down.x * smile * mw * 0.1, -down.y * smile * mw * 0.1);
      }
    }
  }
  return done();
}

/** Where Slim body stops (GL y, just below the lowest chin), so faces are never squeezed by it. 0 = no faces. */
export function bodyTop(faces: Pt[][]): number {
  if (!faces.length) return 0;
  return 1 - Math.max(...faces.map((lm) => lm[CHIN].y)) - 0.01;
}

/** Skin smoothing radius in pixels, scaled by the size of the faces in the photo. */
export function skinRadius(faces: Pt[][], w: number, h: number) {
  if (!faces.length) return Math.max(w, h) * 0.004;
  const fw = faces.reduce((sum, lm) => sum + faceGeometry(lm, w, h).faceWidth, 0) / faces.length;
  return Math.max(1.5, fw * 0.018);
}
