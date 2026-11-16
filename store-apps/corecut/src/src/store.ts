import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { AnimProp, Clip, ColorGrade, CurvePoint, MediaItem, Project, Track, Transform, Transition } from './types';
import { durationForSpan, sourceOffset, sourceSpan, speedAt } from './engine/speed';
import { defaultText } from './engine/text';
import { defaultTransform, neutralGrade } from './types';
import { sampleKeyframes, upsertKeyframe } from './engine/keyframes';

const HISTORY_LIMIT = 100;

const newProject = (): Project => ({
  name: 'Untitled',
  width: 1920,
  height: 1080,
  fps: 30,
  tracks: [
    { id: 'v2', name: 'V2', kind: 'video', muted: false, hidden: false },
    { id: 'v1', name: 'V1', kind: 'video', muted: false, hidden: false },
    { id: 'a1', name: 'A1', kind: 'audio', muted: false, hidden: false },
  ],
  clips: [],
  media: [],
});

interface EditorState {
  project: Project;
  past: Project[];
  future: Project[];
  time: number;
  playing: boolean;
  /** The clip the inspector shows (the last one clicked). */
  selectedClipId: string | null;
  /** Every selected clip, including selectedClipId. */
  selectedIds: string[];
  pxPerSec: number;
  snapping: boolean;

  // history
  commit: (fn: (p: Project) => Project) => void;
  undo: () => void;
  redo: () => void;

  // transport
  setTime: (t: number) => void;
  setPlaying: (p: boolean) => void;
  setZoom: (pxPerSec: number) => void;
  toggleSnapping: () => void;
  select: (id: string | null, additive?: boolean) => void;
  selectAll: () => void;

  // edits
  addMedia: (m: MediaItem) => void;
  addClipFromMedia: (mediaId: string, trackId?: string, start?: number) => void;
  /** Lay several media items end to end, starting at `start` (default: playhead). One undo step. */
  addClipsFromMedia: (mediaIds: string[], trackId?: string, start?: number) => void;
  addTextClip: () => void;
  updateClip: (id: string, patch: Partial<Clip>, record?: boolean) => void;
  moveClip: (id: string, start: number, trackId: string) => void;
  trimClip: (id: string, edge: 'left' | 'right', delta: number) => void;
  splitAtPlayhead: () => void;
  deleteSelected: (ripple?: boolean) => void;
  addTrack: (kind: Track['kind']) => void;
  toggleTrack: (id: string, key: 'muted' | 'hidden') => void;
  setTransform: (id: string, prop: AnimProp, v: number) => void;
  toggleKeyframe: (id: string, prop: AnimProp) => void;
  setColor: (id: string, grade: Partial<ColorGrade>, record?: boolean) => void;
  /** Apply a grade to every selected clip (one undo step). */
  setColorSelected: (grade: Partial<ColorGrade>, record?: boolean) => void;
  setTransition: (clipId: string, tr: Transition | undefined) => void;
  /** Constant speed for the selected clips; keeps the same footage, so their length changes (later clips move with it). */
  setSpeed: (speed: number) => void;
  /** Speed ramp for one clip (undefined = back to constant speed). */
  setSpeedCurve: (id: string, curve: CurvePoint[] | undefined, record?: boolean) => void;
  /** Put the selected clips on a new top layer as picture-in-picture. */
  makePip: () => void;
  pipCorner: (corner: 'tl' | 'tr' | 'bl' | 'br' | 'center') => void;
  /** Rotate/flip presets for every selected clip. */
  rotateSelected: (op: 'left' | 'right' | '180' | 'reset' | 'flipH' | 'flipV') => void;
  loadProject: (p: Project) => void;
}

export const projectDuration = (p: Project) => p.clips.reduce((m, c) => Math.max(m, c.start + c.duration), 0);

const mapClip = (p: Project, id: string, fn: (c: Clip) => Clip): Project => ({
  ...p,
  clips: p.clips.map((c) => (c.id === id ? fn(c) : c)),
});

const makeClip = (trackId: string, start: number, duration: number, mediaId: string | null): Clip => ({
  id: nanoid(8),
  mediaId,
  trackId,
  start,
  in: 0,
  duration,
  transform: defaultTransform(),
  keyframes: {},
  color: neutralGrade(),
  volume: 1,
  fadeIn: 0,
  fadeOut: 0,
});

/**
 * Put a clip on a track without overlapping anything: the requested track if it is free,
 * otherwise the nearest free track of the same kind, otherwise a brand-new track.
 */
