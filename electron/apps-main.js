const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

// Avioc Apps - official installable app catalog for desktop and Android builds.
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

let mainWindow = null;
const installerNamePattern = /^(?:Avioc-Cinema-Setup-(?:x64|ia32)|Avioc-Apps-Setup-v\d+\.\d+\.\d+-(?:x64|ia32)|Core-Sorter-Windows-x64-v\d+\.\d+\.\d+|CoreCut-(?:Windows-x64|Setup-Windows-x64)-v\d+\.\d+\.\d+)\.exe$/i;

function validateInstallerUrl(rawUrl) {
  let url;
  try { url = new URL(rawUrl); } catch (_) { throw new Error('The installer link is invalid.'); }
  const fileName = path.posix.basename(decodeURIComponent(url.pathname));
  if (url.protocol !== 'https:' || url.hostname !== 'aviocwatch.b-cdn.net' ||
      decodeURIComponent(url.pathname).split('/').slice(1, 3).join('/') !== 'avioc app/avioc cinema' ||
      !installerNamePattern.test(fileName) || url.search || url.hash) {
    throw new Error('Only approved Avioc Apps Store Windows packages can be opened from this store.');
  }
  return { url: url.href, fileName };
}

ipcMain.handle('avioc:install-windows-package', async (event, rawUrl) => {
  if (process.platform !== 'win32') throw new Error('Automatic setup launch is available in the Windows Avioc Apps standalone.');
  if (!mainWindow || event.sender !== mainWindow.webContents) throw new Error('The Avioc Apps window is not available.');
  const { url, fileName } = validateInstallerUrl(rawUrl);
  const session = mainWindow.webContents.session;
  const targetPath = path.join(app.getPath('downloads'), fileName);

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      session.removeListener('will-download', onWillDownload);
      if (error) reject(error); else resolve(result);
    };
    const timeout = setTimeout(() => finish(new Error('The setup download timed out. Try again from Downloads.')), 15 * 60 * 1000);
    const onWillDownload = (downloadEvent, item, webContents) => {
      if (webContents !== mainWindow?.webContents) return;
      const itemName = path.basename(item.getFilename());
      if (itemName !== fileName) return;
      let itemUrl;
      try { itemUrl = validateInstallerUrl(item.getURL()); }
      catch (error) {
        item.cancel();
        finish(error);
        return;
      }
      if (itemUrl.fileName !== fileName) {
        item.cancel();
        finish(new Error('The downloaded setup did not match the selected Avioc app.'));
        return;
      }

      item.setSavePath(targetPath);
      item.on('updated', () => {
        const total = item.getTotalBytes();
        const received = item.getReceivedBytes();
        mainWindow?.webContents.send('avioc:installer-progress', {
          fileName,
          percent: total > 0 ? Math.floor((received / total) * 100) : null
        });
      });
      item.once('done', async (_downloadEvent, state) => {
        if (state !== 'completed') {
          finish(new Error(state === 'cancelled' ? 'The installer download was cancelled.' : 'The installer download failed.'));
          return;
        }
        try {
          const openError = await shell.openPath(targetPath);
          if (openError) {
            finish(new Error(`The setup downloaded, but Windows could not open it: ${openError}`));
            return;
          }
          finish(null, { fileName });
        } catch (error) {
          finish(new Error(`The setup downloaded, but Windows could not open it: ${error.message || error}`));
        }
      });
    };

    session.on('will-download', onWillDownload);
    try {
      mainWindow.webContents.downloadURL(url);
    } catch (error) {
      finish(error);
    }
  });
});
const protocolScheme = 'aviocapps';
if (process.defaultApp && process.argv.length >= 2) {
  app.setAsDefaultProtocolClient(protocolScheme, process.execPath, [path.resolve(process.argv[1])]);
} else {
  app.setAsDefaultProtocolClient(protocolScheme);
}
const hasSingleInstance = app.requestSingleInstanceLock();

function focusMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

if (!hasSingleInstance) {
  app.quit();
} else {
  app.on('second-instance', focusMainWindow);
  app.on('open-url', (event) => {
    event.preventDefault();
    focusMainWindow();
  });
}

function createWindow() {
  const iconPath = path.join(__dirname, '..', 'assets', 'icons', 'avioc-apps-512.png');
  const fallbackIcon = path.join(__dirname, '..', 'assets', 'icons', 'logo-avioc-apps.svg');
  const actualIcon = fs.existsSync(iconPath) ? iconPath : fallbackIcon;

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 480,
    minHeight: 600,
    backgroundColor: '#ffffff',
    title: 'Avioc Apps',
    icon: actualIcon,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'apps-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  const appsPagePath = path.join(__dirname, '..', 'firebase-public', 'apps.html');
  const indexPath = path.join(__dirname, '..', 'firebase-public', 'index.html');
  const rootIndex = path.join(__dirname, '..', 'index.html');
  const fileToLoad = fs.existsSync(appsPagePath) ? appsPagePath : (fs.existsSync(indexPath) ? indexPath : rootIndex);
  const otaUrl = 'https://aviocwatch.b-cdn.net/apps-ota-v1.0.24.html';
  let usedLocalFallback = false;

  mainWindow.webContents.on('did-fail-load', (_event, _code, _description, _validatedURL, isMainFrame) => {
    if (isMainFrame && !usedLocalFallback) {
      usedLocalFallback = true;
      mainWindow.loadFile(fileToLoad);
    }
  });
  mainWindow.loadURL(otaUrl).catch(() => {
    if (!usedLocalFallback) {
      usedLocalFallback = true;
      mainWindow.loadFile(fileToLoad);
    }
  });

  // Fills and fits the entire screen on launch!
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  // F11 for Full Screen toggle
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
  });

  // Open external links and file downloads safely
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  if (hasSingleInstance) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
