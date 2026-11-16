import type { ColorGrade, Curves, Project } from '../types';
import { buildCurveLut, curvesAreIdentity } from './curves';
import type { Layer } from './engine';
import { transformAt } from './keyframes';

const VERT = `#version 300 es
in vec2 aCorner;            // -0.5..0.5
uniform vec2 uFrame;        // project size in px
uniform vec2 uSize;         // drawn size in px (before scale)
uniform vec2 uOffset;       // px from center
uniform float uScale;
uniform float uRot;         // radians
uniform vec2 uFlip;         // -1 flips an axis
uniform vec4 uCrop;         // left, top, right, bottom (fractions of the source)
uniform float uExpand;      // grows the quad (px), used by the shadow pass
out vec2 vUv;
out vec2 vLocal;            // px from the quad center, before rotation
void main() {
  vec2 p = aCorner * (uSize * uScale + 2.0 * uExpand);
  vLocal = p;
  float c = cos(uRot), s = sin(uRot);
  p = vec2(p.x * c - p.y * s, p.x * s + p.y * c) + uOffset;
  gl_Position = vec4(p / (uFrame * 0.5) * vec2(1.0, -1.0), 0.0, 1.0);
  vec2 base = aCorner * uFlip + 0.5;
  vUv = vec2(mix(uCrop.x, 1.0 - uCrop.z, base.x), mix(uCrop.y, 1.0 - uCrop.w, base.y));
}`;

// Grade order: white balance -> exposure -> lift/gamma/gain -> contrast -> saturation -> curves -> luma curve.
const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vLocal;
uniform sampler2D uTex;
uniform sampler2D uCurve;
uniform float uUseCurve;
uniform float uOpacity;
uniform float uExposure, uContrast, uSaturation, uTemp, uTint;
uniform vec3 uLift, uGamma, uGain;
uniform float uBright, uWipe;
uniform vec2 uFrame;
uniform vec2 uHalf;          // half of the drawn (scaled) size, px
uniform float uRadius, uBorder, uShadowPass, uShadow;
uniform vec4 uBorderColor;
out vec4 outColor;

