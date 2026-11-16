import LibRaw from 'libraw-wasm';

/**
 * Real RAW decoding with LibRaw (WebAssembly): the camera's full sensor data is demosaiced into
 * 16-bit linear RGB, so exposure, highlight recovery, shadows and white balance work on everything
 * the camera captured, not on an 8-bit JPEG preview.
 */
export interface RawData {
  w: number;
  h: number;
  lin: Uint16Array; // RGB, linear light, 16 bits per channel
  baseGain: number; // brings the camera's exposure to a sensible starting brightness
  info: RawInfo;
}

export interface RawInfo {
  camera: string;
  iso: number;
  shutter: string;
  aperture: string;
  focal: string;
  lens: string;
}

export type RawWb = 'shot' | 'auto';

/** Settings that need a fresh decode (they change how the sensor data is turned into RGB). */
export interface RawDecodeOptions {
  wb: RawWb;
  denoise: 0 | 1 | 2;
}

/** Settings applied to the decoded 16-bit data (fast, no re-decode). */
export interface RawParams {
  exposure: number; // EV, -3..3
  highlights: number; // recovery 0..100
  shadows: number; // lift 0..100
  temp: number; // -100..100 (warmer +)
  tint: number; // -100..100 (magenta +)
}

export const RAW_DEFAULTS: RawParams = { exposure: 0, highlights: 40, shadows: 15, temp: 0, tint: 0 };

const fmtShutter = (s: number) => (!s ? '' : s >= 1 ? `${s}s` : `1/${Math.round(1 / s)}s`);

export async function decodeRaw(bytes: Uint8Array, o: RawDecodeOptions): Promise<RawData> {
  const lr = new LibRaw();
  try {
    await lr.open(bytes.slice(), {
      outputBps: 16,
      gamm: [1, 1], // linear output: we do our own tone mapping from the full 16-bit range
      noAutoBright: true, // keep every highlight; brightness is set by baseGain instead
      useCameraWb: o.wb === 'shot',
      useAutoWb: o.wb === 'auto',
      outputColor: 1, // sRGB primaries
      highlight: 2, // blend clipped channels instead of turning them magenta
      userQual: 3, // AHD demosaic
      fbddNoiserd: o.denoise,
    });
    const meta = await lr.metadata(true);
    const img = await lr.imageData();
    if (!img || img.colors < 3) throw new Error('This RAW file could not be decoded');
    const lin = img.data instanceof Uint16Array ? img.data : new Uint16Array(img.data.buffer);

    // Starting brightness: put the 99.5th percentile of brightness just under white.
    const hist = new Uint32Array(1024);
    const step = Math.max(1, Math.floor((img.width * img.height) / 200000));
    let n = 0;
    for (let i = 0; i < img.width * img.height; i += step) {
      const L = 0.2126 * lin[i * 3] + 0.7152 * lin[i * 3 + 1] + 0.0722 * lin[i * 3 + 2];
      hist[Math.min(1023, L >> 6)]++;
      n++;
    }
    let acc = 0, p = 1023;
    for (; p > 0; p--) {
      acc += hist[p];
      if (acc > n * 0.005) break;
    }
    const baseGain = Math.min(16, Math.max(0.5, 0.92 / Math.max(1e-4, (p * 64) / 65535)));

    const m = meta ?? ({} as Record<string, never>);
    const lens = (m as { lens?: { Lens?: string } }).lens?.Lens ?? '';
    return {
      w: img.width,
      h: img.height,
      lin,
      baseGain,
      info: {
        camera: `${m.camera_make ?? ''} ${m.camera_model ?? ''}`.trim(),
        iso: m.iso_speed ?? 0,
        shutter: fmtShutter(m.shutter ?? 0),
        aperture: m.aperture ? `f/${Number(m.aperture).toFixed(1)}` : '',
        focal: m.focal_len ? `${Math.round(m.focal_len)}mm` : '',
        lens,
      },
    };
  } finally {
    lr.dispose();
  }
}

const srgbEncode = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);

/**
 * Turns the 16-bit linear data into the 8-bit image the editor works on, applying RAW exposure,
 * white balance, highlight recovery (a soft roll-off instead of clipping) and shadow lift.
 */
export function developRaw(raw: RawData, p: RawParams): HTMLCanvasElement {
  const { w, h, lin } = raw;
  const gain = (raw.baseGain * Math.pow(2, p.exposure)) / 65535;
  const wr = Math.pow(2, (p.temp / 100) * 0.6), wb = Math.pow(2, (-p.temp / 100) * 0.6);
  const wg = Math.pow(2, (-p.tint / 100) * 0.4);
  // Highlight recovery: above a knee, brightness rolls off smoothly toward white instead of clipping,
  // which brings back detail the sensor captured beyond the normal white point.
  const hr = p.highlights / 100, knee = 0.6;
  const lift = p.shadows / 100;
  // sRGB encode through a lookup table for speed.
  const LUT = 4096;
  const enc = new Uint8ClampedArray(LUT + 1);
  for (let i = 0; i <= LUT; i++) {
    const v = i / LUT;
    // Gentle base contrast curve, like a camera's default rendering.
    const s = srgbEncode(v);
    enc[i] = Math.round((s + (s * s * (3 - 2 * s) - s) * 0.25) * 255);
  }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const out = ctx.createImageData(w, h);
  const d = out.data;
  for (let i = 0, j = 0; i < w * h; i++, j += 3) {
    let r = lin[j] * gain * wr, g = lin[j + 1] * gain * wg, b = lin[j + 2] * gain * wb;
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (L > 0) {
      let Lt = L;
      if (L > knee) {
        const soft = knee + (1 - knee) * (1 - Math.exp(-(L - knee) / (1 - knee)));
        Lt = Math.min(L, 1) * (1 - hr) + soft * hr;
      }
      // Shadow lift on the darkest tones only.
      if (lift > 0 && Lt < 0.5) Lt = Lt + lift * 0.5 * Lt * (1 - Lt / 0.5) * (1 - Lt / 0.5);
      const k = Lt / L;
      r *= k; g *= k; b *= k;
      // Keep colours inside the gamut by desaturating toward the luminance instead of clipping channels.
      const mx = Math.max(r, g, b);
      if (mx > 1) {
        const t = (mx - 1) / Math.max(1e-6, mx - Lt);
        r += (Lt - r) * t; g += (Lt - g) * t; b += (Lt - b) * t;
      }
    }
    const o = i * 4;
    d[o] = enc[Math.max(0, Math.min(LUT, (r * LUT) | 0))];
    d[o + 1] = enc[Math.max(0, Math.min(LUT, (g * LUT) | 0))];
    d[o + 2] = enc[Math.max(0, Math.min(LUT, (b * LUT) | 0))];
    d[o + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  return c;
}
