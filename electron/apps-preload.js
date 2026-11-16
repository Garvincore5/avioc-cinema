const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('AviocNative', {
  platform: process.platform,
  isElectron: true,
  appId: 'apps',
  appVersion: '1.0.22',
  isStandalone: true,
  installWindowsPackage: (url) => ipcRenderer.invoke('avioc:install-windows-package', url),
  onInstallerProgress: (callback) => ipcRenderer.on('avioc:installer-progress', (_event, progress) => callback(progress))
});

window.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('is-native-desktop');
});
