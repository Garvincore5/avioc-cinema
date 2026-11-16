import { nanoid } from 'nanoid';
import { useEditor } from '../store';
import { probeFile } from '../engine/engine';
import { creditLine, type AudioResult } from './sources';

const MAX_BYTES = 80 * 1024 * 1024;

/**
 * Download a track. Many audio hosts don't send CORS headers, so if the direct fetch is
 * blocked we go through the dev server's /__audio proxy (see audio-proxy.ts).
 */
async function download(url: string): Promise<Blob> {
  try {
    const r = await fetch(url);
    if (r.ok) return await r.blob();
  } catch {
    /* CORS or network: fall through to the proxy */
  }
  const r = await fetch(`/__audio?url=${encodeURIComponent(url)}`);
  if (!r.ok) throw new Error(r.status === 404 ? 'This host blocks direct downloads. Open it in the CoreCut app (or npm run dev) so the built-in proxy can fetch it.' : `Download failed (${r.status})`);
  return r.blob();
}

const extFor = (type: string) => (type.includes('ogg') ? 'ogg' : type.includes('wav') ? 'wav' : type.includes('flac') ? 'flac' : type.includes('mp4') || type.includes('aac') ? 'm4a' : 'mp3');
const safe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 80) || 'audio';

// ---- credits: kept per media item so the user can paste them into a description ----

const CREDITS_KEY = 'cutline.audioCredits';
type Credits = Record<string, string>; // media name -> credit line

export function loadCredits(): Credits {
  try {
    return JSON.parse(localStorage.getItem(CREDITS_KEY) ?? '{}');
  } catch {
    return {};
  }
}
function saveCredit(name: string, line: string) {
  try {
    localStorage.setItem(CREDITS_KEY, JSON.stringify({ ...loadCredits(), [name]: line }));
  } catch {
    /* storage unavailable: credits just aren't remembered */
  }
}

/** Credit lines for every imported track that is in the current project. */
export function projectCredits(): string[] {
  const credits = loadCredits();
  const names = new Set(useEditor.getState().project.media.map((m) => m.name));
  return Object.entries(credits).filter(([n]) => names.has(n)).map(([, l]) => l);
}

/** Download a search result into the media bin; optionally drop it on the timeline at the playhead. */
export async function importResult(r: AudioResult, toTimeline: boolean) {
  const blob = await download(r.downloadUrl);
  if (blob.size > MAX_BYTES) throw new Error('That file is too large to import.');
  const type = blob.type.startsWith('audio/') ? blob.type : 'audio/mpeg';
  const name = `${safe(r.title)} - ${safe(r.creator)}.${extFor(type)}`;
  const file = new File([blob], name, { type });
  const info = await probeFile(file);
  const id = nanoid(8);
  useEditor.getState().addMedia({ id, ...info, kind: 'audio' });
  if (r.needsCredit) saveCredit(name, creditLine(r));
  if (toTimeline) useEditor.getState().addClipFromMedia(id);
  return { id, file };
}

// ---- paste-a-link import ----

/** Sites whose audio is openly licensed. Links elsewhere get the copyright warning. */
const FREE_HOSTS = ['freesound.org', 'archive.org', 'jamendo.com', 'openverse.org', 'wikimedia.org', 'ccmixter.org', 'incompetech.com', 'freemusicarchive.org'];
export const isFreeSourceLink = (url: string) => {
  try {
    const h = new URL(url).hostname;
    return FREE_HOSTS.some((d) => h === d || h.endsWith(`.${d}`));
  } catch {
    return false;
  }
};

const DIRECT_AUDIO = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|webm)(\?.*)?$/i;

export async function ytDlpStatus(): Promise<{ installed: boolean; version: string | null; devServer: boolean }> {
  try {
    const r = await fetch('/__ytdlp/status');
    if (!r.ok) return { installed: false, version: null, devServer: false };
    return { ...(await r.json()), devServer: true };
  } catch {
    return { installed: false, version: null, devServer: false };
  }
}

/**
 * Import audio from a pasted link. Direct audio files are downloaded as they are; any other page
 * (YouTube, TikTok, Freesound, Internet Archive, ...) goes through the user's own yt-dlp, audio only.
 */
export async function importFromLink(url: string, toTimeline: boolean) {
  let blob: Blob;
  let name: string;
  const path = new URL(url).pathname;
  if (DIRECT_AUDIO.test(path)) {
    blob = await download(url);
    name = decodeURIComponent(path.split('/').pop() || 'audio');
  } else {
    const r = await fetch(`/__ytdlp?url=${encodeURIComponent(url)}`);
    if (!r.ok) {
      const body = await r.json().catch(() => null);
      throw new Error(body?.error ?? 'Link import needs the CoreCut app (or npm run dev).');
    }
    blob = await r.blob();
    name = decodeURIComponent(r.headers.get('x-filename') ?? 'audio.m4a');
  }
  if (blob.size > 200 * 1024 * 1024) throw new Error('That file is too large to import.');
  const type = blob.type.startsWith('audio/') ? blob.type : 'audio/mp4';
  const info = await probeFile(new File([blob], name, { type }));
  const id = nanoid(8);
  useEditor.getState().addMedia({ id, ...info, kind: 'audio' });
  if (toTimeline) useEditor.getState().addClipFromMedia(id);
  return name;
}

/** Import the user's own audio files. */
export async function importOwnFiles(files: FileList | File[], toTimeline: boolean) {
  for (const f of Array.from(files)) {
    const info = await probeFile(f);
    const id = nanoid(8);
    useEditor.getState().addMedia({ id, ...info });
    if (toTimeline) useEditor.getState().addClipFromMedia(id);
  }
}
