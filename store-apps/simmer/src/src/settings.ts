export type Settings = Record<string, number | string>;

export interface SliderDef {
  key: string;
  label: string;
  min: number;
  max: number;
  def?: number;
}

export interface ColorDef {
  key: string;
  label: string;
  def: string;
}

/** Right-panel tabs. */
export type PanelGroup = 'face' | 'adjust' | 'background' | 'mask';

export interface Section {
  id: string;
  title: string;
  group: PanelGroup;
  sliders: SliderDef[];
  colors?: ColorDef[];
  needsFace?: boolean;
  needsSeg?: boolean;
  /** Light & color sections that can also be applied to only the subject or only the background. */
  scoped?: boolean;
}

/** Which part of the photo the Adjust tab edits. */
export type Scope = 'whole' | 'subject' | 'background';
export const scopedKey = (scope: Scope, key: string) => (scope === 'whole' ? key : `${scope}:${key}`);

const s = (key: string, label: string, min = -100, max = 100): SliderDef => ({ key, label, min, max });
const p = (key: string, label: string) => s(key, label, 0, 100);

/** Applied once to the final image, so they only make sense for the whole photo. */
export const WHOLE_ONLY = new Set(['vignette', 'grain']);

export const SECTIONS: Section[] = [
  {
    id: 'skin', title: 'Skin', group: 'face', needsFace: true,
    sliders: [p('skinSmooth', 'Smooth skin'), { ...p('skinDetail', 'Keep texture'), def: 45 }, p('blemish', 'Remove blemishes'),
      p('shine', 'Remove shine'), p('skinTone', 'Even skin tone'), p('underEye', 'Under-eye bags'),
      s('skinLight', 'Skin brightness'), s('skinWarmth', 'Skin warmth')],
  },
  {
    id: 'sculpt', title: 'Sculpt & light', group: 'face', needsFace: true,
    sliders: [p('faceLight', 'Face light'), p('contour', 'Contour'), p('highlight', 'Highlight'), p('brows', 'Define brows')],
  },
  {
    id: 'features', title: 'Eyes & teeth', group: 'face', needsFace: true,
    sliders: [p('eyeBrighten', 'Brighten eyes'), p('eyeWhites', 'Whiten eye whites'), p('teethWhiten', 'Whiten teeth'),
      p('eyeColorAmt', 'Eye color')],
    colors: [{ key: 'eyeColor', label: 'Eye color', def: '#3f8fd6' }],
  },
  {
    id: 'reshape', title: 'Face & body shape', group: 'face',
    sliders: [s('bodySlim', 'Slim body'), s('faceSlim', 'Slim face'), s('eyeSize', 'Eye size'), s('noseSize', 'Nose size'), s('noseWidth', 'Nose width'),
      s('mouthSize', 'Mouth size'), s('smile', 'Smile'), s('chin', 'Chin length'), s('forehead', 'Forehead')],
  },
  {
    id: 'makeup', title: 'Makeup', group: 'face', needsFace: true,
    sliders: [p('lipstick', 'Lipstick'), p('blush', 'Blush'), p('eyeshadow', 'Eyeshadow')],
    colors: [{ key: 'lipColor', label: 'Lips', def: '#b8263f' }, { key: 'blushColor', label: 'Blush', def: '#f07a8a' },
      { key: 'shadowColor', label: 'Shadow', def: '#7a5a8c' }],
  },
  {
    id: 'hair', title: 'Hair', group: 'face', needsSeg: true,
    sliders: [p('hairColorAmt', 'Hair color')],
    colors: [{ key: 'hairColor', label: 'Hair color', def: '#8a3b1e' }],
  },
  {
    id: 'light', title: 'Light', group: 'adjust', scoped: true,
    sliders: [s('exposure', 'Exposure'), s('contrast', 'Contrast'), s('highlights', 'Highlights'),
      s('shadows', 'Shadows'), s('whites', 'Whites'), s('blacks', 'Blacks')],
  },
  {
    id: 'color', title: 'Color', group: 'adjust', scoped: true,
    sliders: [s('temperature', 'Temperature'), s('tint', 'Tint'), s('vibrance', 'Vibrance'), s('saturation', 'Saturation')],
  },
  {
    id: 'presence', title: 'Presence & detail', group: 'adjust', scoped: true,
    sliders: [s('texture', 'Texture'), s('clarity', 'Clarity'), s('dehaze', 'Dehaze'), p('sharpen', 'Sharpen')],
  },
  {
    id: 'grade', title: 'Color grading', group: 'adjust', scoped: true,
    sliders: [p('shadowTintAmt', 'Shadow tint'), p('highlightTintAmt', 'Highlight tint')],
    colors: [{ key: 'shadowTint', label: 'Shadows', def: '#2f5d9e' }, { key: 'highlightTint', label: 'Highlights', def: '#ffb36b' }],
  },
  {
    id: 'effects', title: 'Effects', group: 'adjust', scoped: true,
    sliders: [p('fade', 'Fade'), p('glow', 'Glow'), s('vignette', 'Vignette'), p('grain', 'Grain')],
  },
  {
    id: 'background', title: 'Background', group: 'background', needsSeg: true,
    sliders: [p('bgRemove', 'Remove background'), p('bgBlur', 'Blur background'), s('bgLight', 'Background light'),
      p('bgDesat', 'Desaturate background'), p('bgReplace', 'Replace with color'), p('bgImage', 'Replace with image')],
    colors: [{ key: 'bgColor', label: 'Background', def: '#e9e4dc' }],
  },
  {
    id: 'selectmask', title: 'Global refinements', group: 'mask', needsSeg: true,
    sliders: [p('maskSmooth', 'Smooth'), p('maskFeather', 'Feather'), p('maskContrast', 'Contrast'), s('edgeShift', 'Shift edge'),
      { ...p('decontam', 'Decontaminate colors'), def: 100 }],
  },
];

