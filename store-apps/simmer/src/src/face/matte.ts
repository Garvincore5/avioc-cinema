import type { SegData } from './detector';

/**
 * Turns the AI's low-res (256px) person mask into a hair-accurate matte:
 * 1. a guided filter snaps the mask to the photo's real edges (strands of hair, fingers),
 * 2. edge colours are "decontaminated": the old background's colour is removed from
 *    semi-transparent edge pixels, so no light/dark fringe shows on a new background.
 */
export interface Matte {
  w: number;
  h: number;
  alpha: Float32Array;
  fg: Uint8ClampedArray; // RGBA, decontaminated foreground colours
}

/** Box mean of `src` with radius r, using a summed-area table. */
function boxMean(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const sat = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += src[y * w + x];
      sat[(y + 1) * (w + 1) + x + 1] = sat[y * (w + 1) + x + 1] + row;
    }
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
      const s = sat[y1 * (w + 1) + x1] - sat[y0 * (w + 1) + x1] - sat[y1 * (w + 1) + x0] + sat[y0 * (w + 1) + x0];
      out[y * w + x] = s / ((x1 - x0) * (y1 - y0));
    }
  }
  return out;
}

/** Bilinear upsample of a low-res mask. */
function upsample(src: Float32Array, sw: number, sh: number, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const fy = Math.min(sh - 1, Math.max(0, ((y + 0.5) / h) * sh - 0.5));
    const y0 = Math.floor(fy), y1 = Math.min(sh - 1, y0 + 1), ty = fy - y0;
    for (let x = 0; x < w; x++) {
      const fx = Math.min(sw - 1, Math.max(0, ((x + 0.5) / w) * sw - 0.5));
      const x0 = Math.floor(fx), x1 = Math.min(sw - 1, x0 + 1), tx = fx - x0;
      out[y * w + x] = (src[y0 * sw + x0] * (1 - tx) + src[y0 * sw + x1] * tx) * (1 - ty)
        + (src[y1 * sw + x0] * (1 - tx) + src[y1 * sw + x1] * tx) * ty;
    }
  }
  return out;
}

/**
 * Colour guided filter (He et al.): uses R, G and B as the guide, so edges between areas of similar
 * brightness but different colour (brown coat on a dark wall, hair on a tinted background) still hold.
 */
function colorGuidedFilter(R: Float32Array, G: Float32Array, B: Float32Array, p: Float32Array,
  w: number, h: number, r: number, eps: number): Float32Array {
  const n = w * h;
  const mul = (a: Float32Array, b: Float32Array) => { const o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = a[i] * b[i]; return o; };
  const box = (a: Float32Array) => boxMean(a, w, h, r);
  const mR = box(R), mG = box(G), mB = box(B), mP = box(p);
  const mRp = box(mul(R, p)), mGp = box(mul(G, p)), mBp = box(mul(B, p));
  const vRR = box(mul(R, R)), vRG = box(mul(R, G)), vRB = box(mul(R, B));
  const vGG = box(mul(G, G)), vGB = box(mul(G, B)), vBB = box(mul(B, B));
  const aR = new Float32Array(n), aG = new Float32Array(n), aB = new Float32Array(n), b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const cR = mRp[i] - mR[i] * mP[i], cG = mGp[i] - mG[i] * mP[i], cB = mBp[i] - mB[i] * mP[i];
    // Covariance of the guide (+ eps on the diagonal), inverted with the adjugate.
    const s00 = vRR[i] - mR[i] * mR[i] + eps, s01 = vRG[i] - mR[i] * mG[i], s02 = vRB[i] - mR[i] * mB[i];
    const s11 = vGG[i] - mG[i] * mG[i] + eps, s12 = vGB[i] - mG[i] * mB[i], s22 = vBB[i] - mB[i] * mB[i] + eps;
    const i00 = s11 * s22 - s12 * s12, i01 = s02 * s12 - s01 * s22, i02 = s01 * s12 - s02 * s11;
    const i11 = s00 * s22 - s02 * s02, i12 = s01 * s02 - s00 * s12, i22 = s00 * s11 - s01 * s01;
    const det = s00 * i00 + s01 * i01 + s02 * i02;
    const inv = det !== 0 ? 1 / det : 0;
    aR[i] = (cR * i00 + cG * i01 + cB * i02) * inv;
    aG[i] = (cR * i01 + cG * i11 + cB * i12) * inv;
    aB[i] = (cR * i02 + cG * i12 + cB * i22) * inv;
    b[i] = mP[i] - aR[i] * mR[i] - aG[i] * mG[i] - aB[i] * mB[i];
  }
  const maR = box(aR), maG = box(aG), maB = box(aB), mb = box(b);
  const q = new Float32Array(n);
  for (let i = 0; i < n; i++) q[i] = maR[i] * R[i] + maG[i] * G[i] + maB[i] * B[i] + mb[i];
  return q;
}

