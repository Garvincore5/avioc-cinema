/**
 * Hand-painted liquify, stored as a low-res displacement field in GL uv space (origin bottom-left).
 * Each cell holds how far (in uv units) the output pixel there looks back into the photo.
 */
export class LiquifyField {
  readonly w: number;
  readonly h: number;
  data: Float32Array;

  constructor(readonly imgW: number, readonly imgH: number, data?: Float32Array) {
    const s = 512 / Math.max(imgW, imgH);
    this.w = Math.max(2, Math.round(imgW * s));
    this.h = Math.max(2, Math.round(imgH * s));
    this.data = data ?? new Float32Array(this.w * this.h * 2);
  }

  clone() {
    return new LiquifyField(this.imgW, this.imgH, this.data.slice());
  }

  isEmpty() {
    return this.data.every((v) => v === 0);
  }

  private sample(old: Float32Array, u: number, v: number): [number, number] {
    const x = Math.min(this.w - 1, Math.max(0, u * this.w - 0.5));
    const y = Math.min(this.h - 1, Math.max(0, v * this.h - 0.5));
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = Math.min(this.w - 1, x0 + 1), y1 = Math.min(this.h - 1, y0 + 1);
    const fx = x - x0, fy = y - y0;
    const at = (xx: number, yy: number, k: number) => old[(yy * this.w + xx) * 2 + k];
    const lerp2 = (k: number) =>
      (at(x0, y0, k) * (1 - fx) + at(x1, y0, k) * fx) * (1 - fy) + (at(x0, y1, k) * (1 - fx) + at(x1, y1, k) * fx) * fy;
    return [lerp2(0), lerp2(1)];
  }

  /**
   * Pushes image content at (u, v) by (du, dv), all in top-left image fractions,
   * with a brush radius given as a fraction of image width.
   */
  push(u: number, v: number, du: number, dv: number, radius: number) {
    const { imgW: W, imgH: H } = this;
    // Convert to GL orientation.
    v = 1 - v;
    dv = -dv;
    const R = radius * W;
    const mx = du * W, my = dv * H;
    const mm = mx * mx + my * my;
    if (!mm) return;
    const old = this.data.slice();
    const i0 = Math.max(0, Math.floor(((u * W - R) / W) * this.w));
    const i1 = Math.min(this.w - 1, Math.ceil(((u * W + R) / W) * this.w));
    const j0 = Math.max(0, Math.floor(((v * H - R) / H) * this.h));
    const j1 = Math.min(this.h - 1, Math.ceil(((v * H + R) / H) * this.h));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const px = ((i + 0.5) / this.w) * W, py = ((j + 0.5) / this.h) * H;
        const dx = px - u * W, dy = py - v * H;
        const e = R * R - (dx * dx + dy * dy);
        if (e <= 0) continue;
        let f = e / (e + mm);
        f *= f;
        const [ox, oy] = this.sample(old, (px - f * mx) / W, (py - f * my) / H);
        const k = (j * this.w + i) * 2;
        this.data[k] = (f * mx) / W + ox;
        this.data[k + 1] = (f * my) / H + oy;
      }
    }
  }
}
