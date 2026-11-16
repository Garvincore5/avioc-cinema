import { invalidatePersonMask } from '../layers';

/** New, empty Protect mask (black = editable) at the given size. */
export function newProtectMask(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = ctx2d(c);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  return c;
}

/** Paints (or erases) a soft dab on the Protect mask. Coordinates are image fractions. */
export function paintProtect(c: HTMLCanvasElement, u: number, v: number, radius: number, add: boolean) {
  const ctx = ctx2d(c);
  const x = u * c.width, y = v * c.height, r = Math.max(1, radius * c.width);
  const g = ctx.createRadialGradient(x, y, r * 0.5, x, y, r);
  const col = add ? '255,255,255' : '0,0,0';
  g.addColorStop(0, `rgba(${col},1)`);
  g.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Green tint over protected areas, so you can see what you've painted. */
export function drawProtectOverlay(out: HTMLCanvasElement, protect: HTMLCanvasElement) {
  const t = document.createElement('canvas');
  t.width = out.width;
  t.height = out.height;
  const ctx = ctx2d(t);
  ctx.fillStyle = '#2bd96b';
  ctx.fillRect(0, 0, t.width, t.height);
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(protect, 0, 0, t.width, t.height);
  const octx = out.getContext('2d')!;
  octx.save();
  octx.globalAlpha = 0.6;
  octx.globalCompositeOperation = 'screen';
  octx.drawImage(t, 0, 0);
  octx.restore();
}

/**
 * Refine Edge brush (like Photoshop's): inside the brush, every pixel's transparency is re-estimated
 * from its colour, as a mix of the nearby subject colour and the nearby background colour.
 * That recovers individual hair strands and see-through edges that the AI mask blurred over.
 */
export function refineEdge(seg: HTMLCanvasElement, fg: HTMLCanvasElement | null, photo: HTMLCanvasElement,
  u: number, v: number, radius: number) {
  const W = seg.width, H = seg.height;
  const cx = u * W, cy = v * H, r = Math.max(2, radius * W);
  // Look further out than the brush for clean subject / background colour samples.
  const pad = r * 1.5;
  const x0 = Math.max(0, Math.floor(cx - r - pad)), y0 = Math.max(0, Math.floor(cy - r - pad));
  const x1 = Math.min(W, Math.ceil(cx + r + pad)), y1 = Math.min(H, Math.ceil(cy + r + pad));
  const w = x1 - x0, h = y1 - y0;
  if (w <= 2 || h <= 2) return;
  const sctx = ctx2d(seg);
  const S = sctx.getImageData(x0, y0, w, h);
  const t = document.createElement('canvas');
  t.width = w;
  t.height = h;
  ctx2d(t).drawImage(photo, (x0 / W) * photo.width, (y0 / H) * photo.height, (w / W) * photo.width, (h / H) * photo.height, 0, 0, w, h);
  const P = ctx2d(t).getImageData(0, 0, w, h).data;

  // Local subject / background colours: Gaussian-ish weighted means of confident pixels, on a coarse grid.
  const cell = Math.max(2, Math.round(r / 4));
  const gw = Math.ceil(w / cell), gh = Math.ceil(h / cell);
  const fgSum = new Float32Array(gw * gh * 4), bgSum = new Float32Array(gw * gh * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = S.data[i] / 255;
      const g = (Math.floor(y / cell) * gw + Math.floor(x / cell)) * 4;
      const target = a > 0.92 ? fgSum : a < 0.08 ? bgSum : null;
      if (!target) continue;
      target[g] += P[i]; target[g + 1] += P[i + 1]; target[g + 2] += P[i + 2]; target[g + 3] += 1;
    }
  }
  // Spread the samples so every cell finds both colours nearby.
  const spread = (src: Float32Array) => {
    const out = new Float32Array(src.length);
    const R = Math.max(2, Math.ceil(pad / cell) + 1);
    for (let gy = 0; gy < gh; gy++) {
      for (let gx = 0; gx < gw; gx++) {
        let sr = 0, sg = 0, sb = 0, n = 0;
        for (let dy = -R; dy <= R; dy++) {
          for (let dx = -R; dx <= R; dx++) {
            const xx = gx + dx, yy = gy + dy;
            if (xx < 0 || yy < 0 || xx >= gw || yy >= gh) continue;
            const k = (yy * gw + xx) * 4;
            const wt = Math.exp(-(dx * dx + dy * dy) / (R * R * 0.5));
            sr += src[k] * wt; sg += src[k + 1] * wt; sb += src[k + 2] * wt; n += src[k + 3] * wt;
          }
        }
        const o = (gy * gw + gx) * 4;
        if (n > 0) { out[o] = sr / n; out[o + 1] = sg / n; out[o + 2] = sb / n; out[o + 3] = 1; }
      }
    }
    return out;
  };
  const Fc = spread(fgSum), Bc = spread(bgSum);

  const F = fg ? ctx2d(fg).getImageData(x0, y0, w, h) : null;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x0 + x + 0.5 - cx, y0 + y + 0.5 - cy) / r;
      if (d >= 1) continue;
      const g = (Math.floor(y / cell) * gw + Math.floor(x / cell)) * 4;
      if (!Fc[g + 3] || !Bc[g + 3]) continue;
      const i = (y * w + x) * 4;
      // Project the pixel colour onto the background -> subject colour line.
      let num = 0, den = 0;
      for (let c = 0; c < 3; c++) {
        const fb = Fc[g + c] - Bc[g + c];
        num += (P[i + c] - Bc[g + c]) * fb;
        den += fb * fb;
      }
      if (den < 300) continue; // subject and background look alike here: leave the AI's answer
      const est = Math.min(1, Math.max(0, num / den));
      const k = d < 0.6 ? 1 : 1 - (d - 0.6) / 0.4;
      const a = S.data[i] / 255;
      const na = a * (1 - k) + est * k;
      S.data[i] = na * 255;
      if (F) {
        // Decontaminate: solve C = a*F + (1-a)*B for F.
        for (let c = 0; c < 3; c++) {
          const fc = na > 0.05 ? (P[i + c] - (1 - na) * Bc[g + c]) / na : Fc[g + c];
          F.data[i + c] = F.data[i + c] * (1 - k) + Math.min(255, Math.max(0, fc)) * k;
        }
      }
    }
  }
  sctx.putImageData(S, x0, y0);
  if (F && fg) ctx2d(fg).putImageData(F, x0, y0);
  invalidatePersonMask(seg);
}

