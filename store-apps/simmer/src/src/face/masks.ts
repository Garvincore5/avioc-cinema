import type { MaskSet } from '../engine/renderer';
import type { SegData } from './detector';
import { computeMatte } from './matte';
import { pushPull } from '../tools/fill';
import {
  FACE_OVAL, LIPS_INNER, LIPS_OUTER, CHEEK_A, CHEEK_B, CHIN, FACE_SIDE_A, FACE_SIDE_B, FOREHEAD, LOWER_LIP_BOTTOM,
  MOUTH_CORNER_A, MOUTH_CORNER_B, NOSE_BRIDGE, NOSE_LOWER, faceGeometry, lerp, dist, type Pt,
} from './landmarks';

type Ctx = CanvasRenderingContext2D;
type Geo = ReturnType<typeof faceGeometry>;

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function poly(ctx: Ctx, pts: Pt[]) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

function ellipse(ctx: Ctx, c: Pt, rx: number, ry: number, rot: number) {
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, Math.max(rx, 0.5), Math.max(ry, 0.5), rot, 0, Math.PI * 2);
}

/** Draws white shapes on black, then feathers the result. */
function layer(w: number, h: number, geos: Geo[], draw: (ctx: Ctx, g: Geo) => void, blur: (g: Geo) => number) {
  const raw = makeCanvas(w, h);
  const rc = raw.getContext('2d')!;
  rc.fillStyle = '#000';
  rc.fillRect(0, 0, w, h);
  for (const g of geos) {
    rc.fillStyle = '#fff';
    rc.strokeStyle = '#fff';
    rc.lineJoin = 'round';
    draw(rc, g);
  }
  const px = geos.length ? geos.reduce((s, g) => s + blur(g), 0) / geos.length : 0;
  if (px < 0.3) return raw;
  const out = makeCanvas(w, h);
  const oc = out.getContext('2d')!;
  oc.fillStyle = '#000';
  oc.fillRect(0, 0, w, h);
  oc.filter = `blur(${px.toFixed(2)}px)`;
  oc.drawImage(raw, 0, 0);
  return out;
}

/** Packs three grayscale canvases into the R, G and B channels of one canvas. */
function pack(w: number, h: number, chans: HTMLCanvasElement[]) {
  const out = makeCanvas(w, h);
  const ctx = out.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const data = chans.map((c) => c.getContext('2d')!.getImageData(0, 0, w, h).data);
  for (let i = 0; i < w * h * 4; i += 4) {
    img.data[i] = data[0][i];
    img.data[i + 1] = data[1][i];
    img.data[i + 2] = data[2][i];
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

/**
 * Person / skin / hair masks at matte resolution (R = refined person alpha, G = skin, B = hair),
 * plus the colour-decontaminated foreground.
 */
function segCanvases(seg: SegData, img: HTMLCanvasElement) {
  const m = computeMatte(img, seg);
  const out = makeCanvas(m.w, m.h);
  // Skin and hair only need the coarse masks, scaled up smoothly.
  const coarse = makeCanvas(seg.w, seg.h);
  const cctx = coarse.getContext('2d')!;
  const cimg = cctx.createImageData(seg.w, seg.h);
  for (let i = 0; i < seg.w * seg.h; i++) {
    cimg.data[i * 4 + 1] = seg.skin[i] * 255;
    cimg.data[i * 4 + 2] = seg.hair[i] * 255;
    cimg.data[i * 4 + 3] = 255;
  }
  cctx.putImageData(cimg, 0, 0);
  const ctx = out.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(coarse, 0, 0, m.w, m.h);
  const d = ctx.getImageData(0, 0, m.w, m.h);
  for (let i = 0; i < m.w * m.h; i++) {
    d.data[i * 4] = m.alpha[i] * 255;
    d.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(d, 0, 0);
  const fg = makeCanvas(m.w, m.h);
  fg.getContext('2d')!.putImageData(new ImageData(m.fg, m.w, m.h), 0, 0);
  return { seg: out, fg, plate: backgroundPlate(img, m.alpha, m.w, m.h), rows: bodyRows(m.alpha, m.w, m.h) };
}

/**
 * The background with the person removed (filled in from the surroundings). Reshaping only moves the
 * person, so where they used to be, this plate shows through instead of a stretched background.
 */
export function backgroundPlate(img: HTMLCanvasElement, alpha: Float32Array, aw: number, ah: number) {
  const s = Math.min(1, 640 / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * s)), h = Math.max(1, Math.round(img.height * s));
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h);
  const vals = new Float32Array(w * h * 3), wts = new Float32Array(w * h);
  // Person (grown a little so no edge colour leaks in) is the hole to fill.
  const grow = 3;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let a = 0;
      for (let dy = -grow; dy <= grow && a < 0.08; dy += grow) {
        for (let dx = -grow; dx <= grow && a < 0.08; dx += grow) {
          const ax = Math.min(aw - 1, Math.max(0, Math.round(((x + dx + 0.5) / w) * aw)));
          const ay = Math.min(ah - 1, Math.max(0, Math.round(((y + dy + 0.5) / h) * ah)));
          a = Math.max(a, alpha[ay * aw + ax]);
        }
      }
      const i = y * w + x;
      if (a >= 0.08) continue;
      wts[i] = 1;
      for (let k = 0; k < 3; k++) vals[i * 3 + k] = d.data[i * 4 + k];
    }
  }
  const f = pushPull(vals, wts, w, h);
  for (let i = 0; i < w * h; i++) {
    for (let k = 0; k < 3; k++) d.data[i * 4 + k] = f[i * 3 + k];
    d.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(d, 0, 0);
  return c;
}

