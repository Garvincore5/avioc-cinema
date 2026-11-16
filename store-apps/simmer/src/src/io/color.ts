/**
 * Colour profiles: read the ICC profile embedded in a photo, re-interpret ("assign") the pixels as
 * another profile, and convert to a chosen output profile on save (with the profile embedded).
 *
 * The editor works in sRGB. Matrix/TRC profiles (sRGB, Display P3, Adobe RGB, ProPhoto, and most
 * camera/monitor profiles) are converted exactly with 3x3 matrices and tone curves.
 */

type M3 = number[]; // row-major 3x3

export interface ProfileDef {
  id: string;
  name: string;
  toXYZ: M3; // linear RGB -> XYZ (D50, ICC PCS)
  trc: (v: number) => number; // encoded -> linear
  inv: (v: number) => number; // linear -> encoded
  gamma?: number; // simple power curve (for writing ICC); undefined = sRGB curve
}

const srgbToLin = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const linToSrgb = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
const pow = (g: number) => ({ trc: (v: number) => Math.pow(Math.max(0, v), g), inv: (v: number) => Math.pow(Math.max(0, v), 1 / g), gamma: g });

/** Standard working spaces (D50-adapted colorants, as stored in ICC profiles). */
export const PROFILES: ProfileDef[] = [
  { id: 'srgb', name: 'sRGB IEC61966-2.1', toXYZ: [0.4360747, 0.3850649, 0.1430804, 0.2225045, 0.7168786, 0.0606169, 0.0139322, 0.0971045, 0.7141733], trc: srgbToLin, inv: linToSrgb },
  { id: 'p3', name: 'Display P3', toXYZ: [0.5151, 0.292, 0.1571, 0.2412, 0.6922, 0.0666, -0.0011, 0.0419, 0.7841], trc: srgbToLin, inv: linToSrgb },
  { id: 'adobe', name: 'Adobe RGB (1998)', toXYZ: [0.6097559, 0.2052401, 0.149224, 0.3111242, 0.625656, 0.0632197, 0.0194811, 0.0608902, 0.7448387], ...pow(563 / 256) },
  { id: 'prophoto', name: 'ProPhoto RGB', toXYZ: [0.7976749, 0.1351917, 0.0313534, 0.2880402, 0.7118741, 0.0000857, 0, 0, 0.82521], ...pow(1.8) },
];
export const SRGB = PROFILES[0];

function inv3(m: M3): M3 {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}
const mul3 = (a: M3, b: M3): M3 => [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]));

// ---------------------------------------------------------------- reading

