export const RAW_EXT = /\.(cr2|cr3|crw|nef|nrw|arw|srf|sr2|dng|raf|orf|rw2|pef|srw|x3f|3fr|erf|kdc|mrw|raw|rwl|iiq)$/i;
export const ACCEPT = 'image/*,.cr2,.cr3,.crw,.nef,.nrw,.arw,.srf,.sr2,.dng,.raf,.orf,.rw2,.pef,.srw,.x3f,.3fr,.erf,.kdc,.mrw,.raw,.rwl,.iiq';

/** Finds the end of a JPEG that starts at `start` by walking its markers. Returns -1 if malformed. */
function jpegEnd(b: Uint8Array, start: number): number {
  let i = start + 2;
  while (i + 4 < b.length) {
    if (b[i] !== 0xff) return -1;
    const marker = b[i + 1];
    if (marker === 0xd9) return i + 2;
    if (marker === 0xff) { i++; continue; }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    const len = (b[i + 2] << 8) | b[i + 3];
    i += 2 + len;
    if (marker === 0xda) {
      // Entropy-coded data: skip until a real marker (not stuffing or restart).
      while (i + 1 < b.length && !(b[i] === 0xff && b[i + 1] !== 0 && !(b[i + 1] >= 0xd0 && b[i + 1] <= 0xd7))) i++;
    }
  }
  return -1;
}

/**
 * Camera RAW files carry a full-size JPEG preview rendered by the camera.
 * We pull out the largest one, which gives a full-resolution image to edit.
 */
export async function loadRawPreview(file: File): Promise<ImageBitmap> {
  const b = new Uint8Array(await file.arrayBuffer());
  const candidates: { start: number; end: number }[] = [];
  for (let i = 0; i < b.length - 3; i++) {
    if (b[i] === 0xff && b[i + 1] === 0xd8 && b[i + 2] === 0xff) {
      const end = jpegEnd(b, i);
      if (end > 0 && end - i > 20000) {
        candidates.push({ start: i, end });
        i = end - 1;
      }
    }
  }
  candidates.sort((x, y) => y.end - y.start - (x.end - x.start));
  for (const c of candidates) {
    try {
      return await createImageBitmap(new Blob([b.subarray(c.start, c.end)], { type: 'image/jpeg' }));
    } catch {
      // try the next one
    }
  }
  throw new Error('Could not find a usable preview image inside this RAW file');
}

export async function loadFile(file: File): Promise<ImageBitmap> {
  if (RAW_EXT.test(file.name)) return loadRawPreview(file);
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return loadRawPreview(file);
  }
}

export function toCanvas(src: CanvasImageSource, w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, w, h);
  return c;
}

export function fitSize(w: number, h: number, max: number) {
  const s = Math.min(1, max / Math.max(w, h));
  return { w: Math.round(w * s), h: Math.round(h * s) };
}