/** Left/right edge of the person on each row (image fractions), for Slim body. -1 where there's no one. */
function bodyRows(alpha: Float32Array, w: number, h: number) {
  const data = new Float32Array(h * 4);
  for (let y = 0; y < h; y++) {
    let l = -1, r = -1;
    for (let x = 0; x < w; x++) {
      if (alpha[y * w + x] > 0.5) {
        if (l < 0) l = x;
        r = x;
      }
    }
    // GL row order (bottom first), so the shader can index rows by its own uv.y.
    const o = (h - 1 - y) * 4;
    data[o] = l < 0 ? -1 : l / w;
    data[o + 1] = r < 0 ? -1 : (r + 1) / w;
  }
  return { data, h };
}

/** Face oval with the forehead part pushed up toward the hairline. */
function foreheadOval(g: Geo): Pt[] {
  const eyeMid = lerp(g.eyes[0].center, g.eyes[1].center, 0.5);
  const top = g.P(FACE_OVAL[0]);
  const lift = Math.hypot(top.x - eyeMid.x, top.y - eyeMid.y) * 0.35;
  return g.pts(FACE_OVAL).map((p) => {
    // How far above the eye line this point is (0 at the eyes, 1 at the top of the oval).
    const above = -((p.x - eyeMid.x) * g.down.x + (p.y - eyeMid.y) * g.down.y);
    const k = Math.max(0, Math.min(1, above / (lift / 0.35)));
    return { x: p.x - g.down.x * lift * k, y: p.y - g.down.y * lift * k };
  });
}

/** Per-face choices: whether edits apply to this face, and whether makeup is used. */
export interface FaceOpt {
  on: boolean;
  gender: 'female' | 'male';
}

export const defaultFaceOpts = (n: number): FaceOpt[] => Array.from({ length: n }, () => ({ on: true, gender: 'female' as const }));

/** Builds all region masks for the retouching shader from face landmarks + segmentation. */
export function buildMasks(faces: Pt[][], seg: SegData | null, img: HTMLCanvasElement, opts?: FaceOpt[]): MaskSet {
  return {
    ...buildFaceMasks(faces, opts ?? defaultFaceOpts(faces.length), img.width, img.height),
    ...(seg ? segCanvases(seg, img) : { seg: null, fg: null, plate: null, rows: null }),
  };
}

