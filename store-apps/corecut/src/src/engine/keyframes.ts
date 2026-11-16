import type { AnimProp, Clip, Easing, Keyframe, Transform } from '../types';

const ease = (e: Easing, p: number): number => {
  switch (e) {
    case 'linear':
      return p;
    case 'easeIn':
      return p * p * p;
    case 'easeOut':
      return 1 - Math.pow(1 - p, 3);
    case 'easeInOut':
      return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    case 'hold':
      return 0;
  }
};

/** Value of a keyframed property at local time t. Easing is taken from the left keyframe. */
export function sampleKeyframes(kfs: Keyframe[] | undefined, t: number, fallback: number): number {
  if (!kfs || kfs.length === 0) return fallback;
  if (t <= kfs[0].t) return kfs[0].v;
  const last = kfs[kfs.length - 1];
  if (t >= last.t) return last.v;
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (t >= a.t && t <= b.t) {
      const p = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
      return a.v + (b.v - a.v) * ease(a.easing, p);
    }
  }
  return fallback;
}

/** Resolve the full transform of a clip at a timeline time. */
export function transformAt(clip: Clip, timelineTime: number): Transform {
  const local = timelineTime - clip.start;
  const out = { ...clip.transform };
  (Object.keys(out) as AnimProp[]).forEach((p) => {
    out[p] = sampleKeyframes(clip.keyframes[p], local, clip.transform[p]);
  });
  // Clip fades multiply into opacity.
  if (clip.fadeIn > 0 && local < clip.fadeIn) out.opacity *= Math.max(0, local / clip.fadeIn);
  const remaining = clip.duration - local;
  if (clip.fadeOut > 0 && remaining < clip.fadeOut) out.opacity *= Math.min(1, Math.max(0, remaining / clip.fadeOut));
  return out;
}

/** Insert or replace a keyframe at time t (sorted). */
export function upsertKeyframe(kfs: Keyframe[] = [], t: number, v: number, easing: Easing = 'easeInOut'): Keyframe[] {
  const eps = 1 / 120;
  const next = kfs.filter((k) => Math.abs(k.t - t) > eps);
  next.push({ t, v, easing });
  return next.sort((a, b) => a.t - b.t);
}
