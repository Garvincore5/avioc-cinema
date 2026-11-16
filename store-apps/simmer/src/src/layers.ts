import type { Pt } from './face/landmarks';

/** Canvas 2D composite operations offered as blend modes. */
export const BLENDS: { id: GlobalCompositeOperation; label: string }[] = [
  { id: 'source-over', label: 'Normal' },
  { id: 'multiply', label: 'Multiply' },
  { id: 'screen', label: 'Screen' },
  { id: 'overlay', label: 'Overlay' },
  { id: 'soft-light', label: 'Soft light' },
  { id: 'hard-light', label: 'Hard light' },
  { id: 'darken', label: 'Darken' },
  { id: 'lighten', label: 'Lighten' },
  { id: 'color', label: 'Color' },
  { id: 'hue', label: 'Hue' },
  { id: 'saturation', label: 'Saturation' },
  { id: 'luminosity', label: 'Luminosity' },
];

export type Clip = 'all' | 'subject' | 'background';

interface LayerBase {
  id: number;
  name: string;
  visible: boolean;
  opacity: number; // 0..1
  blend: GlobalCompositeOperation;
  clip: Clip; // limit the layer to the person or the background
  /** Layer mask (Photoshop-style): opaque = layer shows, transparent = hidden. Painted black/white with the Brush. */
  mask?: HTMLCanvasElement;
}

export function newLayerMask(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  return c;
}

export function invertLayerMask(m: HTMLCanvasElement) {
  const c = newLayerMask(m.width, m.height);
  const ctx = c.getContext('2d')!;
  ctx.globalCompositeOperation = 'destination-out';
  ctx.drawImage(m, 0, 0);
  return c;
}

/** Paints a stroke segment on a layer mask: reveal = white, otherwise black (hide). Points are image fractions. */
export function paintLayerMask(m: HTMLCanvasElement, a: Pt, b: Pt, size: number, reveal: boolean) {
  const ctx = m.getContext('2d')!;
  ctx.save();
  ctx.globalCompositeOperation = reveal ? 'source-over' : 'destination-out';
  ctx.strokeStyle = ctx.fillStyle = '#fff';
  ctx.lineCap = 'round';
  ctx.lineWidth = size * m.width;
  ctx.beginPath();
  ctx.moveTo(a.x * m.width, a.y * m.height);
  ctx.lineTo(b.x * m.width + 0.01, b.y * m.height);
  ctx.stroke();
  ctx.restore();
}

/** Positions are fractions of image width/height; sizes are fractions of image width, so layers are resolution-independent. */
export interface Stroke {
  pts: Pt[];
  size: number;
  color: string;
  erase: boolean;
}

export type Layer = LayerBase & (
  | { type: 'paint'; strokes: Stroke[] }
  | { type: 'text'; text: string; x: number; y: number; size: number; color: string; font: string; bold: boolean; italic: boolean; shadow: boolean }
  | { type: 'fill'; mode: 'solid' | 'gradient'; color: string; color2: string; angle: number }
  | { type: 'adjust'; brightness: number; contrast: number; saturation: number; hue: number; blur: number }
  | { type: 'image'; img: HTMLCanvasElement; x: number; y: number; w: number; rotation: number }
);

export type LayerType = Layer['type'];

export const FONTS = ['Segoe UI', 'Georgia', 'Impact', 'Arial Black', 'Courier New', 'Brush Script MT', 'Trebuchet MS', 'Times New Roman'];

let nextLayerId = 1;

export function newLayer(type: LayerType, extra: Partial<Layer> = {}): Layer {
  const base: LayerBase = { id: nextLayerId++, name: '', visible: true, opacity: 1, blend: 'source-over', clip: 'all' };
  let l: Layer;
  switch (type) {
    case 'paint': l = { ...base, name: 'Paint', type, strokes: [] }; break;
    case 'text': l = { ...base, name: 'Text', type, text: 'Your text', x: 0.5, y: 0.15, size: 0.08, color: '#ffffff', font: 'Segoe UI', bold: true, italic: false, shadow: true }; break;
    case 'fill': l = { ...base, name: 'Color fill', type, mode: 'gradient', color: '#ff7a59', color2: '#3f5efb', angle: 45, opacity: 0.35, blend: 'soft-light' }; break;
    case 'adjust': l = { ...base, name: 'Adjustment', type, brightness: 0, contrast: 0, saturation: 0, hue: 0, blur: 0 }; break;
    case 'image': l = { ...base, name: 'Image', type, img: document.createElement('canvas'), x: 0.5, y: 0.5, w: 0.4, rotation: 0 }; break;
  }
  return { ...l, ...extra } as Layer;
}

/** Normalized bounding box of a movable layer (text / image), for click-to-select and dragging. */
export function layerBounds(l: Layer, W: number, H: number, ctx?: CanvasRenderingContext2D): { x: number; y: number; w: number; h: number } | null {
  if (l.type === 'image') {
    const w = l.w, h = (l.w * W * (l.img.height / Math.max(1, l.img.width))) / H;
    return { x: l.x - w / 2, y: l.y - h / 2, w, h };
  }
  if (l.type === 'text') {
    const c = ctx ?? document.createElement('canvas').getContext('2d')!;
    c.font = textFont(l, W);
    const lines = l.text.split('\n');
    const w = Math.max(...lines.map((s) => c.measureText(s).width)) / W;
    const h = (lines.length * l.size * W * 1.2) / H;
    return { x: l.x - w / 2, y: l.y - h / 2, w, h };
  }
  return null;
}

