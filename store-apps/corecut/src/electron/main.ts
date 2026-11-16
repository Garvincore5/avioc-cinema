import { app, BrowserWindow, dialog, Menu, session, shell } from 'electron';
import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { handleAudioRoutes, setToolsDir } from '../audio-proxy.ts';

/**
 * CoreCut desktop shell. It serves the built app (dist/) from a small local server, together with
 * the same /__audio and /__ytdlp routes the Vite dev server has, so link import, save and export
 * all work without `npm run dev`.
 */

// A fixed port keeps the page origin the same between launches, so saved color presets,
// audio keys and remembered folders survive a restart.
const PORT = 47817;
const DIST = join(app.getAppPath(), 'dist');

// yt-dlp.exe / ffmpeg.exe can sit in a "tools" folder next to CoreCut.exe (portable builds report
// their real folder in PORTABLE_EXECUTABLE_DIR, since they run from a temp copy).
const exeDir = process.env.PORTABLE_EXECUTABLE_DIR ?? dirname(process.execPath);
setToolsDir(app.isPackaged ? join(exeDir, 'tools') : join(process.cwd(), 'tools'));

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

function serveStatic(url: string, res: import('node:http').ServerResponse) {
  let path = decodeURIComponent(url.split('?')[0]);
  if (path === '/' || path === '') path = '/index.html';
  const file = normalize(join(DIST, path));
  if (!file.startsWith(DIST + sep) || !existsSync(file) || !statSync(file).isFile()) {
    res.statusCode = 404;
    return res.end('not found');
  }
  res.setHeader('content-type', MIME[extname(file).toLowerCase()] ?? 'application/octet-stream');
  res.setHeader('cache-control', 'no-cache');
  createReadStream(file).pipe(res);
}

function startServer(port: number): Promise<{ server: Server; port: number }> {
  const server = createServer((req, res) => {
    handleAudioRoutes(req, res)
      .then((handled) => handled || serveStatic(req.url ?? '/', res))
      .catch(() => {
        res.statusCode = 500;
        res.end('error');
      });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: typeof addr === 'object' && addr ? addr.port : port });
    });
  });
}

async function createWindow() {
  // fall back to any free port if the usual one is taken
  const { port } = await startServer(PORT).catch(() => startServer(0));
  const origin = `http://127.0.0.1:${port}`;

  // Let the page use the file pickers, folder access, clipboard and fullscreen it already asks for.
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((wc, _perm, cb) => cb(wc.getURL().startsWith(origin)));
  ses.setPermissionCheckHandler((_wc, _perm, requestingOrigin) => requestingOrigin.startsWith(origin));

  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 640,
    backgroundColor: '#0f1115',
    title: 'CoreCut',
    icon: join(app.getAppPath(), 'build', 'icon.png'),
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false },
  });
  win.once('ready-to-show', () => {
    win.maximize();
    win.show();
  });

  // links to other sites (credits, sources) open in the normal browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(origin)) {
      e.preventDefault();
      if (/^https?:/.test(url)) void shell.openExternal(url);
    }
  });
  // The editor blocks closing while there are unsaved changes; Electron needs us to ask.
  win.webContents.on('will-prevent-unload', (e) => {
    const choice = dialog.showMessageBoxSync(win, {
      type: 'warning',
      buttons: ['Close without saving', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      title: 'CoreCut',
      message: 'You have unsaved changes.',
      detail: 'Close CoreCut anyway? Press Cancel, then Ctrl+S to save first.',
    });
    if (choice === 0) e.preventDefault(); // preventDefault here means "let it close"
  });
  // F12 opens the developer tools (handy if something needs debugging), Ctrl+Shift+R reloads
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F12') {
      win.webContents.toggleDevTools();
      e.preventDefault();
    } else if (input.control && input.shift && input.key.toLowerCase() === 'r') {
      win.webContents.reload();
      e.preventDefault();
    }
  });
  // keep the editor's own title ("CoreCut") instead of the page's
  win.on('page-title-updated', (e) => e.preventDefault());

  await win.loadURL(origin);
}

// One CoreCut at a time: a second double-click focuses the open window.
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w) {
      if (w.isMinimized()) w.restore();
      w.focus();
    }
  });
  Menu.setApplicationMenu(null);
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
}