/** Light & color keys that exist per scope (whole / subject / background). */
export const DEV_KEYS: string[] = SECTIONS.filter((sec) => sec.scoped)
  .flatMap((sec) => [...sec.sliders.map((sl) => sl.key), ...(sec.colors ?? []).map((c) => c.key)])
  .filter((k) => !WHOLE_ONLY.has(k));

export const DEFAULTS: Settings = (() => {
  const d: Settings = {};
  for (const sec of SECTIONS) {
    for (const sl of sec.sliders) d[sl.key] = sl.def ?? 0;
    for (const c of sec.colors ?? []) d[c.key] = c.def;
  }
  for (const scope of ['subject', 'background'] as const) for (const k of DEV_KEYS) d[scopedKey(scope, k)] = d[k];
  // Opacity of the separated subject / background layers (Layers panel).
  d.layerSubject = 100;
  d.layerBackground = 100;
  return d;
})();

export const num = (st: Settings, key: string) => Number(st[key] ?? 0);

export const MAGIC: Settings = {
  // Tuned side by side on a real deep-skin portrait: clean up texture, keep the person's own tone and depth.
  skinSmooth: 35, skinDetail: 55, blemish: 50, shine: 10, skinTone: 10, underEye: 35, eyeBrighten: 30, eyeWhites: 30,
  teethWhiten: 40, contour: 15, highlight: 20, brows: 15, clarity: 12, vibrance: 10, contrast: 8,
};

const BG_OFF: Settings = { bgRemove: 0, bgBlur: 0, bgLight: 0, bgDesat: 0, bgReplace: 0, bgImage: 0 };

/** One-click background looks, shown in the Background tab. */
export const BG_QUICK: { name: string; values: Settings }[] = [
  { name: '✨ AI auto fix', values: { ...BG_OFF, bgBlur: 45, bgLight: -12, bgDesat: 25 } },
  { name: 'Remove (transparent)', values: { ...BG_OFF, bgRemove: 100 } },
  { name: 'Studio white', values: { ...BG_OFF, bgReplace: 100, bgColor: '#f3f1ed' } },
  { name: 'Studio grey', values: { ...BG_OFF, bgReplace: 100, bgColor: '#7d8187' } },
  { name: 'Bokeh blur', values: { ...BG_OFF, bgBlur: 85, bgLight: -5 } },
  { name: 'Original', values: BG_OFF },
];

export const PRESETS: { name: string; values: Settings }[] = [
  { name: 'Natural retouch', values: { skinSmooth: 30, skinDetail: 55, blemish: 50, shine: 10, skinTone: 10, underEye: 35, eyeBrighten: 25, teethWhiten: 30, clarity: 10, vibrance: 8, contrast: 5 } },
  { name: 'Beauty glam', values: { skinSmooth: 80, skinDetail: 15, blemish: 90, shine: 60, skinTone: 50, underEye: 60, eyeBrighten: 50, teethWhiten: 50, eyeSize: 20, faceSlim: 25, noseSize: -15, lipstick: 55, blush: 35, eyeshadow: 30, contour: 35, highlight: 35, glow: 20, exposure: 8 } },
  { name: 'Studio pop', values: { contrast: 25, clarity: 20, vibrance: 25, highlights: -30, shadows: 25, sharpen: 30, vignette: -20 } },
  { name: 'Warm film', values: { temperature: 25, fade: 35, grain: 35, contrast: 10, saturation: -15, shadowTintAmt: 25, highlightTintAmt: 30, vignette: -25 } },
  { name: 'Cool matte', values: { temperature: -20, tint: 5, fade: 40, contrast: -10, saturation: -20, shadowTintAmt: 40 } },
  { name: 'Black & white', values: { saturation: -100, contrast: 30, clarity: 15, grain: 20, vignette: -25 } },
  { name: 'Dreamy', values: { glow: 55, fade: 20, highlights: -20, exposure: 10, skinSmooth: 40, vibrance: -10, temperature: 10 } },
  { name: 'Portrait bokeh', values: { bgBlur: 70, bgLight: -15, skinSmooth: 35, eyeBrighten: 30, vignette: -15 } },
  { name: 'Pop subject', values: { 'subject:exposure': 12, 'subject:clarity': 20, 'subject:vibrance': 20, 'background:exposure': -20, 'background:saturation': -40, 'background:contrast': -15 } },
];
