// Pure timeline edits for sync: move clips to their synced positions, then optionally
// cut the audio where there's no picture and close the gaps. No DOM, so it can be tested.
import { nanoid } from 'nanoid';
import type { Clip, Keyframe, Project, Track } from '../types';

const EPS = 1e-4;
/** Short fade added at each new cut so the audio doesn't click. */
const CUT_FADE = 0.02;

export interface SyncPlacement {
  /** Where each media file's time 0 lands, in seconds relative to the reference file's time 0. */
  zero: Map<string, number>;
  /** The media everything was matched against. Its clips stay where they are. */
  referenceMediaId: string;
}

export interface ApplyOptions {
  /** Mute the camera's own sound when a separate audio recording was synced. */
  muteCameraAudio: boolean;
}

const end = (c: Clip) => c.start + c.duration;
const overlaps = (a: Clip, b: Clip) => a.start < end(b) - EPS && b.start < end(a) - EPS;

/**
 * Move every clip of a synced file so that all files line up in time.
 * Clips that end up overlapping on a track are moved to a free track of the same kind.
 * Returns the new project and the ids of the clips that were moved.
 */
export function applySync(p: Project, clipIds: string[], placement: SyncPlacement, opts: ApplyOptions) {
  const media = new Map(p.media.map((m) => [m.id, m]));
  const group = p.clips.filter((c) => clipIds.includes(c.id) && c.mediaId && placement.zero.has(c.mediaId));
  const refClips = group.filter((c) => c.mediaId === placement.referenceMediaId);
  if (!refClips.length || group.length < 2) return { project: p, moved: [] as string[] };

  // Anchor: the reference file stays where its earliest clip already is.
  const anchor = Math.min(...refClips.map((c) => c.start - c.in));
  let moved = group.map((c) => ({ ...c, start: anchor + placement.zero.get(c.mediaId!)! + c.in }));
  const minStart = Math.min(...moved.map((c) => c.start));
  if (minStart < 0) moved = moved.map((c) => ({ ...c, start: c.start - minStart }));

  const hasSeparateAudio = group.some((c) => media.get(c.mediaId!)?.kind === 'audio');
  if (opts.muteCameraAudio && hasSeparateAudio) {
    moved = moved.map((c) => (media.get(c.mediaId!)?.kind === 'video' ? { ...c, volume: 0 } : c));
  }

  // Re-place: the rest of the timeline stays, then each moved clip goes on its own track if free.
  const ids = new Set(group.map((c) => c.id));
  let out: Project = { ...p, clips: p.clips.filter((c) => !ids.has(c.id)) };
  for (const c of [...moved].sort((a, b) => a.start - b.start)) out = place(out, c);
  return { project: out, moved: moved.map((c) => c.id) };
}

function place(p: Project, clip: Clip): Project {
  const kind = p.tracks.find((t) => t.id === clip.trackId)?.kind ?? 'video';
  const free = (t: Track) => !p.clips.some((c) => c.trackId === t.id && overlaps(c, clip));
  const sameKind = p.tracks.filter((t) => t.kind === kind);
  const own = sameKind.find((t) => t.id === clip.trackId);
  // video: search upward from the bottom; audio: downward from the top
  const order = kind === 'video' ? [...sameKind].reverse() : sameKind;
  let track = own && free(own) ? own : order.find(free);
  let tracks = p.tracks;
  if (!track) {
    track = { id: nanoid(6), name: `${kind === 'video' ? 'V' : 'A'}${sameKind.length + 1}`, kind, muted: false, hidden: false };
    tracks = kind === 'video' ? [track, ...tracks] : [...tracks, track];
  }
  return { ...p, tracks, clips: [...p.clips, { ...clip, trackId: track.id }] };
}

type Range = [number, number];

/** Time ranges, within the span of `clips`, that no clip on a video track covers. */
export function gapsWithoutVideo(p: Project, clips: Clip[], minGap: number): Range[] {
  if (!clips.length) return [];
  const videoTracks = new Set(p.tracks.filter((t) => t.kind === 'video').map((t) => t.id));
  const covered = clips
    .filter((c) => videoTracks.has(c.trackId))
    .map((c) => [c.start, end(c)] as Range)
    .sort((a, b) => a[0] - b[0]);
  const from = Math.min(...clips.map((c) => c.start));
  const to = Math.max(...clips.map(end));
  if (!covered.length) return [];
  const gaps: Range[] = [];
  let cursor = from;
  for (const [s, e] of covered) {
    if (s - cursor > minGap) gaps.push([cursor, s]);
    cursor = Math.max(cursor, e);
  }
  if (to - cursor > minGap) gaps.push([cursor, to]);
  return gaps;
}

/**
 * Cut the audio where there's no video among `clipIds` and close the gaps (ripple delete).
 * Only those clips are cut; clips after the group are shifted left too so nothing ends up
 * overlapping. Clips elsewhere on the timeline are not touched.
 */
export function cutToVideo(p: Project, clipIds: string[]) {
  const group = p.clips.filter((c) => clipIds.includes(c.id));
  const gaps = gapsWithoutVideo(p, group, 1 / p.fps);
  if (!gaps.length) return { project: p, removed: 0, gaps };
  const groupEnd = Math.max(...group.map(end));
  const removed = gaps.reduce((s, [a, b]) => s + (b - a), 0);
  const removedBefore = (t: number) => gaps.reduce((s, [a, b]) => s + Math.max(0, Math.min(b, t) - a), 0);

  const clips: Clip[] = [];
  for (const c of p.clips) {
    if (clipIds.includes(c.id)) clips.push(...cutClip(c, gaps, removedBefore));
    else if (c.start >= groupEnd - EPS) clips.push({ ...c, start: c.start - removed });
    else clips.push(c);
  }
  return { project: { ...p, clips }, removed, gaps };
}

function cutClip(c: Clip, gaps: Range[], removedBefore: (t: number) => number): Clip[] {
  // pieces of [start, end] that fall outside every gap
  let pieces: Range[] = [[c.start, end(c)]];
  for (const [ga, gb] of gaps) {
    pieces = pieces.flatMap(([a, b]): Range[] => {
      if (gb <= a + EPS || ga >= b - EPS) return [[a, b]];
      const keep: Range[] = [];
      if (ga > a + EPS) keep.push([a, ga]);
      if (gb < b - EPS) keep.push([gb, b]);
      return keep;
    });
  }
  pieces = pieces.filter(([a, b]) => b - a > 0.01);
  return pieces.map(([a, b], i) => {
    const offset = a - c.start;
    const startsAtOriginal = Math.abs(offset) < EPS;
    const endsAtOriginal = Math.abs(b - end(c)) < EPS;
    const keyframes = Object.fromEntries(
      Object.entries(c.keyframes).map(([k, list]) => [
        k,
        (list ?? []).filter((kf: Keyframe) => kf.t >= offset - EPS && kf.t <= b - c.start + EPS).map((kf: Keyframe) => ({ ...kf, t: kf.t - offset })),
      ]),
    );
    return {
      ...c,
      id: i === 0 ? c.id : nanoid(8),
      start: a - removedBefore(a),
      in: c.in + offset,
      duration: b - a,
      keyframes,
      fadeIn: startsAtOriginal ? c.fadeIn : CUT_FADE,
      fadeOut: endsAtOriginal ? c.fadeOut : CUT_FADE,
      transition: startsAtOriginal ? c.transition : undefined,
    };
  });
}
