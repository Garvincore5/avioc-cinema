import type { PhotoDoc } from './io/document';
import type { Settings } from './settings';
import { FACE_OVAL, type Pt } from './face/landmarks';

/** A saved look: the edit settings plus a thumbnail of the face it was made on. */
export interface SavedFace {
  id: string;
  name: string;
  thumb: string; // small JPEG data URL
  settings: Settings;
  created: number;
}

const KEY = 'simmer.faces.v1';

/**
 * Built-in beauty looks, from subtle to extra glam. Tuned to flatter every skin tone:
 * they even out and add glow/highlight rather than lightening skin, keep its warmth,
 * and use berry, brick and brown lip colours that suit deeper tones.
 */
export const BEAUTY_LOOKS: { name: string; values: Settings }[] = [
  { name: 'Natural glow', values: { skinSmooth: 35, blemish: 55, shine: 10, skinTone: 15, underEye: 40, eyeWhites: 30, teethWhiten: 30, highlight: 25, glow: 10, vibrance: 10, clarity: 10, contrast: 6 } },
  { name: 'Fresh morning', values: { exposure: 4, shadows: 12, skinSmooth: 40, blemish: 70, eyeWhites: 40, underEye: 45, blush: 15, blushColor: '#c85a4c', vibrance: 6 } },
  { name: 'Soft skin', values: { skinSmooth: 60, skinDetail: 40, blemish: 70, shine: 20, skinTone: 25, underEye: 55, clarity: 8, contrast: 6 } },
  { name: 'Radiant melanin', values: { skinSmooth: 45, blemish: 80, shine: 20, highlight: 30, skinWarmth: 5, vibrance: 10, glow: 10, eyeWhites: 35, contour: 15, clarity: 5 } },
  { name: 'Golden hour', values: { temperature: 12, highlightTintAmt: 20, highlightTint: '#ffb36b', skinWarmth: 8, glow: 18, skinSmooth: 40, highlight: 30, shadows: 8 } },
  { name: 'Cocoa warm', values: { skinWarmth: 25, temperature: 10, skinSmooth: 45, blemish: 75, highlight: 35, lipstick: 40, lipColor: '#6d2c22', vibrance: 15 } },
  { name: 'Flawless matte', values: { skinSmooth: 70, skinDetail: 20, shine: 85, blemish: 95, skinTone: 55, contour: 20, clarity: -10 } },
  { name: 'Nude lips', values: { skinSmooth: 45, blemish: 75, lipstick: 45, lipColor: '#7a3b2e', blush: 15, blushColor: '#b5523b', eyeWhites: 30 } },
  { name: 'Bright eyes', values: { eyeBrighten: 60, eyeWhites: 60, eyeSize: 15, underEye: 70, brows: 30, skinSmooth: 30 } },
  { name: 'Perfect smile', values: { teethWhiten: 70, smile: 25, lipstick: 25, lipColor: '#9c3d3d', skinSmooth: 35, eyeWhites: 30 } },
  { name: 'Sculpted', values: { contour: 45, highlight: 35, faceSlim: 20, noseWidth: -15, chin: 8, skinSmooth: 50, blemish: 80 } },
  { name: 'Soft dreamy', values: { glow: 45, fade: 15, skinSmooth: 60, highlights: -15, skinTone: 40, exposure: 5, blemish: 80 } },
  { name: 'Studio clean', values: { skinSmooth: 50, blemish: 85, shine: 60, highlight: 30, vibrance: 10, bgReplace: 100, bgColor: '#ece8e1' } },
  { name: 'Editorial B&W', values: { saturation: -100, contrast: 25, clarity: 10, skinSmooth: 55, blemish: 85, highlight: 30, contour: 30 } },
  { name: 'Bold glam', values: { skinSmooth: 75, blemish: 90, shine: 60, contour: 45, highlight: 45, lipstick: 60, lipColor: '#8e1b3a', eyeshadow: 35, shadowColor: '#5b3a6b', blush: 25, blushColor: '#c4513f', eyeBrighten: 45, eyeWhites: 45, teethWhiten: 45, eyeSize: 12, faceSlim: 15 } },
  { name: 'Red carpet', values: { skinSmooth: 80, skinDetail: 15, blemish: 95, shine: 70, contour: 50, highlight: 50, lipstick: 70, lipColor: '#a3122a', eyeSize: 15, faceSlim: 20, noseSize: -10, glow: 20, clarity: 10, vignette: -15, eyeWhites: 45 } },
  { name: 'Doll face', values: { skinSmooth: 80, skinDetail: 22, blemish: 100, eyeSize: 25, faceSlim: 30, noseSize: -20, mouthSize: -10, chin: 10, lipstick: 50, lipColor: '#9c2a4b', blush: 30, blushColor: '#c85a62', glow: 25, eyeWhites: 50 } },
  { name: 'Extra beauty max', values: { skinSmooth: 85, skinDetail: 25, blemish: 100, shine: 40, skinTone: 45, underEye: 70, eyeBrighten: 60, eyeWhites: 60, teethWhiten: 60, eyeSize: 22, faceSlim: 30, noseSize: -18, contour: 35, highlight: 35, lipstick: 65, lipColor: '#9b1b4a', blush: 30, blushColor: '#c85a62', eyeshadow: 35, shadowColor: '#6b4a7a', glow: 15, brows: 35 } },
];

