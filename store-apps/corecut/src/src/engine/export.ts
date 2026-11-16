import { create } from 'zustand';
import { ArrayBufferTarget, FileSystemWritableFileStreamTarget, Muxer } from 'mp4-muxer';
import type { Clip, Project } from '../types';
import { projectDuration } from '../store';
import { Engine } from './engine';
import { Renderer } from './renderer';
import { transformAt } from './keyframes';
import { clipFx, effectiveTransition, nextAdjacent } from './transitions';
import { sourceOffset, speedAt } from './speed';
import { ensurePermission } from '../fs';

/**
 * Background export: renders every frame of the timeline offline (seek → draw → encode with
 * WebCodecs) and mixes the audio with an OfflineAudioContext, then writes an MP4 straight into
 * the folder the editor picked. It doesn't depend on playback, so it's frame-accurate, renders
 * the whole timeline, and you can keep editing while it runs (it exports a snapshot).
 */

export type Quality = 'high' | 'medium' | 'small';
export interface ExportOptions {
  fileName: string;
  dir: FileSystemDirectoryHandle | null; // null: download through the browser instead
  quality: Quality;
}

interface ExportJob {
  running: boolean;
  phase: string;
  progress: number; // 0..1
  fileName: string | null;
  result: { ok: boolean; message: string } | null;
  cancel: (() => void) | null;
}

export const useExportJob = create<ExportJob>(() => ({ running: false, phase: '', progress: 0, fileName: null, result: null, cancel: null }));

export const canExport = () => typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined';

const BITS_PER_PIXEL: Record<Quality, number> = { high: 0.2, medium: 0.1, small: 0.05 };
const SAMPLE_RATE = 48000;

class Cancelled extends Error {}

export async function startExport(snapshot: Project, opts: ExportOptions) {
  if (useExportJob.getState().running) return;
  let cancelled = false;
  const set = (s: Partial<ExportJob>) => useExportJob.setState(s);
  set({ running: true, phase: 'Preparing', progress: 0, fileName: opts.fileName, result: null, cancel: () => (cancelled = true) });
  const check = () => {
    if (cancelled) throw new Cancelled('Export cancelled');
  };

  let writable: FileSystemWritableFileStream | null = null;
  let fileHandle: FileSystemFileHandle | null = null;
  const engine = new Engine();
  try {
    const duration = projectDuration(snapshot);
    if (duration <= 0) throw new Error('The timeline is empty.');
    const { width, height, fps } = snapshot;
    const frames = Math.ceil(duration * fps);

    const video = await pickVideoCodec(width, height, fps, opts.quality);
    const audioCfg = await pickAudioCodec();

    await document.fonts?.ready; // titles must use their real fonts
    set({ phase: 'Mixing audio' });
    const audio = audioCfg ? await mixAudio(snapshot, duration) : null;
    check();

    // output target
    let target: ArrayBufferTarget | FileSystemWritableFileStreamTarget;
    if (opts.dir) {
      if (!(await ensurePermission(opts.dir))) throw new Error('CoreCut was not allowed to write to that folder.');
      fileHandle = await opts.dir.getFileHandle(opts.fileName, { create: true });
      writable = await fileHandle.createWritable();
      target = new FileSystemWritableFileStreamTarget(writable);
    } else target = new ArrayBufferTarget();

    const audioChunks = audio ? Math.ceil(audio.length / 960) + 64 : 0;
    const muxer = new Muxer({
      target,
      video: { codec: video.mux, width, height, frameRate: fps },
      ...(audio && audioCfg ? { audio: { codec: audioCfg.mux, numberOfChannels: 2, sampleRate: SAMPLE_RATE } } : {}),
      // reserve room for the index at the start so the file streams/plays everywhere
      fastStart: { expectedVideoChunks: frames + 8, expectedAudioChunks: audioChunks },
      firstTimestampBehavior: 'offset',
    });

    let encodeError: Error | null = null;
    // audio first (fast), then video
    if (audio && audioCfg) {
      set({ phase: 'Encoding audio' });
      const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => (encodeError = e) });
      aenc.configure(audioCfg.config);
      const block = 4096;
      for (let i = 0; i < audio.length; i += block) {
        const n = Math.min(block, audio.length - i);
        const data = new Float32Array(n * 2);
        data.set(audio.getChannelData(0).subarray(i, i + n), 0);
        data.set(audio.getChannelData(1).subarray(i, i + n), n);
        const ad = new AudioData({ format: 'f32-planar', sampleRate: SAMPLE_RATE, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((i / SAMPLE_RATE) * 1e6), data });
        aenc.encode(ad);
        ad.close();
      }
      await aenc.flush();
      aenc.close();
    }

    set({ phase: 'Rendering video' });
    const canvas = document.createElement('canvas');
    const renderer = new Renderer(canvas);
    const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => (encodeError = e) });
    venc.configure(video.config);
    const frameDur = 1e6 / fps;
    for (let i = 0; i < frames; i++) {
      check();
      if (encodeError) throw encodeError;
      const t = i / fps;
      const layers = await engine.seekFrame(snapshot, t);
      renderer.render(snapshot, t, layers);
      const frame = new VideoFrame(canvas, { timestamp: Math.round(i * frameDur), duration: Math.round(frameDur) });
      venc.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      frame.close();
      while (venc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 5));
      if (i % 3 === 0) set({ progress: i / frames });
    }
    await venc.flush();
    venc.close();
    if (encodeError) throw encodeError;

    set({ phase: 'Finishing', progress: 1 });
    muxer.finalize();
    if (writable) {
      await writable.close();
      writable = null;
    } else {
      const buf = (target as ArrayBufferTarget).buffer;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([buf], { type: 'video/mp4' }));
      a.download = opts.fileName;
      a.click();
    }
    set({ result: { ok: true, message: opts.dir ? `Saved ${opts.fileName} in ${opts.dir.name}` : `Downloaded ${opts.fileName}` } });
  } catch (e) {
    if (writable) {
      await writable.abort().catch(() => {});
      // don't leave a broken half-written file behind
      if (opts.dir && fileHandle) await opts.dir.removeEntry(fileHandle.name).catch(() => {});
    }
    set({ result: { ok: false, message: e instanceof Cancelled ? 'Export cancelled' : `Export failed: ${(e as Error).message}` } });
  } finally {
    engine.destroy();
    set({ running: false, cancel: null });
  }
}