/** Pulls the raw ICC profile bytes out of a JPEG, PNG or WebP file, if it has one. */
export async function extractICC(file: Blob): Promise<Uint8Array | null> {
  const b = new Uint8Array(await file.slice(0, Math.min(file.size, 8 * 1024 * 1024)).arrayBuffer());
  // JPEG: APP2 "ICC_PROFILE\0" segments, possibly split across several.
  if (b[0] === 0xff && b[1] === 0xd8) {
    const parts: { n: number; data: Uint8Array }[] = [];
    let i = 2;
    while (i + 4 < b.length && b[i] === 0xff) {
      const marker = b[i + 1], len = (b[i + 2] << 8) | b[i + 3];
      if (marker === 0xda) break;
      if (marker === 0xe2 && String.fromCharCode(...b.subarray(i + 4, i + 15)) === 'ICC_PROFILE') {
        parts.push({ n: b[i + 16], data: b.subarray(i + 18, i + 2 + len) });
      }
      i += 2 + len;
    }
    if (!parts.length) return null;
    parts.sort((x, y) => x.n - y.n);
    const out = new Uint8Array(parts.reduce((s, p) => s + p.data.length, 0));
    let o = 0;
    for (const p of parts) { out.set(p.data, o); o += p.data.length; }
    return out;
  }
  // PNG: iCCP chunk (zlib-compressed).
  if (b[0] === 0x89 && b[1] === 0x50) {
    let i = 8;
    while (i + 8 < b.length) {
      const len = (b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3];
      const type = String.fromCharCode(...b.subarray(i + 4, i + 8));
      if (type === 'iCCP') {
        const data = b.subarray(i + 8, i + 8 + len);
        const nul = data.indexOf(0);
        return inflate(data.subarray(nul + 2));
      }
      if (type === 'IDAT') break;
      i += 12 + len;
    }
    return null;
  }
  // WebP: RIFF "ICCP" chunk.
  if (String.fromCharCode(...b.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...b.subarray(8, 12)) === 'WEBP') {
    let i = 12;
    while (i + 8 < b.length) {
      const type = String.fromCharCode(...b.subarray(i, i + 4));
      const len = b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16) | (b[i + 7] << 24);
      if (type === 'ICCP') return b.slice(i + 8, i + 8 + len);
      i += 8 + len + (len & 1);
    }
  }
  return null;
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const s = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
async function deflate(data: Uint8Array): Promise<Uint8Array> {
  const s = new Blob([data]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

export interface ParsedProfile {
  name: string;
  colorSpace: string; // 'RGB ', 'GRAY', 'CMYK'…
  def: ProfileDef | null; // usable for conversion (matrix/TRC RGB profiles)
}

/** Reads an ICC profile's name and, for matrix/TRC RGB profiles, what's needed to convert it. */
export function parseICC(icc: Uint8Array): ParsedProfile {
  const dv = new DataView(icc.buffer, icc.byteOffset, icc.byteLength);
  const sig = (o: number) => String.fromCharCode(icc[o], icc[o + 1], icc[o + 2], icc[o + 3]);
  const colorSpace = sig(16);
  const tags = new Map<string, { off: number; size: number }>();
  const n = dv.getUint32(128);
  for (let k = 0; k < n; k++) {
    const o = 132 + k * 12;
    tags.set(sig(o), { off: dv.getUint32(o + 4), size: dv.getUint32(o + 8) });
  }
  let name = 'Unnamed profile';
  const desc = tags.get('desc');
  if (desc) {
    const type = sig(desc.off);
    if (type === 'desc') {
      const len = dv.getUint32(desc.off + 8);
      name = String.fromCharCode(...icc.subarray(desc.off + 12, desc.off + 12 + len - 1));
    } else if (type === 'mluc') {
      const recLen = dv.getUint32(desc.off + 20), recOff = dv.getUint32(desc.off + 24);
      let s = '';
      for (let i = 0; i < recLen; i += 2) s += String.fromCharCode(dv.getUint16(desc.off + recOff + i));
      name = s;
    }
  }
  name = name.replace(/\0/g, '').trim() || name;

  let def: ProfileDef | null = null;
  const xyz = (t: string) => {
    const e = tags.get(t);
    if (!e) return null;
    return [0, 1, 2].map((k) => dv.getInt32(e.off + 8 + k * 4) / 65536);
  };
  const r = xyz('rXYZ'), g = xyz('gXYZ'), bl = xyz('bXYZ');
  const trcTag = tags.get('rTRC') ?? tags.get('kTRC');
  if (colorSpace === 'RGB ' && r && g && bl && trcTag) {
    const curve = readCurve(icc, dv, trcTag.off);
    if (curve) {
      def = {
        id: 'embedded', name, toXYZ: [r[0], g[0], bl[0], r[1], g[1], bl[1], r[2], g[2], bl[2]],
        trc: curve, inv: invertCurve(curve),
      };
    }
  }
  // Known names map to exact built-in definitions.
  const known = PROFILES.find((p) => name.toLowerCase().includes(p.name.toLowerCase().split(' ')[0]) && (p.id !== 'srgb' || /srgb/i.test(name)));
  if (known && !def) def = known;
  return { name, colorSpace, def };
}

function readCurve(icc: Uint8Array, dv: DataView, off: number): ((v: number) => number) | null {
  const type = String.fromCharCode(icc[off], icc[off + 1], icc[off + 2], icc[off + 3]);
  if (type === 'curv') {
    const n = dv.getUint32(off + 8);
    if (n === 0) return (v) => v;
    if (n === 1) {
      const g = dv.getUint16(off + 12) / 256;
      return (v) => Math.pow(Math.max(0, v), g);
    }
    const tbl = Array.from({ length: n }, (_, i) => dv.getUint16(off + 12 + i * 2) / 65535);
    return (v) => {
      const x = Math.max(0, Math.min(1, v)) * (n - 1), i = Math.floor(x), f = x - i;
      return tbl[i] * (1 - f) + tbl[Math.min(n - 1, i + 1)] * f;
    };
  }
  if (type === 'para') {
    const fn = dv.getUint16(off + 8);
    const p = Array.from({ length: 7 }, (_, i) => (off + 12 + i * 4 < icc.length ? dv.getInt32(off + 12 + i * 4) / 65536 : 0));
    const [g, a, b, c, d, e, f] = p;
    switch (fn) {
      case 0: return (x) => Math.pow(Math.max(0, x), g);
      case 1: return (x) => (x >= -b / a ? Math.pow(a * x + b, g) : 0);
      case 2: return (x) => (x >= -b / a ? Math.pow(a * x + b, g) + c : c);
      case 3: return (x) => (x >= d ? Math.pow(a * x + b, g) : c * x);
      case 4: return (x) => (x >= d ? Math.pow(a * x + b, g) + e : c * x + f);
    }
  }
  return null;
}

/** Numeric inverse of a monotonic 0..1 curve, via a lookup table. */
function invertCurve(f: (v: number) => number): (v: number) => number {
  const N = 4096, ys = Float32Array.from({ length: N + 1 }, (_, i) => f(i / N));
  return (y) => {
    let lo = 0, hi = N;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (ys[mid] < y) lo = mid; else hi = mid; }
    const span = ys[hi] - ys[lo];
    return (lo + (span > 0 ? (y - ys[lo]) / span : 0)) / N;
  };
}

// ---------------------------------------------------------------- converting pixels

/** Converts RGBA pixels in place from one profile to another (8-bit, via lookup tables). */
export function convertPixels(d: Uint8ClampedArray, from: ProfileDef, to: ProfileDef) {
  if (from === to || (from.id === to.id && from.id !== 'embedded')) return;
  const m = mul3(inv3(to.toXYZ), from.toXYZ);
  const lin = Float32Array.from({ length: 256 }, (_, i) => from.trc(i / 255));
  const N = 4096;
  const enc = Uint8ClampedArray.from({ length: N + 1 }, (_, i) => Math.round(to.inv(i / N) * 255));
  for (let i = 0; i < d.length; i += 4) {
    const r = lin[d[i]], g = lin[d[i + 1]], b = lin[d[i + 2]];
    const R = m[0] * r + m[1] * g + m[2] * b, G = m[3] * r + m[4] * g + m[5] * b, B = m[6] * r + m[7] * g + m[8] * b;
    d[i] = enc[Math.max(0, Math.min(N, Math.round(R * N)))];
    d[i + 1] = enc[Math.max(0, Math.min(N, Math.round(G * N)))];
    d[i + 2] = enc[Math.max(0, Math.min(N, Math.round(B * N)))];
  }
}

/** Decodes an image file with no colour management, then converts it from `assumed` to sRGB. */
export async function decodeAssigned(file: Blob, assumed: ProfileDef): Promise<ImageBitmap | HTMLCanvasElement> {
  const bmp = await createImageBitmap(file, { colorSpaceConversion: 'none', imageOrientation: 'from-image' });
  const c = document.createElement('canvas');
  c.width = bmp.width;
  c.height = bmp.height;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  const img = ctx.getImageData(0, 0, c.width, c.height);
  convertPixels(img.data, assumed, SRGB);
  ctx.putImageData(img, 0, 0);
  return c;
}

// ---------------------------------------------------------------- writing

/** Builds a small ICC v2 matrix/TRC profile for one of the standard spaces, to embed on save. */
export function buildICC(p: ProfileDef): Uint8Array {
  const enc = new TextEncoder();
  const desc = (() => {
    const s = enc.encode(p.name + '\0');
    const b = new Uint8Array(12 + s.length + 12 + 67);
    const dv = new DataView(b.buffer);
    b.set(enc.encode('desc'), 0);
    dv.setUint32(8, s.length);
    b.set(s, 12);
    return b;
  })();
  const text = (s: string) => {
    const t = enc.encode(s + '\0');
    const b = new Uint8Array(8 + t.length);
    b.set(enc.encode('text'), 0);
    b.set(t, 8);
    return b;
  };
  const xyzTag = (x: number, y: number, z: number) => {
    const b = new Uint8Array(20);
    const dv = new DataView(b.buffer);
    b.set(enc.encode('XYZ '), 0);
    [x, y, z].forEach((v, i) => dv.setInt32(8 + i * 4, Math.round(v * 65536)));
    return b;
  };
  const curve = (() => {
    if (p.gamma) {
      const b = new Uint8Array(14);
      const dv = new DataView(b.buffer);
      b.set(enc.encode('curv'), 0);
      dv.setUint32(8, 1);
      dv.setUint16(12, Math.round(p.gamma * 256));
      return b;
    }
    const n = 1024;
    const b = new Uint8Array(12 + n * 2);
    const dv = new DataView(b.buffer);
    b.set(enc.encode('curv'), 0);
    dv.setUint32(8, n);
    for (let i = 0; i < n; i++) dv.setUint16(12 + i * 2, Math.round(p.trc(i / (n - 1)) * 65535));
    return b;
  })();
  const m = p.toXYZ;
  const tagData: [string, Uint8Array][] = [
    ['desc', desc], ['cprt', text('No copyright, use freely')], ['wtpt', xyzTag(0.9642, 1.0, 0.8249)],
    ['rXYZ', xyzTag(m[0], m[3], m[6])], ['gXYZ', xyzTag(m[1], m[4], m[7])], ['bXYZ', xyzTag(m[2], m[5], m[8])],
    ['rTRC', curve],
  ];
  const shared: [string, string][] = [['gTRC', 'rTRC'], ['bTRC', 'rTRC']];
  const count = tagData.length + shared.length;
  let off = 128 + 4 + count * 12;
  const placed = new Map<string, { off: number; size: number }>();
  const chunks: Uint8Array[] = [];
  for (const [sig, data] of tagData) {
    placed.set(sig, { off, size: data.length });
    const padded = new Uint8Array(Math.ceil(data.length / 4) * 4);
    padded.set(data);
    chunks.push(padded);
    off += padded.length;
  }
  const total = off;
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, total);
  out.set(enc.encode('none'), 4);
  dv.setUint32(8, 0x02100000);
  out.set(enc.encode('mntr'), 12);
  out.set(enc.encode('RGB '), 16);
  out.set(enc.encode('XYZ '), 20);
  out.set(enc.encode('acsp'), 36);
  dv.setInt32(68, Math.round(0.9642 * 65536));
  dv.setInt32(72, 65536);
  dv.setInt32(76, Math.round(0.8249 * 65536));
  dv.setUint32(128, count);
  let t = 132;
  for (const [sig] of tagData) {
    const e = placed.get(sig)!;
    out.set(enc.encode(sig), t); dv.setUint32(t + 4, e.off); dv.setUint32(t + 8, e.size); t += 12;
  }
  for (const [sig, same] of shared) {
    const e = placed.get(same)!;
    out.set(enc.encode(sig), t); dv.setUint32(t + 4, e.off); dv.setUint32(t + 8, e.size); t += 12;
  }
  let o = 128 + 4 + count * 12;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(b: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Inserts an ICC profile into an encoded JPEG or PNG. */
export async function embedICC(blob: Blob, icc: Uint8Array): Promise<Blob> {
  const b = new Uint8Array(await blob.arrayBuffer());
  if (b[0] === 0xff && b[1] === 0xd8) {
    const maxChunk = 65519;
    const n = Math.ceil(icc.length / maxChunk);
    const segs: Uint8Array[] = [];
    for (let k = 0; k < n; k++) {
      const part = icc.subarray(k * maxChunk, (k + 1) * maxChunk);
      const seg = new Uint8Array(2 + 2 + 14 + part.length);
      seg[0] = 0xff; seg[1] = 0xe2;
      const len = 2 + 14 + part.length;
      seg[2] = len >> 8; seg[3] = len & 255;
      seg.set(new TextEncoder().encode('ICC_PROFILE\0'), 4);
      seg[16] = k + 1; seg[17] = n;
      seg.set(part, 18);
      segs.push(seg);
    }
    return new Blob([b.subarray(0, 2), ...segs, b.subarray(2)], { type: 'image/jpeg' });
  }
  if (b[0] === 0x89 && b[1] === 0x50) {
    const z = await deflate(icc);
    const name = new TextEncoder().encode('ICC profile\0');
    const data = new Uint8Array(name.length + 1 + z.length);
    data.set(name, 0);
    data[name.length] = 0;
    data.set(z, name.length + 1);
    const chunk = new Uint8Array(12 + data.length);
    const dv = new DataView(chunk.buffer);
    dv.setUint32(0, data.length);
    chunk.set(new TextEncoder().encode('iCCP'), 4);
    chunk.set(data, 8);
    dv.setUint32(8 + data.length, crc32(chunk.subarray(4, 8 + data.length)));
    // Right after IHDR (8-byte signature + 25-byte IHDR chunk).
    return new Blob([b.subarray(0, 33), chunk, b.subarray(33)], { type: 'image/png' });
  }
  return blob;
}
