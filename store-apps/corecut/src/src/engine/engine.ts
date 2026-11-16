import type { Clip, MediaItem, Project } from '../types';
import type { FrameSource } from './renderer';
import { transformAt } from './keyframes';
import { clipFx, type LayerFx } from './transitions';
import { sourceOffset, speedAt } from './speed';
import { drawText, fontFamily, textAnimAt } from './text';
import type { TextStyle } from '../types';

// Web fonts load lazily; when one finishes, cached text images are redrawn.
let fontsVersion = 0;
if (typeof document !== 'undefined' && document.fonts) {
  document.fonts.addEventListener('loadingdone', () => fontsVersion++);
}
const requested = new Set<string>();
const requestFont = (t: TextStyle) => {
  const spec = `${t.italic ? 'italic ' : ''}${t.weight ?? 700} 40px ${fontFamily(t.font)}`;
  if (requested.has(spec) || !document.fonts) return;
  requested.add(spec);
  void document.fonts.load(spec).then(() => fontsVersion++).catch(() => {});
};

export type Layer = { clip: Clip; src: FrameSource; fx: LayerFx };

interface ClipPlayer {
  el: HTMLVideoElement | HTMLAudioElement;
  gain: GainNode | null;
  mediaId: string;
}

/**
 * Owns the media elements and audio graph. Each clip gets its own element so the same
 * file can appear twice on the timeline at overlapping times.
 */
export class Engine {
  private players = new Map<string, ClipPlayer>();
  private images = new Map<string, HTMLImageElement>();
  private texts = new Map<string, { key: string; canvas: HTMLCanvasElement }>();
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  exportDest: MediaStreamAudioDestinationNode | null = null;

  ensureAudio() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.exportDest = this.ctx.createMediaStreamDestination();
      this.master.connect(this.exportDest);
      // attach any players created before audio was unlocked
      for (const p of this.players.values()) this.wire(p);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private wire(p: ClipPlayer) {
    if (!this.ctx || p.gain) return;
    const node = this.ctx.createMediaElementSource(p.el);
    p.gain = this.ctx.createGain();
    node.connect(p.gain).connect(this.master!);
  }

  private player(clip: Clip, media: MediaItem): ClipPlayer {
    let p = this.players.get(clip.id);
    if (p && p.mediaId === media.id) return p;
    if (p) this.dispose(clip.id);
    const el = media.kind === 'video' ? document.createElement('video') : document.createElement('audio');
    el.src = media.url;
    el.preload = 'auto';
    if (el instanceof HTMLVideoElement) el.playsInline = true;
    p = { el, gain: null, mediaId: media.id };
    this.players.set(clip.id, p);
    this.wire(p);
    return p;
  }

  private dispose(id: string) {
    const p = this.players.get(id);
    if (!p) return;
    p.el.pause();
    p.gain?.disconnect();
    p.el.removeAttribute('src');
    p.el.load();
    this.players.delete(id);
  }

  private image(media: MediaItem) {
    let img = this.images.get(media.id);
    if (!img) {
      img = new Image();
      img.src = media.url;
      this.images.set(media.id, img);
    }
    return img;
  }

  private text(clip: Clip, project: Project, chars: number): FrameSource {
    const t = clip.text!;
    const key = `${JSON.stringify(t)}|${project.width}x${project.height}|${chars}|${fontsVersion}`;
    let entry = this.texts.get(clip.id);
    if (!entry || entry.key !== key) {
      const canvas = entry?.canvas ?? document.createElement('canvas');
      requestFont(t);
      drawText(canvas, t, project.width, project.height, chars);
      entry = { key, canvas };
      this.texts.set(clip.id, entry);
    }
    return { el: entry.canvas, w: entry.canvas.width, h: entry.canvas.height };
  }

