// Runs the heavy analysis off the main thread so the editor stays responsive during sync.
import { extractFeatures, findOffset, type Features } from './syncMath';

export type WorkerRequest =
  | { id: number; type: 'features'; key: string; mono: Float32Array; rate: number }
  | { id: number; type: 'match'; a: string; b: string };

export type WorkerResponse = { id: number; ok: true; result: unknown } | { id: number; ok: false; error: string };

const cache = new Map<string, Features>();

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  try {
    if (req.type === 'features') {
      const f = extractFeatures(req.mono, req.rate);
      cache.set(req.key, f);
      reply({ id: req.id, ok: true, result: { duration: f.duration, hasSignal: f.hasSignal } });
    } else {
      const a = cache.get(req.a);
      const b = cache.get(req.b);
      if (!a || !b) throw new Error('Audio not analysed yet');
      reply({ id: req.id, ok: true, result: findOffset(a, b) });
    }
  } catch (err) {
    reply({ id: req.id, ok: false, error: (err as Error).message });
  }
};

function reply(r: WorkerResponse) {
  (self as unknown as Worker).postMessage(r);
}
