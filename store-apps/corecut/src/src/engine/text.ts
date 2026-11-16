import type { Clip, TextAnim, TextStyle } from '../types';

export const FONTS: { name: string; family: string }[] = [
  { name: 'Inter', family: 'Inter, system-ui, sans-serif' },
  { name: 'Montserrat', family: '"Montserrat", sans-serif' },
  { name: 'Poppins', family: '"Poppins", sans-serif' },
  { name: 'Bebas Neue', family: '"Bebas Neue", sans-serif' },
  { name: 'Anton', family: '"Anton", sans-serif' },
  { name: 'Oswald', family: '"Oswald", sans-serif' },
  { name: 'Playfair Display', family: '"Playfair Display", serif' },
  { name: 'Lobster', family: '"Lobster", cursive' },
  { name: 'Pacifico', family: '"Pacifico", cursive' },
  { name: 'Permanent Marker', family: '"Permanent Marker", cursive' },
  { name: 'Roboto Mono', family: '"Roboto Mono", monospace' },
  { name: 'Arial', family: 'Arial, sans-serif' },
  { name: 'Georgia', family: 'Georgia, serif' },
  { name: 'Impact', family: 'Impact, sans-serif' },
  { name: 'Times New Roman', family: '"Times New Roman", serif' },
  { name: 'Courier New', family: '"Courier New", monospace' },
];

export const fontFamily = (name?: string) => FONTS.find((f) => f.name === name)?.family ?? FONTS[0].family;

export const TEXT_ANIMS: { value: TextAnim; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade' },
  { value: 'slideUp', label: 'Slide up' },
  { value: 'slideDown', label: 'Slide down' },
  { value: 'slideLeft', label: 'Slide in' },
  { value: 'pop', label: 'Pop' },
  { value: 'typewriter', label: 'Typewriter' },
];

export const defaultText = (): TextStyle => ({
  content: 'Your title',
  size: 96,
  color: '#ffffff',
  font: 'Inter',
  weight: 700,
  align: 'center',
  lineHeight: 1.2,
  letterSpacing: 0,
  strokeWidth: 0,
  strokeColor: '#000000',
  shadowColor: '#000000',
  shadowBlur: 12,
  shadowX: 0,
  shadowY: 2,
  bgColor: '#000000',
  bgOpacity: 0,
  bgPadding: 24,
  bgRadius: 12,
  animIn: 'fade',
  animOut: 'fade',
  animDuration: 0.4,
});

export const TEXT_STYLES: { name: string; style: Partial<TextStyle> }[] = [
  { name: 'Bold title', style: { font: 'Montserrat', weight: 800, size: 110, color: '#ffffff', strokeWidth: 0, bgOpacity: 0, shadowBlur: 16, uppercase: false } },
  { name: 'Subtitle', style: { font: 'Inter', weight: 600, size: 54, color: '#ffffff', bgColor: '#000000', bgOpacity: 0.6, bgPadding: 16, bgRadius: 8, shadowBlur: 0, strokeWidth: 0 } },
  { name: 'Outline', style: { font: 'Anton', weight: 400, size: 120, color: '#ffffff', strokeWidth: 8, strokeColor: '#000000', bgOpacity: 0, shadowBlur: 0, uppercase: true } },
  { name: 'Neon', style: { font: 'Bebas Neue', weight: 400, size: 130, color: '#fdf6ff', shadowColor: '#ff3df5', shadowBlur: 40, shadowX: 0, shadowY: 0, strokeWidth: 0, bgOpacity: 0, letterSpacing: 6 } },
  { name: 'Lower third', style: { font: 'Poppins', weight: 600, size: 48, color: '#111111', bgColor: '#ffffff', bgOpacity: 0.95, bgPadding: 20, bgRadius: 4, shadowBlur: 0, strokeWidth: 0, align: 'left' } },
  { name: 'Handwritten', style: { font: 'Permanent Marker', weight: 400, size: 96, color: '#ffe14d', shadowBlur: 8, strokeWidth: 0, bgOpacity: 0 } },
  { name: 'Elegant', style: { font: 'Playfair Display', weight: 600, italic: true, size: 90, color: '#f6efe3', shadowBlur: 10, strokeWidth: 0, bgOpacity: 0, letterSpacing: 2 } },
];