  /**
   * Sync every media element to `time` and return the visual layers, bottom to top.
   */
  sync(project: Project, time: number, playing: boolean): { layers: Layer[]; ready: boolean } {
    const layers: Layer[] = [];
    let ready = true;
    const live = new Set<string>();
    const mediaById = new Map(project.media.map((m) => [m.id, m]));
    const trackOrder = [...project.tracks].reverse(); // bottom layer first

    for (const track of trackOrder) {
      // earlier clips first, so during a transition the incoming clip draws over the outgoing one
      const clips = project.clips.filter((c) => c.trackId === track.id).sort((a, b) => a.start - b.start);
      for (const clip of clips) {
        live.add(clip.id);
        const fx = clipFx(project, clip, time);
        const active = fx !== null;
        const media = clip.mediaId ? mediaById.get(clip.mediaId) : undefined;

        if (media && (media.kind === 'video' || media.kind === 'audio')) {
          const p = this.player(clip, media);
          if (!active) {
            if (!p.el.paused) p.el.pause();
            // pre-roll: park upcoming clips at their in point so they start instantly
            const park = Math.max(0, clip.in - 1);
            if (clip.start - time > 0 && clip.start - time < 2 && Math.abs(p.el.currentTime - park) > 0.05 && !p.el.seeking) {
              p.el.currentTime = park;
            }
            continue;
          }
          // clamp: transitions may reach past the media's ends, which then holds the first/last frame
          const local = time - clip.start;
          const want = Math.min(Math.max(0, clip.in + sourceOffset(clip, local)), Math.max(0, media.duration - 0.05));
          const rate = Math.min(16, Math.max(0.0625, speedAt(clip, local)));
          if (Math.abs(p.el.playbackRate - rate) > 0.01) p.el.playbackRate = rate;
          const drift = Math.abs(p.el.currentTime - want);
          if (playing) {
            if (p.el.paused) {
              p.el.currentTime = want;
              void p.el.play().catch(() => {});
            } else if (drift > 0.25 * Math.max(1, rate)) p.el.currentTime = want;
          } else {
            if (!p.el.paused) p.el.pause();
            if (drift > 1 / (project.fps * 2) && !p.el.seeking) p.el.currentTime = want;
          }
          if (p.gain) {
            const fade = transformAt({ ...clip, keyframes: {}, transform: { ...clip.transform, opacity: 1 } }, time).opacity;
            p.gain.gain.value = track.muted ? 0 : clip.volume * fade * fx.gain;
          } else p.el.volume = track.muted ? 0 : Math.min(1, clip.volume * fx.gain);

          if (track.kind === 'video' && !track.hidden && p.el instanceof HTMLVideoElement) {
            if (p.el.readyState >= 2 && !p.el.seeking) layers.push({ clip, fx, src: { el: p.el, w: p.el.videoWidth, h: p.el.videoHeight } });
            else ready = false;
          }
        } else if (fx && track.kind === 'video' && !track.hidden) {
          if (media?.kind === 'image') {
            const img = this.image(media);
            if (img.complete && img.naturalWidth) layers.push({ clip, fx, src: { el: img, w: img.naturalWidth, h: img.naturalHeight } });
            else ready = false;
          } else if (clip.text) {
            const a = textAnimAt(clip, time - clip.start);
            const tfx = { ...fx, alpha: fx.alpha * a.alpha, dx: fx.dx + a.dx, dy: (fx.dy ?? 0) + a.dy, scale: fx.scale * a.scale };
            layers.push({ clip, fx: tfx, src: this.text(clip, project, a.chars) });
          }
        }
      }
    }
    for (const id of [...this.players.keys()]) if (!live.has(id)) this.dispose(id);
    return { layers, ready };
  }

  /**
   * Offline use (export): sync to `time` and wait until every frame is decoded, so the frame is exact.
   * Never plays anything, and these elements are not connected to the speakers.
   */
  async seekFrame(project: Project, time: number): Promise<Layer[]> {
    for (let i = 0; i < 40; i++) {
      const r = this.sync(project, time, false);
      if (r.ready) return r.layers;
      await this.waitForMedia();
    }
    return this.sync(project, time, false).layers; // give up waiting and draw what is available
  }

  private waitForMedia() {
    const waits: Promise<unknown>[] = [];
    for (const p of this.players.values()) {
      if (p.el.seeking || p.el.readyState < 2) {
        waits.push(new Promise((r) => {
          p.el.addEventListener('seeked', r, { once: true });
          p.el.addEventListener('loadeddata', r, { once: true });
        }));
      }
    }
    for (const img of this.images.values()) if (!img.complete) waits.push(new Promise((r) => img.addEventListener('load', r, { once: true })));
    waits.push(new Promise((r) => setTimeout(r, waits.length ? 1500 : 10)));
    return Promise.race(waits);
  }

  destroy() {
    for (const id of [...this.players.keys()]) this.dispose(id);
    this.images.clear();
    this.texts.clear();
  }

  pauseAll() {
    for (const p of this.players.values()) p.el.pause();
  }
}

export const engine = new Engine();

/** Probe an imported file for kind, duration and size. */
export async function probeFile(file: File): Promise<Omit<MediaItem, 'id'>> {
  const url = URL.createObjectURL(file);
  const kind = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image';
  if (kind === 'image') {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { name: file.name, kind, url, duration: 5, width: img.naturalWidth, height: img.naturalHeight };
  }
  const el = document.createElement(kind);
  el.preload = 'metadata';
  el.src = url;
  await new Promise<void>((res, rej) => {
    el.onloadedmetadata = () => res();
    el.onerror = () => rej(new Error(`Can't read ${file.name}`));
  });
  const v = el as HTMLVideoElement;
  return { name: file.name, kind, url, duration: el.duration, width: v.videoWidth ?? 0, height: v.videoHeight ?? 0 };
}