float sdRoundRect(vec2 p, vec2 b, float r) {
  r = min(r, min(b.x, b.y));
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
float lut(float x, int ch) {
  vec4 v = texture(uCurve, vec2(clamp(x, 0.0, 1.0) * (255.0 / 256.0) + 0.5 / 256.0, 0.5));
  return ch == 0 ? v.r : ch == 1 ? v.g : ch == 2 ? v.b : v.a;
}

void main() {
  if (uWipe >= 0.0 && gl_FragCoord.x / uFrame.x > uWipe) discard;
  float d = sdRoundRect(vLocal, uHalf, uRadius);
  if (uShadowPass > 0.5) {
    float a = (1.0 - smoothstep(-uShadow, uShadow, d)) * 0.6 * uOpacity;
    outColor = vec4(0.0, 0.0, 0.0, a);
    return;
  }
  vec4 src = texture(uTex, vUv);
  vec3 c = src.rgb;
  c *= vec3(1.0 + uTemp * 0.25, 1.0 + uTint * 0.2, 1.0 - uTemp * 0.25);
  c *= exp2(uExposure);
  c = c * (1.0 + uGain) + uLift * (1.0 - c);
  c = pow(max(c, 0.0), 1.0 / max(1.0 + uGamma, 0.05));
  c = (c - 0.5) * uContrast + 0.5;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = clamp(mix(vec3(l), c, uSaturation), 0.0, 1.0);
  if (uUseCurve > 0.5) {
    c = vec3(lut(c.r, 0), lut(c.g, 1), lut(c.b, 2));
    float l1 = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float l2 = lut(l1, 3);
    c = l1 > 0.002 ? c * (l2 / l1) : c + (l2 - l1);
  }
  c = clamp(c, 0.0, 1.0) * uBright;
  float alpha = src.a;
  if (uBorder > 0.0 && d > -uBorder) { c = uBorderColor.rgb; alpha = 1.0; }
  float edge = (uRadius > 0.0 || uBorder > 0.0) ? clamp(0.5 - d, 0.0, 1.0) : 1.0;
  outColor = vec4(c, alpha * uOpacity * edge);
}`;

export type FrameSource = { el: TexImageSource; w: number; h: number };

export class Renderer {
  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private tex: WebGLTexture;
  private curveTex = new Map<string, WebGLTexture>();
  private u: Record<string, WebGLUniformLocation | null> = {};

  canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL2 is not available in this browser');
    this.gl = gl;
    this.prog = this.link(VERT, FRAG);
    gl.useProgram(this.prog);
    for (const n of ['uFrame', 'uSize', 'uOffset', 'uScale', 'uRot', 'uTex', 'uOpacity', 'uExposure', 'uContrast',
      'uSaturation', 'uTemp', 'uTint', 'uLift', 'uGamma', 'uGain', 'uFlip', 'uBright', 'uWipe', 'uCrop', 'uExpand',
      'uCurve', 'uUseCurve', 'uHalf', 'uRadius', 'uBorder', 'uShadowPass', 'uShadow', 'uBorderColor']) this.u[n] = gl.getUniformLocation(this.prog, n);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.prog, 'aCorner');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // a neutral curve texture on unit 1 so the sampler is always valid
    const dummy = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, dummy);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(this.u.uTex, 0);
    gl.uniform1i(this.u.uCurve, 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  private link(vs: string, fs: string) {
    const gl = this.gl;
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader error');
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link error');
    return p;
  }

  /**
   * Draw one frame. `layers` must be ordered bottom to top.
   */
  render(project: Project, time: number, layers: Layer[]) {
    const gl = this.gl;
    const { width: W, height: H } = project;
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W;
      this.canvas.height = H;
    }
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(this.u.uFrame, W, H);

    for (const { clip, src, fx } of layers) {
      if (!src.w || !src.h) continue;
      const t = transformAt(clip, time);
      const opacity = t.opacity * fx.alpha;
      if (opacity <= 0) continue;
      const crop = clip.crop ?? { l: 0, r: 0, t: 0, b: 0 };
      const cw = src.w * Math.max(0.02, 1 - crop.l - crop.r);
      const ch = src.h * Math.max(0.02, 1 - crop.t - crop.b);
      // "contain" fit of the full source into the frame; cropping trims it without rescaling
      const fit = Math.min(W / src.w, H / src.h);
      const scale = t.scale * fx.scale;
      const sizeW = cw * fit;
      const sizeH = ch * fit;
      const frame = clip.frame;
      gl.uniform2f(this.u.uSize, sizeW, sizeH);
      gl.uniform1f(this.u.uScale, scale);
      gl.uniform1f(this.u.uRot, (t.rotation * Math.PI) / 180);
      gl.uniform2f(this.u.uFlip, clip.flipH ? -1 : 1, clip.flipV ? -1 : 1);
      gl.uniform4f(this.u.uCrop, crop.l, crop.t, crop.r, crop.b);
      gl.uniform2f(this.u.uHalf, (sizeW * scale) / 2, (sizeH * scale) / 2);
      gl.uniform1f(this.u.uRadius, frame?.radius ?? 0);
      gl.uniform1f(this.u.uWipe, fx.wipe);
      gl.uniform1f(this.u.uOpacity, opacity);

      // drop shadow pass (picture-in-picture look)
      if (frame && frame.shadow > 0) {
        gl.uniform1f(this.u.uShadowPass, 1);
        gl.uniform1f(this.u.uShadow, frame.shadow);
        gl.uniform1f(this.u.uExpand, frame.shadow * 1.5);
        gl.uniform2f(this.u.uOffset, t.x + fx.dx, t.y + (fx.dy ?? 0) + frame.shadow * 0.35);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      gl.uniform1f(this.u.uShadowPass, 0);
      gl.uniform1f(this.u.uExpand, 0);
      gl.uniform2f(this.u.uOffset, t.x + fx.dx, t.y + (fx.dy ?? 0));

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src.el);
      } catch {
        continue; // frame not ready yet
      }
      const curve = curvesAreIdentity(clip.curves) ? null : this.curveTexture(clip.curves!);
      gl.uniform1f(this.u.uUseCurve, curve ? 1 : 0);
      if (curve) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, curve);
        gl.activeTexture(gl.TEXTURE0);
      }
      gl.uniform1f(this.u.uBright, fx.bright);
      gl.uniform1f(this.u.uBorder, frame?.border ?? 0);
      const bc = hexToRgb(frame?.borderColor ?? '#ffffff');
      gl.uniform4f(this.u.uBorderColor, bc[0], bc[1], bc[2], 1);
      this.setGrade(clip.color);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }

  private curveTexture(c: Curves) {
    const key = JSON.stringify(c);
    let tex = this.curveTex.get(key);
    if (!tex) {
      const gl = this.gl;
      if (this.curveTex.size > 64) {
        for (const t of this.curveTex.values()) gl.deleteTexture(t);
        this.curveTex.clear();
      }
      tex = gl.createTexture()!;
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, buildCurveLut(c));
      gl.activeTexture(gl.TEXTURE0);
      this.curveTex.set(key, tex);
    }
    return tex;
  }

  private setGrade(g: ColorGrade) {
    const gl = this.gl;
    gl.uniform1f(this.u.uExposure, g.exposure);
    gl.uniform1f(this.u.uContrast, g.contrast);
    gl.uniform1f(this.u.uSaturation, g.saturation);
    gl.uniform1f(this.u.uTemp, g.temperature);
    gl.uniform1f(this.u.uTint, g.tint);
    gl.uniform3fv(this.u.uLift, g.lift);
    gl.uniform3fv(this.u.uGamma, g.gamma);
    gl.uniform3fv(this.u.uGain, g.gain);
  }
}

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
