import { FaceLandmarker, FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';
import type { Pt } from './landmarks';

export interface SegData {
  w: number;
  h: number;
  person: Float32Array;
  skin: Float32Array;
  hair: Float32Array;
}

export interface Analysis {
  faces: Pt[][];
  seg: SegData | null;
}

const base = `${import.meta.env.BASE_URL}mediapipe`;
let models: Promise<{ face: FaceLandmarker | null; seg: ImageSegmenter | null }> | null = null;

export function loadModels() {
  models ??= (async () => {
    const fileset = await FilesetResolver.forVisionTasks(`${base}/wasm`);
    let face: FaceLandmarker | null = null;
    let seg: ImageSegmenter | null = null;
    try {
      face = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: `${base}/models/face_landmarker.task` },
        runningMode: 'IMAGE',
        numFaces: 10,
        minFaceDetectionConfidence: 0.4,
        minFacePresenceConfidence: 0.4,
      });
    } catch (e) {
      console.error('Face model failed to load', e);
    }
    try {
      seg = await ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: `${base}/models/selfie_multiclass_256x256.tflite` },
        runningMode: 'IMAGE',
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      });
    } catch (e) {
      console.error('Segmentation model failed to load', e);
    }
    return { face, seg };
  })();
  return models;
}

type Box = { x0: number; y0: number; x1: number; y1: number };

const boxOf = (lm: Pt[]): Box => ({
  x0: Math.min(...lm.map((p) => p.x)), y0: Math.min(...lm.map((p) => p.y)),
  x1: Math.max(...lm.map((p) => p.x)), y1: Math.max(...lm.map((p) => p.y)),
});

function iou(a: Box, b: Box) {
  const w = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0));
  const h = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  const inter = w * h;
  const area = (r: Box) => (r.x1 - r.x0) * (r.y1 - r.y0);
  return inter / Math.max(1e-9, Math.min(area(a), area(b)));
}

/**
 * The face model is built for selfies, so it misses small faces in group and full-body photos.
 * We scan the whole photo, then overlapping zoomed-in tiles (2x2, 3x3, 4x4), and merge the results.
 */
function detectAllFaces(face: FaceLandmarker, img: HTMLCanvasElement): Pt[][] {
  const W = img.width, H = img.height;
  const found: { lm: Pt[]; box: Box; zoom: number }[] = [];
  const add = (lm: Pt[], zoom: number) => {
    const box = boxOf(lm);
    const dup = found.findIndex((f) => iou(f.box, box) > 0.3);
    if (dup < 0) found.push({ lm, box, zoom });
    else if (zoom > found[dup].zoom) found[dup] = { lm, box, zoom }; // closer look = more accurate landmarks
  };
  for (const lm of face.detect(img).faceLandmarks) add(lm.map(({ x, y }) => ({ x, y })), 1);

  const grids = [2, 3, ...(Math.max(W, H) >= 1400 ? [4] : [])];
  const tile = document.createElement('canvas');
  const tctx = tile.getContext('2d')!;
  for (const n of grids) {
    const tw = (W / n) * 1.4, th = (H / n) * 1.4; // 40% overlap so faces on a seam are whole in some tile
    for (let gy = 0; gy < n; gy++) {
      for (let gx = 0; gx < n; gx++) {
        const x = Math.max(0, Math.min(W - tw, (gx * W) / n - (tw - W / n) / 2));
        const y = Math.max(0, Math.min(H - th, (gy * H) / n - (th - H / n) / 2));
        tile.width = Math.round(tw);
        tile.height = Math.round(th);
        tctx.drawImage(img, x, y, tw, th, 0, 0, tile.width, tile.height);
        for (const lm of face.detect(tile).faceLandmarks) {
          const b = boxOf(lm);
          // Faces cut by the tile edge are only partly visible here; another tile has them whole.
          if (b.x0 < 0.01 || b.y0 < 0.01 || b.x1 > 0.99 || b.y1 > 0.99) continue;
          add(lm.map((p) => ({ x: (x + p.x * tw) / W, y: (y + p.y * th) / H })), n);
        }
      }
    }
  }
  // Left to right, so face numbers match reading order.
  return found.sort((a, b) => a.box.x0 - b.box.x0).map((f) => f.lm);
}

/** Finds face landmarks and person / skin / hair masks. */
export async function analyze(img: HTMLCanvasElement): Promise<Analysis> {
  const { face, seg } = await loadModels();
  const faces = face ? detectAllFaces(face, img) : [];

  let segData: SegData | null = null;
  if (seg) {
    const res = seg.segment(img);
    // selfie_multiclass categories: 0 background, 1 hair, 2 body skin, 3 face skin, 4 clothes, 5 other
    const m = res.confidenceMasks;
    if (m && m.length >= 4) {
      const bg = m[0].getAsFloat32Array();
      const hair = m[1].getAsFloat32Array().slice();
      const body = m[2].getAsFloat32Array();
      const faceSkin = m[3].getAsFloat32Array();
      const person = new Float32Array(bg.length);
      const skin = new Float32Array(bg.length);
      for (let i = 0; i < bg.length; i++) {
        person[i] = 1 - bg[i];
        skin[i] = Math.min(1, body[i] + faceSkin[i]);
      }
      segData = { w: m[0].width, h: m[0].height, person, skin, hair };
    }
    res.close();
  }
  return { faces, seg: segData };
}
