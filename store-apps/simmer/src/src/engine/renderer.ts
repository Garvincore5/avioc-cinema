import { BLUR_FRAG, COPY_FRAG, MAIN_FRAG, MAX_WARPS, OUTPUT_FRAG, VERT, WARP_FRAG } from './shaders';
import { DEFAULTS, DEV_KEYS, scopedKey, type Settings } from '../settings';
import type { Warp } from './warps';

type Target = { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number };
type Program = { prog: WebGLProgram; locs: Map<string, WebGLUniformLocation | null> };

export interface MaskSet {
  a: HTMLCanvasElement;
  b: HTMLCanvasElement;
  c: HTMLCanvasElement;
  d: HTMLCanvasElement;
  seg: HTMLCanvasElement | null; // R = person matte, G = skin, B = hair
  fg: HTMLCanvasElement | null; // edge-decontaminated subject colours
  plate: HTMLCanvasElement | null; // background with the person filled in
  rows: { data: Float32Array; h: number } | null; // person's left/right edge per row (RGBA float, GL order)
}

export interface RenderOptions {
  showOriginal?: boolean;
  split?: number; // < 0 = off
  skinRadius: number; // in pixels of the render size
  warps: Warp[];
  maskView?: number; // Select and Mask view: 0 normal, 1 overlay, 2 on black, 3 on white, 4 black & white
  skinAll?: boolean; // false when only some faces are chosen: skin edits stay on those faces
  bodyTop?: number; // GL y (0 bottom..1 top) where Slim body stops, just below the chin; 0 = whole person
}

