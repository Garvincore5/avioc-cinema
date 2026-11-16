// Core edit model. A project is plain JSON so it can be saved, loaded and diffed.

export type MediaKind = 'video' | 'audio' | 'image';

export interface MediaItem {
  id: string;
  name: string;
  kind: MediaKind;
  url: string; // object URL for the imported file
  duration: number; // seconds (images get a default)
  width: number;
  height: number;
}

export type Easing = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'hold';

export interface Keyframe {
  t: number; // seconds, relative to clip start on the timeline
  v: number;
  easing: Easing;
}

/** Properties that can be animated with keyframes. */
export type AnimProp = 'x' | 'y' | 'scale' | 'rotation' | 'opacity';

export interface Transform {
  x: number; // px offset from center, in project resolution
  y: number;
  scale: number; // 1 = fit
  rotation: number; // degrees
  opacity: number; // 0..1
}

export interface ColorGrade {
  exposure: number; // stops, -3..3
  contrast: number; // 0..2, 1 = neutral
  saturation: number; // 0..2, 1 = neutral
  temperature: number; // -1..1
  tint: number; // -1..1
  lift: [number, number, number]; // shadows offset, -0.5..0.5 per channel
  gamma: [number, number, number]; // midtones, -0.5..0.5 per channel
  gain: [number, number, number]; // highlights, -0.5..0.5 per channel
}

export interface Clip {
  id: string;
  mediaId: string | null; // null for text clips
  trackId: string;
  start: number; // position on the timeline (s)
  in: number; // source in point (s)
  duration: number; // length on the timeline (s)
  transform: Transform;
  keyframes: Partial<Record<AnimProp, Keyframe[]>>;
  color: ColorGrade;
  volume: number; // 0..2
  fadeIn: number; // seconds
  fadeOut: number;
  text?: TextStyle;
  flipH?: boolean;
  flipV?: boolean;
  /** Transition INTO this clip from the clip that ends where this one starts, on the same track. */
  transition?: Transition;
  /** Color curves (applied after the primary grade). */
  curves?: Curves;
  /** Constant speed multiplier (1 = normal). Ignored where speedCurve is set. */
  speed?: number;
  /** Speed ramp: points over the clip's length (x 0..1) with a speed value. */
  speedCurve?: CurvePoint[];
  /** Crop, as a fraction of the source on each side. */
  crop?: { l: number; r: number; t: number; b: number };
  /** Frame look, mainly for picture-in-picture. */
  frame?: { border: number; borderColor: string; radius: number; shadow: number };
}

export type CurvePoint = [number, number];

export interface Curves {
  master: CurvePoint[];
  r: CurvePoint[];
  g: CurvePoint[];
  b: CurvePoint[];
  luma: CurvePoint[];
}

export const identityCurve = (): CurvePoint[] => [[0, 0], [1, 1]];
export const neutralCurves = (): Curves => ({ master: identityCurve(), r: identityCurve(), g: identityCurve(), b: identityCurve(), luma: identityCurve() });

export type TextAnim = 'none' | 'fade' | 'slideUp' | 'slideDown' | 'slideLeft' | 'pop' | 'typewriter';

export interface TextStyle {
  content: string;
  size: number;
  color: string;
  font?: string;
  weight?: number; // 100..900
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
  letterSpacing?: number; // px
  lineHeight?: number; // multiple of size
  uppercase?: boolean;
  strokeColor?: string;
  strokeWidth?: number; // px
  shadowColor?: string;
  shadowBlur?: number;
  shadowX?: number;
  shadowY?: number;
  bgColor?: string;
  bgOpacity?: number; // 0..1, 0 = no box
  bgPadding?: number;
  bgRadius?: number;
  animIn?: TextAnim;
  animOut?: TextAnim;
  animDuration?: number; // seconds
}

export type TransitionType = 'dissolve' | 'dip' | 'wipe' | 'slide' | 'zoom';

export interface Transition {
  type: TransitionType;
  duration: number; // seconds, centered on the cut
}

export const TRANSITIONS: { type: TransitionType; label: string }[] = [
  { type: 'dissolve', label: 'Cross dissolve' },
  { type: 'dip', label: 'Dip to black' },
  { type: 'wipe', label: 'Wipe' },
  { type: 'slide', label: 'Slide' },
  { type: 'zoom', label: 'Zoom' },
];

export type TrackKind = 'video' | 'audio';

export interface Track {
  id: string;
  name: string;
  kind: TrackKind;
  muted: boolean;
  hidden: boolean;
}

export interface Project {
  name: string;
  width: number;
  height: number;
  fps: number;
  tracks: Track[]; // video tracks: index 0 is the TOP layer
  clips: Clip[];
  media: MediaItem[];
}

export const neutralGrade = (): ColorGrade => ({
  exposure: 0,
  contrast: 1,
  saturation: 1,
  temperature: 0,
  tint: 0,
  lift: [0, 0, 0],
  gamma: [0, 0, 0],
  gain: [0, 0, 0],
});

export const defaultTransform = (): Transform => ({ x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 });
