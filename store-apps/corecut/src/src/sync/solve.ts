// Works out where every file sits in time, matching each one against files already placed.
import type { MediaItem, Project } from '../types';
import { analyzer } from './analyzer';
import { MIN_CONFIDENCE, type Match } from './syncMath';
import type { SyncPlacement } from './plan';

export interface FileResult {
  media: MediaItem;
  status: 'reference' | 'synced' | 'failed';
  /** Seconds after the reference file's start (negative = started earlier). */
  offset?: number;
  confidence?: number;
  /** Which file it was matched against. */
  via?: string;
  reason?: string;
}

export type Progress = (done: number, total: number, label: string) => void;

/** Clips the sync can work with: ones that come from a video or audio file. */
export function syncableClips(p: Project, ids: string[]) {
  const media = new Map(p.media.map((m) => [m.id, m]));
  return p.clips.filter((c) => {
    const m = c.mediaId ? media.get(c.mediaId) : undefined;
    return ids.includes(c.id) && (m?.kind === 'video' || m?.kind === 'audio');
  });
}

export async function solveSync(p: Project, clipIds: string[], onProgress: Progress) {
  const clips = syncableClips(p, clipIds);
  const files = [...new Set(clips.map((c) => c.mediaId!))].map((id) => p.media.find((m) => m.id === id)!);
  if (files.length < 2) throw new Error('Pick clips from at least two different recordings to sync.');

  const results = new Map<string, FileResult>();
  const usable: MediaItem[] = [];
  const total = files.length * 2;
  let done = 0;
  for (const m of files) {
    onProgress(done, total, `Reading audio: ${m.name}`);
    try {
      const info = await analyzer.analyse(m);
      if (info.hasSignal) usable.push(m);
      else results.set(m.id, { media: m, status: 'failed', reason: 'The audio is silent' });
    } catch (e) {
      results.set(m.id, { media: m, status: 'failed', reason: (e as Error).message });
    }
    onProgress(++done, total, `Reading audio: ${m.name}`);
  }
  if (usable.length < 2) {
    return { placement: null, results: files.map((m) => results.get(m.id)!).filter(Boolean) };
  }

  // Reference: the longest separate audio recording if there is one (it usually rolled the
  // whole time), otherwise the longest file.
  const byLength = [...usable].sort((a, b) => b.duration - a.duration);
  const audio = byLength.filter((m) => m.kind === 'audio');
  const ref = audio.length && audio[0].duration >= byLength[0].duration * 0.5 ? audio[0] : byLength[0];
  const zero = new Map<string, number>([[ref.id, 0]]);
  results.set(ref.id, { media: ref, status: 'reference', offset: 0 });

  // Match unplaced files against placed ones until nothing new can be placed. This lets a
  // camera that never overlaps the reference sync through another camera that does.
  const tried = new Map<string, Match | null>();
  let pending = usable.filter((m) => m !== ref);
  let progressed = true;
  while (pending.length && progressed) {
    progressed = false;
    for (const m of pending) {
      let best: { match: Match; via: MediaItem } | null = null;
      for (const placedId of zero.keys()) {
        const via = usable.find((u) => u.id === placedId)!;
        const key = `${via.id}>${m.id}`;
        if (!tried.has(key)) {
          onProgress(done, total, `Matching ${m.name}`);
          tried.set(key, await analyzer.match(via, m));
        }
        const match = tried.get(key);
        if (match && match.confidence >= MIN_CONFIDENCE && (!best || match.confidence > best.match.confidence)) best = { match, via };
      }
      if (best) {
        zero.set(m.id, zero.get(best.via.id)! + best.match.offset);
        results.set(m.id, {
          media: m,
          status: 'synced',
          offset: zero.get(m.id),
          confidence: best.match.confidence,
          via: best.via === ref ? undefined : best.via.name,
        });
        onProgress(++done, total, `Synced ${m.name}`);
        progressed = true;
      }
    }
    pending = pending.filter((m) => !zero.has(m.id));
  }
  for (const m of pending) {
    results.set(m.id, { media: m, status: 'failed', reason: 'No matching sound found in the other recordings' });
  }
  const placement: SyncPlacement = { zero, referenceMediaId: ref.id };
  return { placement, results: files.map((m) => results.get(m.id)!) };
}