/**
 * Version of a look for male faces: no makeup, lighter smoothing with more natural texture,
 * gentler reshaping, a little more definition.
 */
export function maleVariant(v: Settings): Settings {
  const out: Settings = { ...v, lipstick: 0, blush: 0, eyeshadow: 0, eyeColorAmt: 0 };
  const scale = (k: string, f: number) => { if (typeof v[k] === 'number') out[k] = Math.round((v[k] as number) * f); };
  scale('skinSmooth', 0.7);
  scale('eyeSize', 0.3);
  scale('faceSlim', 0.4);
  scale('noseSize', 0.5);
  scale('glow', 0.5);
  out.skinDetail = Math.max(Number(v.skinDetail ?? 30), 50);
  out.brows = Math.max(Number(v.brows ?? 0), 15);
  out.clarity = Math.max(Number(v.clarity ?? 0), 8);
  return out;
}

/** Square crop around one face, for the face picker. */
export function faceCrop(img: HTMLCanvasElement, lm: Pt[], size = 72): string {
  const W = img.width, H = img.height;
  const pts = FACE_OVAL.map((i) => ({ x: lm[i].x * W, y: lm[i].y * H }));
  const minX = Math.min(...pts.map((p) => p.x)), maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y)), maxY = Math.max(...pts.map((p) => p.y));
  const s = Math.max(maxX - minX, maxY - minY) * 1.3;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  c.getContext('2d')!.drawImage(img, (minX + maxX) / 2 - s / 2, (minY + maxY) / 2 - s / 2, s, s, 0, 0, size, size);
  return c.toDataURL('image/jpeg', 0.8);
}

/** Renders each look on a small copy of the photo and returns a face thumbnail for each. */
export async function lookThumbnails(doc: PhotoDoc, looks: { name: string; values: Settings }[], base: Settings): Promise<string[]> {
  const { Renderer } = await import('./engine/renderer');
  const { bodyTop, computeWarps, skinRadius } = await import('./engine/warps');
  const s = Math.min(1, 640 / Math.max(doc.preview.width, doc.preview.height));
  const w = Math.round(doc.preview.width * s), h = Math.round(doc.preview.height * s);
  const src = document.createElement('canvas');
  src.width = w;
  src.height = h;
  src.getContext('2d')!.drawImage(doc.preview, 0, 0, w, h);
  const canvas = document.createElement('canvas');
  const r = new Renderer(canvas, true);
  try {
    r.setSource(src, w, h);
    r.setMasks(doc.masks);
    const act = doc.faceOpts.filter((o) => o.on);
    const male = act.length > 0 && act.every((o) => o.gender === 'male');
    return looks.map((look) => {
      const st = { ...base, ...(male ? maleVariant(look.values) : look.values) };
      const faces = doc.faces.filter((_, i) => doc.faceOpts[i]?.on ?? true);
      r.render(st, {
        skinRadius: skinRadius(doc.faces, w, h), warps: computeWarps(faces, st, w, h),
        skinAll: doc.faceOpts.every((o) => o.on), bodyTop: bodyTop(faces),
      });
      return faceThumb(canvas, doc, 96);
    });
  } finally {
    r.dispose();
  }
}

export function loadFaces(): SavedFace[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function storeFaces(faces: SavedFace[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(faces));
  } catch {
    // storage full or blocked: keep them for this session only
  }
}

/** Square thumbnail around the first face (or the photo centre), taken from the edited view. */
export function faceThumb(view: HTMLCanvasElement, doc: PhotoDoc, size = 112): string {
  const W = view.width, H = view.height;
  let box = { x: W / 2 - Math.min(W, H) / 2, y: H / 2 - Math.min(W, H) / 2, s: Math.min(W, H) };
  const lm: Pt[] | undefined = doc.faces.find((_, i) => doc.faceOpts?.[i]?.on ?? true) ?? doc.faces[0];
  if (lm) {
    const pts = FACE_OVAL.map((i) => ({ x: lm[i].x * W, y: lm[i].y * H }));
    const minX = Math.min(...pts.map((p) => p.x)), maxX = Math.max(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y)), maxY = Math.max(...pts.map((p) => p.y));
    const s = Math.max(maxX - minX, maxY - minY) * 1.35;
    box = { x: (minX + maxX) / 2 - s / 2, y: (minY + maxY) / 2 - s / 2, s };
  }
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(view, box.x, box.y, box.s, box.s, 0, 0, size, size);
  return c.toDataURL('image/jpeg', 0.8);
}
