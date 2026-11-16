import type { Clip, Project, Transition } from '../types';

/** Per-layer effect values for one frame. Neutral = { alpha: 1, bright: 1, wipe: -1, dx: 0, scale: 1, gain: 1 }. */
export interface LayerFx {
  alpha: number;
  bright: number;
  wipe: number; // -1 = off, else show only screen x < wipe (0..1)
  dx: number; // extra x offset in px
  dy?: number; // extra y offset in px
  scale: number; // extra scale multiplier
  gain: number; // audio multiplier
}

const NEUTRAL: LayerFx = { alpha: 1, bright: 1, wipe: -1, dx: 0, scale: 1, gain: 1 };
const ADJ_EPS = 0.02; // clips closer than this count as touching

/** The clip that ends where `clip` starts on the same track, if any. */
export function prevAdjacent(p: Project, clip: Clip): Clip | undefined {
  return p.clips.find((c) => c.id !== clip.id && c.trackId === clip.trackId && Math.abs(c.start + c.duration - clip.start) < ADJ_EPS);
}

/** The clip that starts where `clip` ends on the same track, if any. */
export function nextAdjacent(p: Project, clip: Clip): Clip | undefined {
  return p.clips.find((c) => c.id !== clip.id && c.trackId === clip.trackId && Math.abs(clip.start + clip.duration - c.start) < ADJ_EPS);
}

/** A clip's incoming transition, clamped so it never runs past either clip. Undefined if there is no cut to transition across. */
export function effectiveTransition(p: Project, clip: Clip): Transition | undefined {
  if (!clip.transition) return undefined;
  const prev = prevAdjacent(p, clip);
  if (!prev) return undefined;
  const duration = Math.min(clip.transition.duration, clip.duration, prev.duration);
  return duration > 0.01 ? { ...clip.transition, duration } : undefined;
}

/**
 * Effect for `clip` at timeline time t, or null when the clip is not visible.
 * A transition is centered on the cut, so the outgoing clip runs d/2 past its end
 * and the incoming clip starts d/2 early (using media handles when available).
 */
export function clipFx(p: Project, clip: Clip, t: number): LayerFx | null {
  const end = clip.start + clip.duration;
  const tin = effectiveTransition(p, clip);
  const next = nextAdjacent(p, clip);
  const tout = next ? effectiveTransition(p, next) : undefined;
  const from = clip.start - (tin ? tin.duration / 2 : 0);
  const to = end + (tout ? tout.duration / 2 : 0);
  if (t < from || t >= to) return null;

  if (tin && t < clip.start + tin.duration / 2) {
    const k = (t - from) / tin.duration;
    return incoming(tin.type, k, p.width);
  }
  if (tout && t >= end - tout.duration / 2) {
    const k = (t - (end - tout.duration / 2)) / tout.duration;
    return outgoing(tout.type, k, p.width);
  }
  return NEUTRAL;
}

function incoming(type: Transition['type'], k: number, W: number): LayerFx {
  const fx = { ...NEUTRAL, gain: k };
  switch (type) {
    case 'dissolve':
      fx.alpha = k;
      break;
    case 'dip':
      if (k < 0.5) fx.alpha = 0;
      else fx.bright = 2 * k - 1;
      break;
    case 'wipe':
      fx.wipe = k;
      break;
    case 'slide':
      fx.dx = (1 - easeOut(k)) * W;
      break;
    case 'zoom':
      fx.alpha = k;
      fx.scale = 1.25 - 0.25 * easeOut(k);
      break;
  }
  return fx;
}

function outgoing(type: Transition['type'], k: number, W: number): LayerFx {
  const fx = { ...NEUTRAL, gain: 1 - k };
  switch (type) {
    case 'dip':
      if (k < 0.5) fx.bright = 1 - 2 * k;
      else fx.alpha = 0;
      break;
    case 'slide':
      fx.dx = -easeOut(k) * W;
      break;
    case 'zoom':
      fx.scale = 1 + 0.4 * k;
      break;
  }
  return fx;
}

const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);
