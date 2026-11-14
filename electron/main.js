const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

// Enable hardware acceleration for smooth 4K/1080p BunnyCDN video streaming
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow = null;

function createWindow() {
  const iconPath = path.join(__dirname, '..', 'assets', 'icons', 'app-icon-512.png');
  const fallbackIcon = path.join(__dirname, '..', 'icon-512.png');
  const actualIcon = fs.existsSync(iconPath) ? iconPath : fallbackIcon;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#07080c',
    title: 'Avioc Cinema',
    icon: actualIcon,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  // Determine path to local bundled assets (open cinema app directly)
  const cinemaPath = path.join(__dirname, '..', 'firebase-public', 'cinema.html');
  const rootCinema = path.join(__dirname, '..', 'cinema.html');
  const publicIndexPath = path.join(__dirname, '..', 'firebase-public', 'index.html');
  const fileToLoad = fs.existsSync(cinemaPath) ? cinemaPath : (fs.existsSync(rootCinema) ? rootCinema : publicIndexPath);

  mainWindow.loadFile(fileToLoad);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links (Pinterest, Telegram, WhatsApp) in the user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      if (!url.includes('aviocwatch.b-cdn.net')) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    }
    return { action: 'allow' };
  });

  // Handle Fullscreen shortcut (F11)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
