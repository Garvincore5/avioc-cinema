import type { Plugin } from 'vite';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';

/**
 * Local server helpers for the audio browser. Used by the Vite dev server (`npm run dev`) and by
 * the CoreCut desktop app (electron/main.ts), which serves the same routes from its built-in server:
 *
 *   GET /__audio?url=<https url>   fetch an audio file from a host that doesn't send CORS headers
 *   GET /__ytdlp/status            is yt-dlp installed on this computer?
 *   GET /__ytdlp?url=<page url>    download the audio track of a page with the user's own yt-dlp
 *
 * yt-dlp is not bundled. It is looked up on PATH (yt-dlp) or as a Python module (python -m yt_dlp).
 */
const MAX_BYTES = 200 * 1024 * 1024;
const TIMEOUT_MS = 5 * 60 * 1000;

const isPublicHttp = (u: URL) =>
  (u.protocol === 'https:' || u.protocol === 'http:') && !/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[)/.test(u.hostname);

type Cmd = [string, string[]];

/** Folder that may hold yt-dlp.exe / ffmpeg.exe. The desktop app points it next to CoreCut.exe. */
let toolsDir = join(process.cwd(), 'tools');
export const setToolsDir = (dir: string) => {
  toolsDir = dir;
};

/**
 * Places yt-dlp usually lives. A dev server started before yt-dlp was installed has an old PATH,
 * so on Windows we also look where winget, scoop and chocolatey put it, plus a copy dropped
 * into this project's tools/ folder. CUTLINE_YTDLP can point at any other yt-dlp executable.
 */
async function candidates(): Promise<Cmd[]> {
  const list: Cmd[] = [];
  if (process.env.CUTLINE_YTDLP) list.push([process.env.CUTLINE_YTDLP, []]);
  list.push([join(toolsDir, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'), []]);
  list.push(['yt-dlp', []]);
  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA ?? '';
    const home = process.env.USERPROFILE ?? '';
    list.push([join(local, 'Microsoft', 'WinGet', 'Links', 'yt-dlp.exe'), []]);
    try {
      const pkgs = join(local, 'Microsoft', 'WinGet', 'Packages');
      for (const d of await readdir(pkgs)) if (d.toLowerCase().startsWith('yt-dlp.yt-dlp')) list.push([join(pkgs, d, 'yt-dlp.exe'), []]);
    } catch {
      /* winget not used */
    }
    list.push([join(home, 'scoop', 'shims', 'yt-dlp.exe'), []]);
    list.push(['C:\\ProgramData\\chocolatey\\bin\\yt-dlp.exe', []]);
  }
  list.push(['python', ['-m', 'yt_dlp']], ['py', ['-m', 'yt_dlp']], ['python3', ['-m', 'yt_dlp']]);
  // skip absolute paths that don't exist so the lookup stays fast
  return list.filter(([c]) => !/[\\/]/.test(c) || existsSync(c));
}

function run(cmd: Cmd, args: string[], timeout = TIMEOUT_MS): Promise<{ code: number; out: string; err: string }> {
  return new Promise((resolve) => {
    // no shell: the URL is passed as a plain argument and can't run commands
    // Inside the desktop app process.execPath is CoreCut.exe; ELECTRON_RUN_AS_NODE lets yt-dlp use it as node.
    const env = process.versions.electron ? { ...process.env, ELECTRON_RUN_AS_NODE: '1' } : process.env;
    const p = spawn(cmd[0], [...cmd[1], ...args], { windowsHide: true, env });
    let out = '';
    let err = '';
    const timer = setTimeout(() => p.kill(), timeout);
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('error', () => {
      clearTimeout(timer);
      resolve({ code: -1, out, err: 'not found' });
    });
    p.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, out, err });
    });
  });
}

/** A folder holding ffmpeg that a stale PATH might miss (winget installs it next to yt-dlp). */
function ffmpegDir(cmd: Cmd): string | null {
  const exe = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  const dirs = [toolsDir];
  if (/[\\/]/.test(cmd[0])) dirs.unshift(join(cmd[0], '..'));
  if (process.platform === 'win32') dirs.push(join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'WinGet', 'Links'));
  return dirs.find((d) => existsSync(join(d, exe))) ?? null;
}

/** yt-dlp versions are dates (2026.10.26), so a numeric compare orders them. */
const newer = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true }) > 0;

/**
 * Picks the NEWEST working yt-dlp, not the first one: an old copy on a stale PATH breaks YouTube
 * ("The page needs to be reloaded") while a freshly upgraded one sits in the winget folder.
 * Re-checked every minute so upgrading yt-dlp works without restarting the dev server.
 */
const RECHECK_MS = 60 * 1000;
let found: { cmd: Cmd; version: string; at: number } | null = null;
async function findYtDlp(fresh = false) {
  if (found && !fresh && Date.now() - found.at < RECHECK_MS) return found;
  let best: { cmd: Cmd; version: string; at: number } | null = null;
  for (const cmd of await candidates()) {
    const r = await run(cmd, ['--version'], 15000);
    const version = r.out.trim();
    if (r.code === 0 && version && (!best || newer(version, best.version))) best = { cmd, version, at: Date.now() };
  }
  return (found = best);
}

/**
 * yt-dlp needs a JavaScript runtime for YouTube (since 2025.11). Deno is its default but a stale
 * PATH may not have it, so hand it deno by full path, or else the node running this server.
 */