async function pickVideoCodec(width: number, height: number, fps: number, q: Quality) {
  const bitrate = Math.round(width * height * fps * BITS_PER_PIXEL[q]);
  const candidates: { codec: string; mux: 'avc' | 'vp9' }[] = [
    { codec: 'avc1.640034', mux: 'avc' }, // H.264 High, level 5.2 (covers 4K)
    { codec: 'avc1.4d0034', mux: 'avc' }, // H.264 Main
    { codec: 'vp09.00.51.08', mux: 'vp9' }, // fallback where H.264 encoding isn't available
  ];
  for (const c of candidates) {
    const config: VideoEncoderConfig = { codec: c.codec, width, height, bitrate, framerate: fps, ...(c.mux === 'avc' ? { avc: { format: 'avc' } } : {}) };
    try {
      if ((await VideoEncoder.isConfigSupported(config)).supported) return { config, mux: c.mux };
    } catch {
      // try the next one
    }
  }
  throw new Error('This browser cannot encode video. Use a recent Chrome or Edge.');
}

async function pickAudioCodec() {
  const candidates: { codec: string; mux: 'aac' | 'opus' }[] = [
    { codec: 'mp4a.40.2', mux: 'aac' },
    { codec: 'opus', mux: 'opus' },
  ];
  for (const c of candidates) {
    const config: AudioEncoderConfig = { codec: c.codec, sampleRate: SAMPLE_RATE, numberOfChannels: 2, bitrate: 192_000 };
    try {
      if ((await AudioEncoder.isConfigSupported(config)).supported) return { config, mux: c.mux };
    } catch {
      // try the next one
    }
  }
  return null;
}

/** Mix every audible clip (volume, fades and transition crossfades included) into one stereo buffer. */
async function mixAudio(p: Project, duration: number): Promise<AudioBuffer | null> {
  const ctx = new OfflineAudioContext(2, Math.ceil(duration * SAMPLE_RATE), SAMPLE_RATE);
  const decoded = new Map<string, Promise<AudioBuffer | null>>();
  const decode = (mediaId: string, url: string) => {
    if (!decoded.has(mediaId)) {
      decoded.set(
        mediaId,
        fetch(url)
          .then((r) => r.arrayBuffer())
          .then((b) => ctx.decodeAudioData(b))
          .catch(() => null), // e.g. a video without sound
      );
    }
    return decoded.get(mediaId)!;
  };

  let any = false;
  for (const track of p.tracks) {
    if (track.muted) continue;
    for (const clip of p.clips.filter((c) => c.trackId === track.id)) {
      const media = p.media.find((m) => m.id === clip.mediaId);
      if (!media || !media.url || (media.kind !== 'video' && media.kind !== 'audio')) continue;
      const buf = await decode(media.id, media.url);
      if (!buf) continue;
      const { from, to } = audibleRange(p, clip);
      const srcAt = (t: number) => clip.in + sourceOffset(clip, t - clip.start);
      // start where both the timeline (>= 0) and the source (>= 0) exist
      let t0 = Math.max(0, from);
      while (srcAt(t0) < 0 && t0 < to) t0 += 0.005;
      const len = to - t0;
      const srcStart = srcAt(t0);
      const srcLen = Math.min(srcAt(to), buf.duration) - srcStart;
      if (len <= 0.001 || srcLen <= 0.001) continue;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const gain = ctx.createGain();
      src.connect(gain).connect(ctx.destination);
      // gain and speed envelopes sampled at 100 Hz from the same functions the preview uses
      const n = Math.max(2, Math.ceil(len * 100) + 1);
      const curve = new Float32Array(n);
      const rates = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const t = t0 + (i / (n - 1)) * len;
        curve[i] = gainAt(p, clip, t);
        rates[i] = speedAt(clip, t - clip.start);
      }
      gain.gain.setValueCurveAtTime(curve, t0, len);
      if (clip.speedCurve?.length) src.playbackRate.setValueCurveAtTime(rates, t0, len);
      else src.playbackRate.value = clip.speed ?? 1;
      src.start(t0, srcStart, srcLen);
      any = true;
    }
  }
  return any ? ctx.startRendering() : null;
}

function audibleRange(p: Project, clip: Clip) {
  const tin = effectiveTransition(p, clip);
  const next = nextAdjacent(p, clip);
  const tout = next ? effectiveTransition(p, next) : undefined;
  return { from: clip.start - (tin ? tin.duration / 2 : 0), to: clip.start + clip.duration + (tout ? tout.duration / 2 : 0) };
}

function gainAt(p: Project, clip: Clip, t: number) {
  const fx = clipFx(p, clip, t);
  if (!fx) return 0;
  const fade = transformAt({ ...clip, keyframes: {}, transform: { ...clip.transform, opacity: 1 } }, t).opacity;
  return clip.volume * fade * fx.gain;
}