/**
 * Face-region masks (eyes, irises, brows, nose, lips, teeth, cheeks…) for the chosen faces only.
 * Makeup regions are skipped for faces marked male.
 */
export function buildFaceMasks(allFaces: Pt[][], opts: FaceOpt[], imgW: number, imgH: number) {
  // Masks at full preview resolution keep lip, eye and brow edges accurate.
  const scale = Math.min(1, 2048 / Math.max(imgW, imgH));
  const w = Math.max(1, Math.round(imgW * scale));
  const h = Math.max(1, Math.round(imgH * scale));
  const faces = allFaces.filter((_, i) => opts[i]?.on ?? true);
  const geos = faces.map((lm) => faceGeometry(lm, w, h));
  const makeupGeos = allFaces.flatMap((lm, i) =>
    (opts[i]?.on ?? true) && (opts[i]?.gender ?? 'female') === 'female' ? [faceGeometry(lm, w, h)] : []);
  const L = (draw: (ctx: Ctx, g: Geo) => void, blur: (g: Geo) => number) => layer(w, h, geos, draw, blur);
  const LM = (draw: (ctx: Ctx, g: Geo) => void, blur: (g: Geo) => number) => layer(w, h, makeupGeos, draw, blur);

  const eyesPoly = (ctx: Ctx, g: Geo) => g.eyes.forEach((e) => { poly(ctx, e.poly); ctx.fill(); });

  // The landmark oval stops below the hairline; extend the top so the whole forehead is part of the face.
  const faceOval = L((ctx, g) => { poly(ctx, foreheadOval(g)); ctx.fill(); }, (g) => g.faceWidth * 0.03);
  const eyeOpen = L(eyesPoly, (g) => g.faceWidth * 0.006);
  const mouthIn = L((ctx, g) => { poly(ctx, g.pts(LIPS_INNER)); ctx.fill(); }, (g) => g.faceWidth * 0.005);

  const lips = LM((ctx, g) => {
    poly(ctx, g.pts(LIPS_OUTER));
    ctx.fill();
    ctx.fillStyle = '#000';
    poly(ctx, g.pts(LIPS_INNER));
    ctx.fill();
  }, (g) => g.faceWidth * 0.005);

  const underEye = L((ctx, g) => {
    for (const e of g.eyes) {
      const c = { x: e.center.x + g.down.x * e.width * 0.5, y: e.center.y + g.down.y * e.width * 0.5 };
      ellipse(ctx, c, e.width * 0.55, e.width * 0.26, g.roll);
      ctx.fill();
    }
    ctx.fillStyle = '#000';
    for (const e of g.eyes) {
      poly(ctx, e.poly);
      ctx.fill();
    }
  }, (g) => g.eyes[0].width * 0.15);

  const blush = LM((ctx, g) => {
    for (const i of [CHEEK_A, CHEEK_B]) {
      ellipse(ctx, g.P(i), g.faceWidth * 0.12, g.faceWidth * 0.09, g.roll);
      ctx.fill();
    }
  }, (g) => g.faceWidth * 0.07);

  const shadow = LM((ctx, g) => {
    for (const e of g.eyes) {
      const c = lerp(e.center, e.brow, 0.45);
      ellipse(ctx, c, e.width * 0.62, dist(e.center, e.brow) * 0.45, g.roll);
      ctx.fill();
    }
    ctx.fillStyle = '#000';
    eyesPoly(ctx, g);
  }, (g) => g.eyes[0].width * 0.12);

  const iris = L((ctx, g) => {
    for (const e of g.eyes) {
      if (!e.iris) continue;
      ctx.save();
      poly(ctx, e.poly);
      ctx.clip();
      ctx.beginPath();
      ctx.arc(e.iris.center.x, e.iris.center.y, e.iris.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }, (g) => g.faceWidth * 0.003);

  const protect = L((ctx, g) => {
    for (const e of g.eyes) {
      ctx.lineWidth = e.width * 0.18;
      poly(ctx, e.poly);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = g.faceWidth * 0.015;
      poly(ctx, e.browPoly);
      ctx.fill();
      ctx.stroke();
    }
    ctx.lineWidth = g.faceWidth * 0.012;
    poly(ctx, g.pts(LIPS_OUTER));
    ctx.fill();
    ctx.stroke();
    // Nostrils and nose wings: mostly protected so the nose keeps its shape and shadows.
    ctx.fillStyle = 'rgb(190,190,190)';
    poly(ctx, g.pts(NOSE_LOWER));
    ctx.fill();
    // Eyelids (where eyeshadow sits): partly protected so her own makeup and lid creases stay.
    ctx.fillStyle = 'rgb(150,150,150)';
    for (const e of g.eyes) {
      ellipse(ctx, lerp(e.center, e.brow, 0.45), e.width * 0.6, dist(e.center, e.brow) * 0.45, g.roll);
      ctx.fill();
    }
  }, (g) => g.faceWidth * 0.01);

  const contour = L((ctx, g) => {
    ctx.save();
    poly(ctx, g.pts(FACE_OVAL));
    ctx.clip();
    // Temples, cheek sides and jaw sides only: shading the chin/jaw bottom would leave a seam against the neck.
    ctx.lineWidth = g.faceWidth * 0.11;
    ctx.lineCap = 'round';
    for (const side of [[297, 332, 284, 251, 389, 356, 454, 323, 361, 288], [58, 132, 93, 234, 127, 162, 21, 54, 103, 67]]) {
      ctx.beginPath();
      g.pts(side).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    }
    // Cheek hollows: under the cheekbone, on the line from the ear side toward the mouth corner.
    for (const [side, corner] of [[FACE_SIDE_A, MOUTH_CORNER_A], [FACE_SIDE_B, MOUTH_CORNER_B]]) {
      const a = g.P(side), b = g.P(corner);
      const c = lerp(a, b, 0.33);
      ellipse(ctx, { x: c.x + g.down.x * g.faceWidth * 0.03, y: c.y + g.down.y * g.faceWidth * 0.03 },
        g.faceWidth * 0.13, g.faceWidth * 0.04, Math.atan2(b.y - a.y, b.x - a.x));
      ctx.fill();
    }
    ctx.restore();
  }, (g) => g.faceWidth * 0.05);

  const highlight = L((ctx, g) => {
    const browMid = lerp(g.eyes[0].brow, g.eyes[1].brow, 0.5);
    ellipse(ctx, lerp(g.P(FOREHEAD), browMid, 0.55), g.faceWidth * 0.13, g.faceWidth * 0.07, g.roll);
    ctx.fill();
    ctx.lineWidth = g.faceWidth * 0.04;
    ctx.lineCap = 'round';
    ctx.beginPath();
    g.pts(NOSE_BRIDGE).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    ellipse(ctx, lerp(g.P(CHIN), g.P(LOWER_LIP_BOTTOM), 0.45), g.faceWidth * 0.07, g.faceWidth * 0.035, g.roll);
    ctx.fill();
    for (const [e, cheek] of [[g.eyes[0], CHEEK_A], [g.eyes[1], CHEEK_B]] as const) {
      ellipse(ctx, lerp(e.center, g.P(cheek), 0.6), g.faceWidth * 0.06, g.faceWidth * 0.03, g.roll);
      ctx.fill();
    }
  }, (g) => g.faceWidth * 0.035);

  const brows = L((ctx, g) => g.eyes.forEach((e) => { poly(ctx, e.browPoly); ctx.fill(); }), (g) => g.faceWidth * 0.006);

  return {
    a: pack(w, h, [faceOval, eyeOpen, mouthIn]),
    b: pack(w, h, [lips, underEye, blush]),
    c: pack(w, h, [shadow, iris, protect]),
    d: pack(w, h, [contour, highlight, brows]),
  };
}