export interface MatteUndo {
  seg: ImageData;
  fg: ImageData | null;
}

const ctx2d = (c: HTMLCanvasElement) => c.getContext('2d', { willReadFrequently: true })!;

export function snapshotMatte(seg: HTMLCanvasElement, fg: HTMLCanvasElement | null): MatteUndo {
  return {
    seg: ctx2d(seg).getImageData(0, 0, seg.width, seg.height),
    fg: fg && ctx2d(fg).getImageData(0, 0, fg.width, fg.height),
  };
}

export function restoreMatte(seg: HTMLCanvasElement, fg: HTMLCanvasElement | null, u: MatteUndo) {
  ctx2d(seg).putImageData(u.seg, 0, 0);
  if (fg && u.fg) ctx2d(fg).putImageData(u.fg, 0, 0);
  invalidatePersonMask(seg);
}

/**
 * Paints the subject cutout by hand: `add` pulls pixels into the subject, otherwise pushes them
 * to the background. `smart` follows the photo's edges: it only affects pixels whose colour is
 * closer to the side you're painting toward (handy along hair). Coordinates are image fractions.
 */
export function paintMatte(seg: HTMLCanvasElement, fg: HTMLCanvasElement | null, photo: HTMLCanvasElement,
  u: number, v: number, radius: number, add: boolean, smart: boolean) {
  const W = seg.width, H = seg.height;
  const cx = u * W, cy = v * H, r = Math.max(1, radius * W);
  const x0 = Math.max(0, Math.floor(cx - r)), y0 = Math.max(0, Math.floor(cy - r));
  const x1 = Math.min(W, Math.ceil(cx + r)), y1 = Math.min(H, Math.ceil(cy + r));
  const w = x1 - x0, h = y1 - y0;
  if (w <= 0 || h <= 0) return;
  const sctx = ctx2d(seg);
  const S = sctx.getImageData(x0, y0, w, h);
  // Photo pixels under the brush, at matte resolution.
  const P = (() => {
    const t = document.createElement('canvas');
    t.width = w;
    t.height = h;
    ctx2d(t).drawImage(photo, (x0 / W) * photo.width, (y0 / H) * photo.height, (w / W) * photo.width, (h / H) * photo.height, 0, 0, w, h);
    return ctx2d(t).getImageData(0, 0, w, h).data;
  })();

  // For smart mode: average colour of confident subject vs background pixels under the brush.
  const mf = [0, 0, 0], mb = [0, 0, 0];
  let nf = 0, nb = 0;
  if (smart) {
    for (let i = 0; i < w * h; i++) {
      const a = S.data[i * 4] / 255;
      if (a > 0.9) { for (let k = 0; k < 3; k++) mf[k] += P[i * 4 + k]; nf++; }
      else if (a < 0.1) { for (let k = 0; k < 3; k++) mb[k] += P[i * 4 + k]; nb++; }
    }
  }
  const useSmart = smart && nf > 3 && nb > 3;
  for (let k = 0; k < 3; k++) { mf[k] /= nf || 1; mb[k] /= nb || 1; }

  const F = fg ? ctx2d(fg).getImageData(x0, y0, w, h) : null;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x0 + x + 0.5 - cx, y0 + y + 0.5 - cy) / r;
      if (d >= 1) continue;
      let k = d < 0.5 ? 1 : 1 - (d - 0.5) / 0.5;
      const i = (y * w + x) * 4;
      if (useSmart) {
        // How "subject-like" this pixel's colour is, 0..1.
        let df = 0, db = 0;
        for (let c = 0; c < 3; c++) { df += (P[i + c] - mf[c]) ** 2; db += (P[i + c] - mb[c]) ** 2; }
        const t = db / (df + db + 1e-6);
        k *= add ? Math.min(1, t * 1.6) : Math.min(1, (1 - t) * 1.6);
      }
      const a = S.data[i] / 255;
      const na = add ? a + (1 - a) * k : a * (1 - k);
      S.data[i] = na * 255;
      if (F && add) for (let c = 0; c < 3; c++) F.data[i + c] = F.data[i + c] * (1 - k) + P[i + c] * k;
    }
  }
  sctx.putImageData(S, x0, y0);
  if (F && fg) ctx2d(fg).putImageData(F, x0, y0);
  invalidatePersonMask(seg);
}