const hexA = (hex: string, a: number) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/** Draw a text block centered in a frame-sized canvas. `chars` limits visible characters (typewriter). */
export function drawText(canvas: HTMLCanvasElement, s: TextStyle, W: number, H: number, chars = Infinity) {
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d')!;
  g.clearRect(0, 0, W, H);
  const content = s.uppercase ? s.content.toUpperCase() : s.content;
  let remaining = chars;
  const lines = content.split('\n').map((line) => {
    const shown = line.slice(0, Math.max(0, remaining));
    remaining -= line.length + 1;
    return shown;
  });
  const size = s.size;
  const lh = size * (s.lineHeight ?? 1.2);
  g.font = `${s.italic ? 'italic ' : ''}${s.weight ?? 700} ${size}px ${fontFamily(s.font)}`;
  g.textBaseline = 'middle';
  (g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${s.letterSpacing ?? 0}px`;

  // measure with the full text so the box doesn't jump while typing
  const fullLines = content.split('\n');
  const widths = fullLines.map((l) => g.measureText(l).width);
  const blockW = Math.max(1, ...widths);
  const blockH = lh * fullLines.length;
  const align = s.align ?? 'center';
  const left = W / 2 - blockW / 2;
  const top = H / 2 - blockH / 2;

  if ((s.bgOpacity ?? 0) > 0) {
    const pad = s.bgPadding ?? 20;
    g.fillStyle = hexA(s.bgColor ?? '#000000', s.bgOpacity!);
    g.beginPath();
    g.roundRect(left - pad, top - pad * 0.6, blockW + pad * 2, blockH + pad * 1.2, s.bgRadius ?? 0);
    g.fill();
  }

  lines.forEach((line, i) => {
    const y = top + lh * (i + 0.5);
    const lineW = widths[i];
    const x = align === 'left' ? left : align === 'right' ? left + blockW - lineW : W / 2 - lineW / 2;
    g.textAlign = 'left';
    if ((s.shadowBlur ?? 0) > 0 || s.shadowX || s.shadowY) {
      g.shadowColor = s.shadowColor ?? '#000';
      g.shadowBlur = s.shadowBlur ?? 0;
      g.shadowOffsetX = s.shadowX ?? 0;
      g.shadowOffsetY = s.shadowY ?? 0;
    }
    if ((s.strokeWidth ?? 0) > 0) {
      g.lineJoin = 'round';
      g.lineWidth = s.strokeWidth! * 2; // stroke is centered on the outline; fill covers the inner half
      g.strokeStyle = s.strokeColor ?? '#000';
      g.strokeText(line, x, y);
      g.shadowColor = 'transparent';
    }
    g.fillStyle = s.color;
    g.fillText(line, x, y);
    g.shadowColor = 'transparent';
    if (s.underline && line) {
      const w = g.measureText(line).width;
      g.fillRect(x, y + size * 0.45, w, Math.max(2, size * 0.06));
    }
  });
}

export interface TextAnimState {
  alpha: number;
  dx: number;
  dy: number;
  scale: number;
  chars: number;
}

/** In/out animation values for a text clip at local time. */
export function textAnimAt(c: Clip, local: number): TextAnimState {
  const s = c.text!;
  const d = Math.min(s.animDuration ?? 0.4, c.duration / 2);
  const out: TextAnimState = { alpha: 1, dx: 0, dy: 0, scale: 1, chars: Infinity };
  const apply = (anim: TextAnim | undefined, k: number) => {
    // k: 0 = hidden, 1 = fully in
    const e = 1 - Math.pow(1 - k, 3);
    switch (anim) {
      case 'fade':
        out.alpha *= k;
        break;
      case 'slideUp':
        out.alpha *= k;
        out.dy += (1 - e) * 80;
        break;
      case 'slideDown':
        out.alpha *= k;
        out.dy -= (1 - e) * 80;
        break;
      case 'slideLeft':
        out.alpha *= k;
        out.dx += (1 - e) * 160;
        break;
      case 'pop': {
        out.alpha *= Math.min(1, k * 2);
        // overshoot a little, then settle
        const c1 = 1.70158;
        out.scale *= k <= 0 ? 0.01 : Math.max(0.01, 1 + (c1 + 1) * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2));
        break;
      }
      case 'typewriter':
        out.chars = Math.min(out.chars, Math.floor(k * s.content.length));
        break;
    }
  };
  if (d > 0 && local < d) apply(s.animIn, Math.max(0, local / d));
  if (d > 0 && c.duration - local < d) apply(s.animOut === 'typewriter' ? 'fade' : s.animOut, Math.max(0, (c.duration - local) / d));
  return out;
}
