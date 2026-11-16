import JSZip from 'jszip';
import { Renderer, type Displacement } from '../engine/renderer';
import { bodyTop, computeWarps, skinRadius } from '../engine/warps';
import { num, type Settings } from '../settings';
import { activeFaces, openPhoto, type PhotoDoc } from './document';
import { fitSize, toCanvas } from './load';
import { saveToSimmer } from './folders';
import { compositeLayers, type Layer } from '../layers';
import { buildICC, convertPixels, embedICC, PROFILES, SRGB } from './color';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export type Format = 'jpeg' | 'png';

export interface ExportExtras {
  liquify?: Displacement | null;
  bgImage?: HTMLCanvasElement | null;
  layers?: Layer[];
  /** Output colour profile id (see PROFILES); default sRGB. */
  profile?: string;
}

/** A transparent background only survives in PNG, so switch format when it's used. */
export const formatFor = (s: Settings, f: Format): Format =>
  num(s, 'bgRemove') > 0 || num(s, 'layerSubject') < 100 || num(s, 'layerBackground') < 100 ? 'png' : f;

/** Renders the photo at full resolution with the current settings. */
export async function renderFull(doc: PhotoDoc, s: Settings, format: Format, extras: ExportExtras = {}): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const r = new Renderer(canvas, true);
  try {
    const { w, h } = fitSize(doc.base.width, doc.base.height, Math.min(r.maxSize, 12000));
    const src = w === doc.base.width ? doc.base : toCanvas(doc.base, w, h);
    r.setSource(src, w, h);
    r.setMasks(doc.masks);
    r.setDisplacement(extras.liquify ?? null);
    r.setBackgroundImage(extras.bgImage ?? null);
    r.setProtect(doc.protect ?? null);
    r.render(s, {
      skinRadius: skinRadius(doc.faces, w, h), warps: computeWarps(activeFaces(doc), s, w, h),
      skinAll: doc.faceOpts.every((o) => o.on), bodyTop: bodyTop(activeFaces(doc)),
    });
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const octx = out.getContext('2d', { willReadFrequently: true })!;
    octx.drawImage(canvas, 0, 0);
    if (extras.layers?.length) compositeLayers(out, extras.layers, doc.masks.seg);
    // Convert from the editor's sRGB to the chosen output profile, and embed that profile.
    const target = PROFILES.find((p) => p.id === (extras.profile ?? 'srgb')) ?? SRGB;
    if (target !== SRGB) {
      const img = octx.getImageData(0, 0, w, h);
      convertPixels(img.data, SRGB, target);
      octx.putImageData(img, 0, 0);
    }
    const blob = await new Promise<Blob>((res, rej) =>
      out.toBlob((b) => (b ? res(b) : rej(new Error('Export failed'))), `image/${formatFor(s, format)}`, 0.95));
    return embedICC(blob, buildICC(target));
  } finally {
    r.dispose();
  }
}

export function outputName(name: string, format: Format) {
  return `${name.replace(/\.[^.]+$/, '')}_simmer.${format === 'jpeg' ? 'jpg' : 'png'}`;
}

export function download(blob: Blob, name: string) {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    void saveAndShareAndroid(blob, name).catch((error) => alert(`Couldn't save export: ${error.message || error}`));
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
  }
  return btoa(binary);
}

async function saveAndShareAndroid(blob: Blob, name: string) {
  const safeName = name.replace(/[\\/:*?"<>|]+/g, '-');
  const { uri } = await Filesystem.writeFile({
    path: `Simmer/${safeName}`,
    directory: Directory.Documents,
    recursive: true,
    data: toBase64(await blob.arrayBuffer()),
  });
  await Share.share({ title: safeName, text: 'Created with Simmer Photo Studio', url: uri, dialogTitle: 'Save or share this export' });
}

/**
 * Applies the same settings to many photos (faces are detected per photo).
 * With a folder, results go into <folder>/simmer; otherwise they're zipped and downloaded.
 */
export async function batchExport(files: File[], s: Settings, format: Format, bgImage: HTMLCanvasElement | null,
  dir: FileSystemDirectoryHandle | null, onProgress: (msg: string) => void) {
  const zip = new JSZip();
  const failed: string[] = [];
  const f = formatFor(s, format);
  for (let i = 0; i < files.length; i++) {
    onProgress(`Batch ${i + 1} of ${files.length}: ${files[i].name}`);
    try {
      const doc = await openPhoto(files[i]);
      const blob = await renderFull(doc, s, f, { bgImage });
      if (dir) await saveToSimmer(dir, outputName(files[i].name, f), blob);
      else zip.file(outputName(files[i].name, f), blob);
    } catch (e) {
      console.error(e);
      failed.push(files[i].name);
    }
  }
  if (!dir) {
    onProgress('Zipping…');
    download(await zip.generateAsync({ type: 'blob' }), 'simmer-batch.zip');
  }
  return failed;
}