export interface Displacement {
  w: number;
  h: number;
  data: Float32Array;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export class Renderer {
  readonly gl: WebGL2RenderingContext;
  readonly maxSize: number;
  private progs: Record<'copy' | 'blur' | 'main' | 'warp' | 'output', Program>;
  private src: WebGLTexture;
  private masks: { a: WebGLTexture; b: WebGLTexture; c: WebGLTexture; d: WebGLTexture; seg: WebGLTexture; fg: WebGLTexture };
  private hasSeg = false;
  private disp: WebGLTexture;
  private hasDisp = false;
  private bgImg: WebGLTexture;
  private bgAspect = 0; // 0 = no background image
  private protect: WebGLTexture;
  private hasProtect = false;
  private plate: WebGLTexture;
  private rows: WebGLTexture;
  private hasPlate = false;
  private targets: Record<string, Target> = {};
  private w = 1;
  private h = 1;

  constructor(readonly canvas: HTMLCanvasElement, preserve = false) {
    const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: preserve, antialias: false, premultipliedAlpha: false });
    if (!gl) throw new Error('WebGL2 is not available in this browser');
    this.gl = gl;
    this.maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    this.progs = {
      copy: this.compile(COPY_FRAG),
      blur: this.compile(BLUR_FRAG),
      main: this.compile(MAIN_FRAG),
      warp: this.compile(WARP_FRAG),
      output: this.compile(OUTPUT_FRAG),
    };
    this.src = this.blankTexture();
    this.masks = {
      a: this.blankTexture(), b: this.blankTexture(), c: this.blankTexture(), d: this.blankTexture(),
      seg: this.blankTexture(), fg: this.blankTexture(),
    };
    this.disp = this.blankTexture();
    this.bgImg = this.blankTexture();
    this.protect = this.blankTexture();
    this.plate = this.blankTexture();
    this.rows = this.blankTexture();
  }

  /** Image shown behind the person when "Replace with image" is used. */
  setBackgroundImage(img: HTMLCanvasElement | null) {
    this.bgAspect = img ? img.width / img.height : 0;
    if (img) this.upload(this.bgImg, img);
  }

  /** Uploads the hand-painted liquify field (or clears it). */
  setDisplacement(d: Displacement | null) {
    const gl = this.gl;
    this.hasDisp = !!d;
    if (!d) return;
    gl.bindTexture(gl.TEXTURE_2D, this.disp);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, d.w, d.h, 0, gl.RG, gl.FLOAT, d.data);
  }

  private compile(frag: string): Program {
    const gl = this.gl;
    const sh = (type: number, code: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, code);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader error');
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link error');
    return { prog, locs: new Map() };
  }

  private loc(p: Program, name: string) {
    if (!p.locs.has(name)) p.locs.set(name, this.gl.getUniformLocation(p.prog, name));
    return p.locs.get(name)!;
  }

  private newTexture() {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  private blankTexture() {
    const gl = this.gl;
    const t = this.newTexture();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    return t;
  }

  private upload(tex: WebGLTexture, img: TexImageSource) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  private target(name: string, w: number, h: number): Target {
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));
    const gl = this.gl;
    let t = this.targets[name];
    if (t && t.w === w && t.h === h) return t;
    if (t) {
      gl.deleteTexture(t.tex);
      gl.deleteFramebuffer(t.fbo);
    }
    const tex = this.newTexture();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    t = { tex, fbo, w, h };
    this.targets[name] = t;
    return t;
  }

  private draw(p: Program, out: Target | null, textures: Record<string, WebGLTexture>, setUniforms?: () => void) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.fbo : null);
    gl.viewport(0, 0, out ? out.w : this.w, out ? out.h : this.h);
    gl.useProgram(p.prog);
    let unit = 0;
    for (const [name, tex] of Object.entries(textures)) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(this.loc(p, name), unit++);
    }
    setUniforms?.();
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private blur(input: Target, tmp: Target, out: Target, spread: number) {
    const b = this.progs.blur;
    this.draw(b, tmp, { uTex: input.tex }, () => this.gl.uniform2f(this.loc(b, 'uDir'), spread / input.w, 0));
    this.draw(b, out, { uTex: tmp.tex }, () => this.gl.uniform2f(this.loc(b, 'uDir'), 0, spread / tmp.h));
  }

  /** Uploads the photo and precomputes the blur pyramid (only changes when the photo changes). */
  setSource(img: TexImageSource, w: number, h: number) {
    this.w = w;
    this.h = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.upload(this.src, img);
    const srcT: Target = { tex: this.src, fbo: null!, w, h };
    const copy = (from: Target, to: Target) => this.draw(this.progs.copy, to, { uTex: from.tex });

    this.blur(srcT, this.target('tmpFull', w, h), this.target('blurS', w, h), 1);

    const half = this.target('half', w / 2, h / 2);
    const quarter = this.target('quarter', w / 4, h / 4);
    copy(srcT, half);
    const tmpH = this.target('tmpH', half.w, half.h);
    const blurM = this.target('blurM', half.w, half.h);
    this.blur(half, tmpH, blurM, 1.5);
    this.blur(blurM, tmpH, blurM, 1.5);
    copy(half, quarter);
    const tmpQ = this.target('tmpQ', quarter.w, quarter.h);
    const blurL = this.target('blurL', quarter.w, quarter.h);
    this.blur(quarter, tmpQ, blurL, 1.5);
    this.blur(blurL, tmpQ, blurL, 1.5);
    this.blur(blurL, tmpQ, blurL, 1.5);

    const eighth = this.target('eighth', w / 8, h / 8);
    const sixteenth = this.target('sixteenth', w / 16, h / 16);
    copy(blurL, eighth);
    copy(eighth, sixteenth);
    const tmpX = this.target('tmpX', sixteenth.w, sixteenth.h);
    const blurXL = this.target('blurXL', sixteenth.w, sixteenth.h);
    this.blur(sixteenth, tmpX, blurXL, 1.5);
    this.blur(blurXL, tmpX, blurXL, 1.5);
    this.blur(blurXL, tmpX, blurXL, 1.5);
  }

  setMasks(m: MaskSet) {
    this.upload(this.masks.a, m.a);
    this.upload(this.masks.b, m.b);
    this.upload(this.masks.c, m.c);
    this.upload(this.masks.d, m.d);
    this.hasSeg = !!m.seg;
    if (m.seg) this.upload(this.masks.seg, m.seg);
    if (m.fg) this.upload(this.masks.fg, m.fg);
    this.hasPlate = !!(m.seg && m.plate && m.rows);
    if (m.plate) this.upload(this.plate, m.plate);
    if (m.rows) {
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.rows);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 1, m.rows.h, 0, gl.RGBA, gl.FLOAT, m.rows.data);
    }
  }

  /** Areas painted with the Protect brush (R channel), or null for none. */
  setProtect(c: HTMLCanvasElement | null) {
    this.hasProtect = !!c;
    if (c) this.upload(this.protect, c);
  }

  /** Re-uploads only the cutout after it was painted by hand. */
  updateMatte(seg: HTMLCanvasElement, fg: HTMLCanvasElement | null) {
    this.upload(this.masks.seg, seg);
    if (fg) this.upload(this.masks.fg, fg);
  }

  private setSettings(p: Program, s: Settings) {
    const gl = this.gl;
    const set = (name: string, v: number | string | undefined) => {
      const l = this.loc(p, name);
      if (!l || v === undefined) return;
      if (typeof v === 'string') gl.uniform3f(l, ...hexToRgb(v));
      else gl.uniform1f(l, v / 100);
    };
    for (const [key, v] of Object.entries(s)) if (!key.includes(':')) set(`u_${key}`, v);
    // Light & color for the whole photo, the subject only and the background only.
    (['whole', 'subject', 'background'] as const).forEach((scope, i) => {
      let on = i === 0;
      for (const key of DEV_KEYS) {
        const k = scopedKey(scope, key);
        set(`uDev[${i}].${key}`, s[k] ?? DEFAULTS[k]);
        if (s[k] !== undefined && s[k] !== DEFAULTS[k]) on = true;
      }
      const l = this.loc(p, `uDevOn[${i}]`);
      if (l) gl.uniform1f(l, on ? 1 : 0);
    });
  }

  render(s: Settings, o: RenderOptions) {
    const gl = this.gl;
    const { w, h } = this;
    const main = this.target('main', w, h);
    const t = this.targets;

    const mp = this.progs.main;
    this.draw(mp, main, {
      uSrc: this.src, uBlurS: t.blurS.tex, uBlurM: t.blurM.tex, uBlurL: t.blurL.tex, uBlurXL: t.blurXL.tex,
      uMaskA: this.masks.a, uMaskB: this.masks.b, uMaskC: this.masks.c, uMaskD: this.masks.d, uSeg: this.masks.seg,
      uBgImg: this.bgImg, uFg: this.masks.fg, uProtect: this.protect,
    }, () => {
      gl.uniform1f(this.loc(mp, 'uHasProtect'), this.hasProtect ? 1 : 0);
      gl.uniform1f(this.loc(mp, 'uMaskView'), o.maskView ?? 0);
      gl.uniform1f(this.loc(mp, 'uSkinAll'), o.skinAll === false ? 0 : 1);
      // "Cover" fit: crop the background image to the photo's shape.
      const a = w / h, b = this.bgAspect || a;
      gl.uniform2f(this.loc(mp, 'uBgScale'), b > a ? a / b : 1, b > a ? 1 : b / a);
      gl.uniform1f(this.loc(mp, 'uHasBgImg'), this.bgAspect ? 1 : 0);
      gl.uniform2f(this.loc(mp, 'uTexel'), 1 / w, 1 / h);
      gl.uniform1f(this.loc(mp, 'uSkinRadius'), o.skinRadius);
      gl.uniform1f(this.loc(mp, 'uHasSeg'), this.hasSeg ? 1 : 0);
      this.setSettings(mp, s);
    });

    let final = main;
    const warps = o.warps.slice(0, MAX_WARPS);
    const bodySlim = Number(s.bodySlim ?? 0);
    if (warps.length || this.hasDisp || (bodySlim && this.hasPlate)) {
      final = this.target('warp', w, h);
      const wp = this.progs.warp;
      const W = new Float32Array(MAX_WARPS * 4);
      const V = new Float32Array(MAX_WARPS * 4);
      warps.forEach((k, i) => {
        W.set([k.cx, k.cy, k.r, k.type], i * 4);
        V.set([k.vx, k.vy, 0, 0], i * 4);
      });
      this.draw(wp, final, {
        uTex: main.tex, uDisp: this.disp, uPerson: this.masks.seg, uPlate: this.plate, uRows: this.rows, uBgImg: this.bgImg,
      }, () => {
        gl.uniform2f(this.loc(wp, 'uSize'), w, h);
        gl.uniform1i(this.loc(wp, 'uCount'), warps.length);
        gl.uniform1f(this.loc(wp, 'uHasDisp'), this.hasDisp ? 1 : 0);
        // Face/body reshaping moves only the person when we know where they are.
        gl.uniform1f(this.loc(wp, 'uPersonOnly'), this.hasPlate && (warps.length > 0 || bodySlim !== 0) ? 1 : 0);
        gl.uniform1f(this.loc(wp, 'uBodyTop'), o.bodyTop ?? 0);
        const a = w / h, b = this.bgAspect || a;
        gl.uniform2f(this.loc(wp, 'uBgScale'), b > a ? a / b : 1, b > a ? 1 : b / a);
        gl.uniform1f(this.loc(wp, 'uHasBgImg'), this.bgAspect ? 1 : 0);
        gl.uniform4fv(this.loc(wp, 'uW'), W);
        gl.uniform4fv(this.loc(wp, 'uV'), V);
        this.setSettings(wp, s);
      });
    }

    const op = this.progs.output;
    this.draw(op, null, { uTex: final.tex, uOrig: this.src }, () => {
      gl.uniform1f(this.loc(op, 'uSplit'), o.split ?? -1);
      gl.uniform1f(this.loc(op, 'uShowOriginal'), o.showOriginal ? 1 : 0);
      gl.uniform1f(this.loc(op, 'uAspect'), w / h);
      gl.uniform1f(this.loc(op, 'uLineW'), 1.5 / w);
      this.setSettings(op, s);
    });
  }

  dispose() {
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