const textFont = (l: Extract<Layer, { type: 'text' }>, W: number) =>
  `${l.italic ? 'italic ' : ''}${l.bold ? '700' : '400'} ${Math.max(1, l.size * W)}px "${l.font}"`;

function drawContent(l: Layer, ctx: CanvasRenderingContext2D, W: number, H: number, below: HTMLCanvasElement) {
  switch (l.type) {
    case 'paint':
      ctx.lineCap = ctx.lineJoin = 'round';
      for (const s of l.strokes) {
        ctx.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
        ctx.strokeStyle = ctx.fillStyle = s.color;
        ctx.lineWidth = s.size * W;
        if (s.pts.length === 1) {
          ctx.beginPath();
          ctx.arc(s.pts[0].x * W, s.pts[0].y * H, (s.size * W) / 2, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        ctx.beginPath();
        s.pts.forEach((p, i) => (i ? ctx.lineTo(p.x * W, p.y * H) : ctx.moveTo(p.x * W, p.y * H)));
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      break;
    case 'text': {
      ctx.font = textFont(l, W);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = l.color;
      if (l.shadow) {
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = l.size * W * 0.15;
        ctx.shadowOffsetY = l.size * W * 0.04;
      }
      const lines = l.text.split('\n');
      const lh = l.size * W * 1.2;
      lines.forEach((s, i) => ctx.fillText(s, l.x * W, l.y * H + (i - (lines.length - 1) / 2) * lh));
      break;
    }
    case 'fill':
      if (l.mode === 'solid') ctx.fillStyle = l.color;
      else {
        const a = (l.angle * Math.PI) / 180, r = Math.hypot(W, H) / 2;
        const g = ctx.createLinearGradient(W / 2 - Math.cos(a) * r, H / 2 - Math.sin(a) * r, W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r);
        g.addColorStop(0, l.color);
        g.addColorStop(1, l.color2);
        ctx.fillStyle = g;
      }
      ctx.fillRect(0, 0, W, H);
      break;
    case 'adjust':
      ctx.filter = `brightness(${100 + l.brightness}%) contrast(${100 + l.contrast}%) saturate(${100 + l.saturation}%) hue-rotate(${l.hue}deg) blur(${(l.blur / 100) * W * 0.01}px)`;
      ctx.drawImage(below, 0, 0);
      ctx.filter = 'none';
      break;
    case 'image': {
      const b = layerBounds(l, W, H)!;
      ctx.translate(l.x * W, l.y * H);
      ctx.rotate((l.rotation * Math.PI) / 180);
      ctx.drawImage(l.img, (-b.w * W) / 2, (-b.h * H) / 2, b.w * W, b.h * H);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      break;
    }
  }
}

/** Person mask (alpha = person) from the segmentation canvas (person in red). */
const personMasks = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
export function personMask(seg: HTMLCanvasElement) {
  let m = personMasks.get(seg);
  if (m) return m;
  m = document.createElement('canvas');
  m.width = seg.width;
  m.height = seg.height;
  const src = seg.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, seg.width, seg.height);
  for (let i = 0; i < src.data.length; i += 4) {
    src.data[i + 3] = src.data[i];
    src.data[i] = src.data[i + 1] = src.data[i + 2] = 255;
  }
  m.getContext('2d')!.putImageData(src, 0, 0);
  personMasks.set(seg, m);
  return m;
}

export function invalidatePersonMask(seg: HTMLCanvasElement) {
  personMasks.delete(seg);
}

/** Red "quick mask" tint over everything that is NOT the subject, for checking and painting the cutout. */
export function drawMaskOverlay(out: HTMLCanvasElement, seg: HTMLCanvasElement) {
  const W = out.width, H = out.height;
  scratch ??= document.createElement('canvas');
  const c = scratch;
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  const ctx = c.getContext('2d')!;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255, 30, 70, 0.5)';
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.drawImage(personMask(seg), 0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  out.getContext('2d')!.drawImage(c, 0, 0);
}

let scratch: HTMLCanvasElement | null = null;

/** Draws the layer stack (bottom first) on top of `out`, which already holds the edited photo. */
export function compositeLayers(out: HTMLCanvasElement, layers: Layer[], seg: HTMLCanvasElement | null) {
  const W = out.width, H = out.height;
  const octx = out.getContext('2d')!;
  for (const l of layers) {
    if (!l.visible || l.opacity <= 0) continue;
    if (l.type === 'image' && !l.img.width) continue;
    scratch ??= document.createElement('canvas');
    const c = scratch;
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; } else c.getContext('2d')!.clearRect(0, 0, W, H);
    const ctx = c.getContext('2d')!;
    ctx.save();
    drawContent(l, ctx, W, H, out);
    ctx.restore();
    if (l.clip !== 'all' && seg) {
      ctx.globalCompositeOperation = l.clip === 'subject' ? 'destination-in' : 'destination-out';
      ctx.filter = `blur(${Math.max(0.5, W / 1500)}px)`;
      ctx.drawImage(personMask(seg), 0, 0, W, H);
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-over';
    }
    if (l.mask) {
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(l.mask, 0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }
    octx.save();
    octx.globalAlpha = l.opacity;
    octx.globalCompositeOperation = l.type === 'adjust' ? 'source-over' : l.blend;
    octx.drawImage(c, 0, 0);
    octx.restore();
  }
}
