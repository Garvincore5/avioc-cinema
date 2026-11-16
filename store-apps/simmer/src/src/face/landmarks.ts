// MediaPipe Face Mesh (478 points) index groups, each ordered as a closed contour.
export const FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152,
  148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
export const EYE_A = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
export const EYE_B = [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466];
export const BROW_A = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
export const BROW_B = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276];
export const LIPS_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185];
export const LIPS_INNER = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191];
export const IRIS_A = [468, 469, 470, 471, 472];
export const IRIS_B = [473, 474, 475, 476, 477];
export const JAW_A = [132, 172, 150];
export const JAW_B = [361, 397, 379];
/** Lower jaw, either side of the chin. */
export const JAW_LOW = [149, 378];
export const CHEEK_A = 50;
export const CHEEK_B = 280;
export const FOREHEAD = 10;
export const CHIN = 152;
export const NOSE_TIP = 4;
export const FACE_SIDE_A = 234;
export const FACE_SIDE_B = 454;
export const MOUTH_CORNER_A = 61;
export const MOUTH_CORNER_B = 291;
export const NOSE_BRIDGE = [168, 6, 197, 195, 5];
/** Lower nose: wings, nostrils and tip, so smoothing keeps the nostril shape and shadows. */
export const NOSE_LOWER = [129, 64, 98, 97, 2, 326, 327, 294, 358, 4];
export const NOSE_WING_A = 129;
export const NOSE_WING_B = 358;
export const LOWER_LIP_BOTTOM = 17;
export const MOUTH_TOP = 13;
export const MOUTH_BOTTOM = 14;

export interface Pt {
  x: number;
  y: number;
}

export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
export const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
export const centroid = (pts: Pt[]): Pt => ({
  x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
  y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
});

/** Geometry helpers for one face, with landmarks scaled to pixel space (y down). */
export function faceGeometry(lm: Pt[], w: number, h: number) {
  const P = (i: number): Pt => ({ x: lm[i].x * w, y: lm[i].y * h });
  const pts = (idx: number[]) => idx.map(P);
  const faceWidth = dist(P(FACE_SIDE_A), P(FACE_SIDE_B));
  const top = P(FOREHEAD);
  const chin = P(CHIN);
  const len = dist(top, chin) || 1;
  const down = { x: (chin.x - top.x) / len, y: (chin.y - top.y) / len };
  const eyes = [EYE_A, EYE_B].map((idx, k) => {
    const poly = pts(idx);
    const center = centroid(poly);
    const width = dist(P(idx[0]), P(idx[8]));
    const browPoly = pts(k === 0 ? BROW_A : BROW_B);
    // Iris indices are matched to the nearest eye, so we don't depend on left/right naming.
    const irisSets = lm.length >= 478 ? [IRIS_A, IRIS_B] : [];
    let iris: { center: Pt; r: number } | null = null;
    for (const set of irisSets) {
      const c = P(set[0]);
      if (dist(c, center) < width * 0.6) iris = { center: c, r: set.slice(1).reduce((s, i) => s + dist(P(i), c), 0) / 4 };
    }
    return { poly, center, width, brow: centroid(browPoly), browPoly, iris };
  });
  const roll = Math.atan2(eyes[1].center.y - eyes[0].center.y, eyes[1].center.x - eyes[0].center.x);
  return { P, pts, faceWidth, down, eyes, roll, center: P(NOSE_TIP) };
}