export function computeMatte(img: HTMLCanvasElement, seg: SegData): Matte {
  // Work at up to 1536px: plenty for hair strands, fast enough to run when a photo opens.
  const s = Math.min(1, 1536 / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * s)), h = Math.max(1, Math.round(img.height * s));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const n = w * h;

  const R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n), I = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    R[i] = px[i * 4] / 255; G[i] = px[i * 4 + 1] / 255; B[i] = px[i * 4 + 2] / 255;
    I[i] = 0.299 * R[i] + 0.587 * G[i] + 0.114 * B[i];
  }

  const coarse = upsample(seg.person, seg.w, seg.h, w, h);
  // Two passes: a wide one recovers the shape lost by the 256px model, a tight one picks up strands.
  const r1 = Math.max(4, Math.round(Math.max(w, h) / 90));
  const r2 = Math.max(2, Math.round(Math.max(w, h) / 300));
  let alpha = colorGuidedFilter(R, G, B, coarse, w, h, r1, 1e-3);
  for (let i = 0; i < n; i++) alpha[i] = Math.min(1, Math.max(0, alpha[i]));
  alpha = colorGuidedFilter(R, G, B, alpha, w, h, r2, 5e-4);
  for (let i = 0; i < n; i++) {
    // Firm up the solid areas while keeping a soft ramp for hair.
    const a = Math.min(1, Math.max(0, (alpha[i] - 0.06) / 0.88));
    alpha[i] = a;
  }

  // Colour decontamination: estimate local foreground and background colours,
  // then solve C = a*F + (1-a)*B for F at the edges.
  const rr = r1 * 2;
  const wf = new Float32Array(n), wb = new Float32Array(n);
  for (let i = 0; i < n; i++) { wf[i] = alpha[i] ** 2; wb[i] = (1 - alpha[i]) ** 2; }
  const mean = (ch: Float32Array, wt: Float32Array, mw: Float32Array) => {
    const prod = new Float32Array(n);
    for (let i = 0; i < n; i++) prod[i] = ch[i] * wt[i];
    const m = boxMean(prod, w, h, rr);
    for (let i = 0; i < n; i++) m[i] = mw[i] > 1e-4 ? m[i] / mw[i] : 0;
    return m;
  };
  const mwf = boxMean(wf, w, h, rr), mwb = boxMean(wb, w, h, rr);
  const F = [mean(R, wf, mwf), mean(G, wf, mwf), mean(B, wf, mwf)];
  const Bg = [mean(R, wb, mwb), mean(G, wb, mwb), mean(B, wb, mwb)];
  const fg = new Uint8ClampedArray(n * 4);
  const chans = [R, G, B];
  for (let i = 0; i < n; i++) {
    const a = alpha[i];
    const solid = Math.min(1, Math.max(0, (a - 0.08) / 0.3));
    for (let k = 0; k < 3; k++) {
      let v = chans[k][i];
      if (a < 0.98) {
        const solved = (v - (1 - a) * Bg[k][i]) / Math.max(a, 0.08);
        v = solid * Math.min(1, Math.max(0, solved)) + (1 - solid) * F[k][i];
      }
      fg[i * 4 + k] = v * 255;
    }
    fg[i * 4 + 3] = 255;
  }
  return { w, h, alpha, fg };
}
