const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

// Avioc Apps - Official Desktop App Store for Windows (Fills & fits all screens)
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

let mainWindow = null;
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
  const iconPath = path.join(__dirname, '..', 'assets', 'icons', 'Avioc original.jpg');
  const fallbackIcon = path.join(__dirname, '..', 'assets', 'icons', 'app-icon-512.png');
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

  const indexPath = path.join(__dirname, '..', 'firebase-public', 'index.html');
  const rootIndex = path.join(__dirname, '..', 'index.html');
  const fileToLoad = fs.existsSync(indexPath) ? indexPath : rootIndex;

  mainWindow.loadFile(fileToLoad);

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
