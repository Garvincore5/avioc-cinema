// Main-thread side of sync: decodes each file's audio once and hands it to the worker.
import { DECODE_RATE, toMono, type Match } from './syncMath';
import type { WorkerRequest, WorkerResponse } from './sync.worker';
import type { MediaItem } from '../types';

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void };
type WorkerJob = WorkerRequest extends infer R ? (R extends WorkerRequest ? Omit<R, 'id'> : never) : never;

class Analyzer {
  private worker: Worker | null = null;
  private seq = 0;
  private pending = new Map<number, Pending>();
  /** media id (+ url, so a relinked file is re-read) -> analysis promise */
  private analysed = new Map<string, Promise<{ duration: number; hasSignal: boolean }>>();

  private call<T>(msg: WorkerJob, transfer: Transferable[] = []): Promise<T> {
    if (!this.worker) {
      this.worker = new Worker(new URL('./sync.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const p = this.pending.get(e.data.id);
        if (!p) return;
        this.pending.delete(e.data.id);
        if (e.data.ok) p.resolve(e.data.result);
        else p.reject(new Error(e.data.error));
      };
    }
    const id = ++this.seq;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.worker!.postMessage({ ...msg, id }, transfer);
    });
  }

  key(m: MediaItem) {
    return `${m.id}|${m.url}`;
  }

  /** Decode a file's audio (at 8 kHz, which keeps memory low even for long takes) and analyse it. */
  analyse(m: MediaItem) {
    const key = this.key(m);
    let job = this.analysed.get(key);
    if (!job) {
      job = (async () => {
        if (!m.url) throw new Error(`${m.name} needs relinking first`);
        const bytes = await (await fetch(m.url)).arrayBuffer();
        const ctx = new OfflineAudioContext(1, 1, DECODE_RATE);
        let buf: AudioBuffer;
        try {
          buf = await ctx.decodeAudioData(bytes);
        } catch {
          throw new Error(`${m.name} has no audio track the browser can read`);
        }
        const channels = Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i));
        const mono = toMono(channels);
        // copy so the transfer doesn't detach the AudioBuffer's own memory
        const owned = mono === channels[0] ? mono.slice() : mono;
        return this.call<{ duration: number; hasSignal: boolean }>(
          { type: 'features', key, mono: owned, rate: buf.sampleRate },
          [owned.buffer],
        );
      })();
      job.catch(() => this.analysed.delete(key));
      this.analysed.set(key, job);
    }
    return job;
  }

  match(a: MediaItem, b: MediaItem) {
    return this.call<Match | null>({ type: 'match', a: this.key(a), b: this.key(b) });
  }
}

export const analyzer = new Analyzer();
