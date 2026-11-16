import { analyze } from '../face/detector';
import { buildMasks, defaultFaceOpts, type FaceOpt } from '../face/masks';
import type { Pt } from '../face/landmarks';
import type { MaskSet } from '../engine/renderer';
import { decodeAssigned, extractICC, parseICC, PROFILES } from './color';
import { fitSize, loadFile, loadRawPreview, RAW_EXT, toCanvas } from './load';
import { decodeRaw, developRaw, RAW_DEFAULTS, type RawData, type RawDecodeOptions, type RawParams } from './raw';

export const PREVIEW_MAX = 2048;
const FULL_MAX = 12000;

/** Where the photo's colours came from and how they're being interpreted. */
export interface ColorInfo {
  embedded: string | null; // name of the ICC profile in the file (null = none)
  assigned: string; // 'auto' = use the embedded profile (or sRGB), else a PROFILES id
}

/** The camera data behind a RAW photo, kept so RAW settings can be changed at any time. */
export interface RawState {
  data: RawData;
  opts: RawDecodeOptions;
  params: RawParams;
}

/** An opened photo: full-res pixels (retouch tools edit these), a preview copy, and what the AI found. */
export interface PhotoDoc {
  name: string;
  base: HTMLCanvasElement;
  preview: HTMLCanvasElement;
  faces: Pt[][];
  hasSeg: boolean;
  masks: MaskSet;
  /** Areas painted with the Protect brush (white = keep original), created on first use. */
  protect?: HTMLCanvasElement;
  /** Which faces get face edits, and female/male per face (makeup only on female). */
  faceOpts: FaceOpt[];
  file?: File;
  color: ColorInfo;
  raw?: RawState;
  /** Set when a RAW file couldn't be decoded and its embedded JPEG preview was used instead. */
  rawFallback?: boolean;
}

/** Landmarks of the faces that edits should apply to. */
export const activeFaces = (d: PhotoDoc) => d.faces.filter((_, i) => d.faceOpts[i]?.on ?? true);

export async function openPhoto(file: File, onStatus?: (s: string) => void): Promise<PhotoDoc> {
  onStatus?.('Opening photo…');
  let src: CanvasImageSource & { width: number; height: number };
  let raw: RawState | undefined;
  let rawFallback = false;
  const color: ColorInfo = { embedded: null, assigned: 'auto' };
  if (RAW_EXT.test(file.name)) {
    try {
      onStatus?.('Decoding RAW sensor data…');
      const opts: RawDecodeOptions = { wb: 'shot', denoise: 0 };
      const data = await decodeRaw(new Uint8Array(await file.arrayBuffer()), opts);
      raw = { data, opts, params: { ...RAW_DEFAULTS } };
      onStatus?.('Developing RAW…');
      src = developRaw(data, raw.params);
      color.embedded = 'Camera RAW (developed to sRGB)';
    } catch (e) {
      console.warn('LibRaw could not decode this file, using its embedded preview', e);
      src = await loadRawPreview(file);
      rawFallback = true;
    }
  } else {
    const icc = await extractICC(file).catch(() => null);
    if (icc) {
      try { color.embedded = parseICC(icc).name; } catch { color.embedded = 'Unreadable profile'; }
    }
    src = await loadFile(file);
  }
  const full = fitSize(src.width, src.height, FULL_MAX);
  const base = toCanvas(src, full.w, full.h);
  if ('close' in src && typeof src.close === 'function') src.close();
  const doc = await buildDoc(file.name, base, onStatus);
  return { ...doc, file, color, raw, rawFallback };
}

/** Runs face + person detection on a (new or cropped/rotated) image. */
export async function buildDoc(name: string, base: HTMLCanvasElement, onStatus?: (s: string) => void): Promise<PhotoDoc> {
  const preview = makePreview(base);
  onStatus?.('Finding faces…');
  const { faces, seg } = await analyze(preview);
  onStatus?.('Cutting out the subject…');
  await new Promise((r) => setTimeout(r, 0)); // let the status paint
  return {
    name, base, preview, faces, hasSeg: !!seg, masks: buildMasks(faces, seg, preview),
    faceOpts: defaultFaceOpts(faces.length), color: { embedded: null, assigned: 'auto' },
  };
}

export function makePreview(base: HTMLCanvasElement) {
  const p = fitSize(base.width, base.height, PREVIEW_MAX);
  return toCanvas(base, p.w, p.h);
}

/** Replaces the full-res pixels in place (same size), e.g. after a RAW or colour-profile change. */
function redraw(doc: PhotoDoc, src: CanvasImageSource) {
  const ctx = doc.base.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, doc.base.width, doc.base.height);
  doc.preview = makePreview(doc.base);
}

/** Re-develops a RAW photo with new settings; re-decodes from the sensor data if decode options changed. */
export async function redevelopRaw(doc: PhotoDoc, params: RawParams, opts?: RawDecodeOptions) {
  if (!doc.raw || !doc.file) return;
  if (opts && (opts.wb !== doc.raw.opts.wb || opts.denoise !== doc.raw.opts.denoise)) {
    doc.raw.data = await decodeRaw(new Uint8Array(await doc.file.arrayBuffer()), opts);
    doc.raw.opts = opts;
  }
  doc.raw.params = params;
  redraw(doc, developRaw(doc.raw.data, params));
}

/** Re-reads the file treating its colours as another profile ("Assign profile"). */
export async function assignProfile(doc: PhotoDoc, id: string) {
  if (!doc.file || doc.raw) return;
  const def = PROFILES.find((p) => p.id === id);
  const src = id === 'auto' || !def ? await loadFile(doc.file) : await decodeAssigned(doc.file, def);
  redraw(doc, src);
  doc.color = { ...doc.color, assigned: id };
}