function placeClip(p: Project, clip: Clip, kind: Track['kind'], trackId?: string, preferTop = false): Project {
  const free = (t: Track) =>
    !p.clips.some((c) => c.trackId === t.id && c.start < clip.start + clip.duration && clip.start < c.start + c.duration);
  const sameKind = p.tracks.filter((t) => t.kind === kind);
  const requested = sameKind.find((t) => t.id === trackId);
  const order = preferTop ? sameKind : [...sameKind].reverse();
  let track = requested && free(requested) ? requested : order.find(free);
  let tracks = p.tracks;
  if (!track) {
    track = { id: nanoid(6), name: `${kind === 'video' ? 'V' : 'A'}${sameKind.length + 1}`, kind, muted: false, hidden: false };
    tracks = kind === 'video' ? [track, ...tracks] : [...tracks, track];
  }
  return { ...p, tracks, clips: [...p.clips, { ...clip, trackId: track.id }] };
}

export const useEditor = create<EditorState>((set, get) => ({
  project: newProject(),
  past: [],
  future: [],
  time: 0,
  playing: false,
  selectedClipId: null,
  selectedIds: [],
  pxPerSec: 60,
  snapping: true,

  commit: (fn) =>
    set((s) => ({
      past: [...s.past, s.project].slice(-HISTORY_LIMIT),
      future: [],
      project: fn(s.project),
    })),
  undo: () =>
    set((s) => {
      if (!s.past.length) return s;
      return { project: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.project, ...s.future] };
    }),
  redo: () =>
    set((s) => {
      if (!s.future.length) return s;
      return { project: s.future[0], future: s.future.slice(1), past: [...s.past, s.project] };
    }),

  setTime: (t) => set({ time: Math.max(0, t) }),
  setPlaying: (playing) => set({ playing }),
  setZoom: (pxPerSec) => set({ pxPerSec: Math.min(400, Math.max(5, pxPerSec)) }),
  toggleSnapping: () => set((s) => ({ snapping: !s.snapping })),
  select: (id, additive = false) =>
    set((s) => {
      if (!id) return { selectedClipId: null, selectedIds: [] };
      if (!additive) return { selectedClipId: id, selectedIds: [id] };
      const has = s.selectedIds.includes(id);
      const selectedIds = has ? s.selectedIds.filter((x) => x !== id) : [...s.selectedIds, id];
      return { selectedIds, selectedClipId: has ? (selectedIds[selectedIds.length - 1] ?? null) : id };
    }),
  selectAll: () =>
    set((s) => {
      const ids = s.project.clips.map((c) => c.id);
      return { selectedIds: ids, selectedClipId: s.selectedClipId ?? ids[ids.length - 1] ?? null };
    }),

  // Media lives outside undo history: undoing shouldn't un-import files.
  addMedia: (m) => set((s) => ({ project: { ...s.project, media: [...s.project.media, m] } })),

  addClipFromMedia: (mediaId, trackId, start) => {
    const { project, time } = get();
    const media = project.media.find((m) => m.id === mediaId);
    if (!media) return;
    const kind = media.kind === 'audio' ? 'audio' : 'video';
    const clip = makeClip('', start ?? time, media.duration, mediaId);
    get().commit((p) => placeClip(p, clip, kind, trackId));
    set({ selectedClipId: clip.id, selectedIds: [clip.id] });
  },

  addClipsFromMedia: (mediaIds, trackId, start) => {
    const { project, time } = get();
    let at = start ?? time;
    const added: string[] = [];
    get().commit((p) => {
      let next = p;
      for (const id of mediaIds) {
        const media = project.media.find((m) => m.id === id);
        if (!media) continue;
        const kind = media.kind === 'audio' ? 'audio' : 'video';
        const clip = makeClip('', at, media.duration, id);
        // keep the dropped-on track only if it suits this kind of media
        const want = next.tracks.find((t) => t.id === trackId)?.kind === kind ? trackId : undefined;
        next = placeClip(next, clip, kind, want);
        added.push(clip.id);
        at += media.duration;
      }
      return next;
    });
    set({ selectedIds: added, selectedClipId: added[added.length - 1] ?? null });
  },

  addTextClip: () => {
    const { project, time } = get();
    const clip = makeClip('', time, 3, null);
    clip.text = defaultText();
    // titles go on the top-most free video track
    get().commit((p) => placeClip(p, clip, 'video', project.tracks.find((t) => t.kind === 'video')?.id, true));
    set({ selectedClipId: clip.id, selectedIds: [clip.id] });
  },

  updateClip: (id, patch, record = true) => {
    const fn = (p: Project) => mapClip(p, id, (c) => ({ ...c, ...patch }));
    if (record) get().commit(fn);
    else set((s) => ({ project: fn(s.project) }));
  },

  moveClip: (id, start, trackId) =>
    set((s) => ({ project: mapClip(s.project, id, (c) => ({ ...c, start: Math.max(0, start), trackId })) })),

  trimClip: (id, edge, delta) =>
    set((s) => ({
      project: mapClip(s.project, id, (c) => {
        const media = s.project.media.find((m) => m.id === c.mediaId);
        const timed = media && media.kind !== 'image';
        if (edge === 'right') {
          // the longest the clip can be is whatever source is left, at the clip's speed
          const maxLen = timed ? durationForSpan(c, media!.duration - c.in) : Infinity;
          const duration = Math.min(Math.max(0.1, c.duration + delta), maxLen);
          return { ...c, duration };
        }
        // left edge: move start and source-in together (at the clip's starting speed)
        const s0 = speedAt(c, 0);
        let d = Math.max(delta, -c.start);
        if (timed) d = Math.max(d, -c.in / s0);
        d = Math.min(d, c.duration - 0.1);
        return { ...c, start: c.start + d, in: timed ? Math.max(0, c.in + d * s0) : 0, duration: c.duration - d };
      }),
    })),

  splitAtPlayhead: () => {
    const { project, time, selectedIds } = get();
    // with a selection, split only the selected clips; otherwise split everything under the playhead
    const targets = project.clips.filter(
      (c) => time > c.start + 0.01 && time < c.start + c.duration - 0.01 && (!selectedIds.length || selectedIds.includes(c.id)),
    );
    if (!targets.length) return;
    get().commit((p) => {
      const clips: Clip[] = [];
      for (const c of p.clips) {
        if (!targets.some((t) => t.id === c.id)) {
          clips.push(c);
          continue;
        }
        const cut = time - c.start;
        const shiftKfs = (offset: number, keep: (t: number) => boolean) =>
          Object.fromEntries(
            Object.entries(c.keyframes).map(([k, list]) => [
              k,
              (list ?? []).filter((kf) => keep(kf.t)).map((kf) => ({ ...kf, t: kf.t - offset })),
            ]),
          );
        const [leftCurve, rightCurve] = splitCurve(c, cut);
        clips.push({ ...c, duration: cut, fadeOut: 0, keyframes: shiftKfs(0, (t) => t <= cut), speedCurve: leftCurve });
        clips.push({
          ...c,
          id: nanoid(8),
          start: time,
          in: c.in + sourceOffset(c, cut),
          speedCurve: rightCurve,
          duration: c.duration - cut,
          fadeIn: 0,
          transition: undefined,
          keyframes: shiftKfs(cut, (t) => t >= cut),
        });
      }
      return { ...p, clips };
    });
  },

  deleteSelected: (ripple = false) => {
    const { selectedIds, project } = get();
    const removed = project.clips.filter((c) => selectedIds.includes(c.id));
    if (!removed.length) return;
    get().commit((p) => ({
      ...p,
      clips: p.clips
        .filter((c) => !selectedIds.includes(c.id))
        .map((c) => {
          if (!ripple) return c;
          // close the gaps: shift left by the length of every removed clip before it on the same track
          const shift = removed
            .filter((r) => r.trackId === c.trackId && r.start + r.duration <= c.start + 0.001)
            .reduce((sum, r) => sum + r.duration, 0);
          return shift ? { ...c, start: c.start - shift } : c;
        }),
    }));
    set({ selectedClipId: null, selectedIds: [] });
  },

  addTrack: (kind) =>
    get().commit((p) => {
      const n = p.tracks.filter((t) => t.kind === kind).length + 1;
      const track: Track = { id: nanoid(6), name: `${kind === 'video' ? 'V' : 'A'}${n}`, kind, muted: false, hidden: false };
      // new video tracks go on top, new audio tracks at the bottom
      return { ...p, tracks: kind === 'video' ? [track, ...p.tracks] : [...p.tracks, track] };
    }),

  toggleTrack: (id, key) =>
    get().commit((p) => ({ ...p, tracks: p.tracks.map((t) => (t.id === id ? { ...t, [key]: !t[key] } : t)) })),

  // If the property is keyframed, editing it writes a keyframe at the playhead; otherwise it sets the static value.
  setTransform: (id, prop, v) => {
    const { time } = get();
    get().commit((p) =>
      mapClip(p, id, (c) => {
        const kfs = c.keyframes[prop];
        if (kfs && kfs.length) {
          return { ...c, keyframes: { ...c.keyframes, [prop]: upsertKeyframe(kfs, time - c.start, v) } };
        }
        return { ...c, transform: { ...c.transform, [prop]: v } as Transform };
      }),
    );
  },

  toggleKeyframe: (id, prop) => {
    const { time, project } = get();
    const clip = project.clips.find((c) => c.id === id);
    if (!clip) return;
    const local = time - clip.start;
    const kfs = clip.keyframes[prop] ?? [];
    const existing = kfs.find((k) => Math.abs(k.t - local) < 1 / 60);
    get().commit((p) =>
      mapClip(p, id, (c) => {
        let next;
        if (existing) next = kfs.filter((k) => k !== existing);
        else {
          const current = kfs.length ? sampleNow(c, prop, local) : c.transform[prop];
          next = upsertKeyframe(kfs, local, current);
        }
        return { ...c, keyframes: { ...c.keyframes, [prop]: next } };
      }),
    );
  },

  setColor: (id, grade, record = true) => {
    const fn = (p: Project) => mapClip(p, id, (c) => ({ ...c, color: { ...c.color, ...grade } }));
    if (record) get().commit(fn);
    else set((s) => ({ project: fn(s.project) }));
  },

  setColorSelected: (grade, record = true) => {
    const ids = get().selectedIds;
    const fn = (p: Project) => ({ ...p, clips: p.clips.map((c) => (ids.includes(c.id) ? { ...c, color: { ...c.color, ...grade } } : c)) });
    if (record) get().commit(fn);
    else set((s) => ({ project: fn(s.project) }));
  },

  setTransition: (clipId, tr) => get().commit((p) => mapClip(p, clipId, (c) => ({ ...c, transition: tr }))),

  rotateSelected: (op) => {
    const { selectedIds, time } = get();
    get().commit((p) => ({
      ...p,
      clips: p.clips.map((c) => {
        if (!selectedIds.includes(c.id)) return c;
        if (op === 'flipH') return { ...c, flipH: !c.flipH };
        if (op === 'flipV') return { ...c, flipV: !c.flipV };
        const local = time - c.start;
        const cur = sampleKeyframes(c.keyframes.rotation, local, c.transform.rotation);
        const rotation = op === 'reset' ? 0 : normDeg(cur + (op === 'left' ? -90 : op === 'right' ? 90 : 180));
        // Sideways footage would overflow the frame, so rescale it to fit when turned 90°.
        const scale = Math.abs(rotation) % 180 === 90 ? fitScaleRotated(p, c) : 1;
        const kfs = c.keyframes.rotation;
        if (kfs?.length) {
          return { ...c, keyframes: { ...c.keyframes, rotation: upsertKeyframe(kfs, local, rotation) }, transform: { ...c.transform, scale } };
        }
        return { ...c, transform: { ...c.transform, rotation, scale } };
      }),
    }));
  },

  setSpeed: (speed) => {
    const ids = get().selectedIds;
    get().commit((p) => {
      let clips = p.clips;
      for (const id of ids) {
        const c = clips.find((x) => x.id === id);
        if (!c) continue;
        const next = { ...c, speed, speedCurve: undefined };
        next.duration = Math.max(0.1, sourceSpan(c) / speed);
        clips = ripple(clips, c, next);
      }
      return { ...p, clips };
    });
  },

  setSpeedCurve: (id, curve, record = true) => {
    const fn = (p: Project) => {
      const c = p.clips.find((x) => x.id === id);
      if (!c) return p;
      const next = { ...c, speedCurve: curve, speed: curve ? c.speed : (c.speed ?? 1) };
      next.duration = Math.max(0.1, durationForSpan(next, sourceSpan(c)));
      return { ...p, clips: ripple(p.clips, c, next) };
    };
    if (record) get().commit(fn);
    else set((s) => ({ project: fn(s.project) }));
  },

  makePip: () => {
    const ids = get().selectedIds;
    get().commit((p) => {
      const targets = p.clips.filter((c) => ids.includes(c.id) && p.tracks.find((t) => t.id === c.trackId)?.kind === 'video');
      if (!targets.length) return p;
      const track: Track = { id: nanoid(6), name: `PiP ${p.tracks.filter((t) => t.name.startsWith('PiP')).length + 1}`, kind: 'video', muted: false, hidden: false };
      const tracks = [track, ...p.tracks];
      const withTrack = { ...p, tracks };
      return {
        ...withTrack,
        clips: p.clips.map((c) => {
          if (!targets.includes(c)) return c;
          const moved = { ...c, trackId: track.id, transition: undefined, frame: c.frame ?? { border: 6, borderColor: '#ffffff', radius: 28, shadow: 30 } };
          return { ...moved, transform: { ...moved.transform, scale: 0.35, rotation: 0, ...cornerPos(withTrack, moved, 0.35, 'br') } };
        }),
      };
    });
  },

  pipCorner: (corner) => {
    const ids = get().selectedIds;
    get().commit((p) => ({
      ...p,
      clips: p.clips.map((c) => (ids.includes(c.id) ? { ...c, keyframes: { ...c.keyframes, x: undefined, y: undefined }, transform: { ...c.transform, ...cornerPos(p, c, c.transform.scale, corner) } } : c)),
    }));
  },

  loadProject: (project) => set({ project, past: [], future: [], selectedClipId: null, selectedIds: [], time: 0 }),
}));