function jsRuntimeArgs(version: string): string[] {
  if (!newer(version, '2025.11')) return []; // older builds don't know the flag
  const deno = process.platform === 'win32' ? 'deno.exe' : 'deno';
  const dirs = (process.env.PATH ?? '').split(process.platform === 'win32' ? ';' : ':');
  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA ?? '';
    dirs.push(join(local, 'Microsoft', 'WinGet', 'Links'));
    try {
      const pkgs = join(local, 'Microsoft', 'WinGet', 'Packages');
      for (const d of readdirSync(pkgs)) if (d.toLowerCase().startsWith('denoland.deno')) dirs.push(join(pkgs, d));
    } catch {
      /* winget not used */
    }
  }
  const d = dirs.map((x) => join(x, deno)).find((p) => existsSync(p));
  return ['--js-runtimes', d ? `deno:${d}` : `node:${process.execPath}`];
}

/** Turn yt-dlp's last ERROR line into something a person can act on. */
function friendlyError(err: string, version: string): string {
  const line = err.split(/\r?\n/).reverse().find((l) => l.startsWith('ERROR'));
  if (!line) return 'yt-dlp could not get audio from that link.';
  const msg = line.replace(/^ERROR:\s*/, '');
  if (/page needs to be reloaded|sign in to confirm|unable to extract|nsig|signature/i.test(msg))
    return `YouTube changed something and yt-dlp ${version} can't keep up. Update it (winget upgrade yt-dlp, or yt-dlp -U) and try again. (${msg})`;
  return msg;
}

const send = (res: import('node:http').ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
};

type Req = import('node:http').IncomingMessage;
type Res = import('node:http').ServerResponse;

async function audioRoute(req: Req, res: Res) {
  try {
    const target = new URL(new URL(req.url ?? '', 'http://x').searchParams.get('url') ?? '');
    if (target.protocol !== 'https:' || !isPublicHttp(target)) throw new Error('bad url');
    const r = await fetch(target, { redirect: 'follow' });
    const type = r.headers.get('content-type') ?? '';
    if (!r.ok || !(type.startsWith('audio/') || type === 'application/octet-stream')) {
      res.statusCode = 502;
      return res.end('not audio');
    }
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      res.statusCode = 413;
      return res.end('too large');
    }
    res.setHeader('content-type', type.startsWith('audio/') ? type : 'audio/mpeg');
    res.end(buf);
  } catch {
    res.statusCode = 400;
    res.end('bad request');
  }
}

async function ytdlpRoute(req: Req, res: Res) {
  const reqUrl = new URL(req.url ?? '', 'http://x');
  if (reqUrl.pathname === '/__ytdlp/status') {
    const y = await findYtDlp();
    return send(res, 200, { installed: !!y, version: y?.version ?? null });
  }
  let target: URL;
  try {
    target = new URL(reqUrl.searchParams.get('url') ?? '');
    if (!isPublicHttp(target)) throw new Error();
  } catch {
    return send(res, 400, { error: 'That is not a valid web link.' });
  }
  let y = await findYtDlp();
  if (!y) return send(res, 501, { error: 'yt-dlp is not installed.' });

  const dir = await mkdtemp(join(tmpdir(), 'corecut-'));
  try {
    // Audio only, no re-encode (fast, and no ffmpeg needed). m4a first since every browser plays it.
    const download = (yt: { cmd: Cmd; version: string }) => {
      const ff = ffmpegDir(yt.cmd);
      return run(yt.cmd, [
        ...(ff ? ['--ffmpeg-location', ff] : []),
        ...jsRuntimeArgs(yt.version),
        '--no-playlist',
        '--no-progress',
        '-f', 'bestaudio[ext=m4a]/bestaudio/best',
        '--max-filesize', `${MAX_BYTES}`,
        '-P', dir,
        '-o', '%(title).80B.%(ext)s',
        '--print', 'after_move:filepath',
        '--no-simulate',
        '--',
        target.toString(),
      ]);
    };
    let r = await download(y);
    if (r.code !== 0) {
      // yt-dlp may have been upgraded since we last looked; retry once with a fresh lookup
      const again = await findYtDlp(true);
      if (again && (again.cmd[0] !== y.cmd[0] || again.version !== y.version)) r = await download((y = again));
    }
    const file = r.out.trim().split(/\r?\n/).pop();
    if (r.code !== 0 || !file) return send(res, 502, { error: friendlyError(r.err, y.version) });
    const buf = await readFile(file);
    const ext = file.split('.').pop()?.toLowerCase() ?? '';
    const type = ext === 'm4a' || ext === 'mp4' ? 'audio/mp4' : ext === 'webm' ? 'audio/webm' : ext === 'mp3' ? 'audio/mpeg' : ext === 'ogg' || ext === 'opus' ? 'audio/ogg' : 'application/octet-stream';
    res.setHeader('content-type', type);
    res.setHeader('x-filename', encodeURIComponent(basename(file)));
    res.end(buf);
  } catch {
    send(res, 500, { error: 'Download failed.' });
  } finally {
    void rm(dir, { recursive: true, force: true });
  }
}

/** Handles /__audio and /__ytdlp requests (full URL in req.url). Returns false for anything else. */
export async function handleAudioRoutes(req: Req, res: Res): Promise<boolean> {
  const path = (req.url ?? '').split('?')[0];
  if (path === '/__audio') await audioRoute(req, res);
  else if (path === '/__ytdlp' || path === '/__ytdlp/' || path === '/__ytdlp/status') await ytdlpRoute(req, res);
  else return false;
  return true;
}

export function audioProxy(): Plugin {
  return {
    name: 'corecut-audio-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        handleAudioRoutes(req, res).then((handled) => handled || next(), next);
      });
    },
  };
}