const sampleNow = (c: Clip, prop: AnimProp, local: number) => sampleKeyframes(c.keyframes[prop], local, c.transform[prop]);

const normDeg = (d: number) => {
  const r = ((d % 360) + 540) % 360 - 180; // -180..180
  return r === -180 ? 180 : r;
};

/** Scale that makes a clip turned 90° fit inside the frame (same "contain" fit the renderer uses). */
function fitScaleRotated(p: Project, c: Clip) {
  const m = p.media.find((x) => x.id === c.mediaId);
  const w = m?.width || p.width;
  const h = m?.height || p.height;
  const fit = Math.min(p.width / w, p.height / h);
  const dw = w * fit;
  const dh = h * fit;
  return Math.min(1, p.width / dh, p.height / dw);
}

/** Replace `old` with `next` and shift later clips on the same track by the change in length. */
function ripple(clips: Clip[], old: Clip, next: Clip): Clip[] {
  const delta = next.duration - old.duration;
  const oldEnd = old.start + old.duration;
  return clips.map((c) => (c.id === old.id ? next : c.trackId === old.trackId && c.start >= oldEnd - 0.001 ? { ...c, start: Math.max(0, c.start + delta) } : c));
}

/** Split a speed ramp at local time `cut` into the two halves' ramps (each re-normalised to 0..1). */
function splitCurve(c: Clip, cut: number): [CurvePoint[] | undefined, CurvePoint[] | undefined] {
  if (!c.speedCurve?.length) return [undefined, undefined];
  const k = cut / c.duration;
  const at: CurvePoint = [k, speedAt(c, cut)];
  const pts = [...c.speedCurve].sort((a, b) => a[0] - b[0]);
  const left = [...pts.filter((q) => q[0] < k), at].map(([x, v]) => [x / k, v] as CurvePoint);
  const right = [at, ...pts.filter((q) => q[0] > k)].map(([x, v]) => [(x - k) / (1 - k), v] as CurvePoint);
  return [left, right];
}

/** Position for a picture-in-picture corner, with a margin, for a clip drawn at `scale`. */
function cornerPos(p: Project, c: Clip, scale: number, corner: 'tl' | 'tr' | 'bl' | 'br' | 'center') {
  const m = p.media.find((x) => x.id === c.mediaId);
  const w = m?.width || p.width;
  const h = m?.height || p.height;
  const crop = c.crop ?? { l: 0, r: 0, t: 0, b: 0 };
  const fit = Math.min(p.width / w, p.height / h);
  const halfW = (w * (1 - crop.l - crop.r) * fit * scale) / 2;
  const halfH = (h * (1 - crop.t - crop.b) * fit * scale) / 2;
  const margin = Math.round(p.height * 0.05);
  if (corner === 'center') return { x: 0, y: 0 };
  const x = p.width / 2 - margin - halfW;
  const y = p.height / 2 - margin - halfH;
  return { x: corner.endsWith('l') ? -x : x, y: corner.startsWith('t') ? -y : y };
}

/** Push current state to history before a live drag, so the whole drag is one undo step. */
export const beginGesture = () => {
  const s = useEditor.getState();
  useEditor.setState({ past: [...s.past, s.project].slice(-HISTORY_LIMIT), future: [] });
};
