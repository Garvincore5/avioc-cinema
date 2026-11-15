const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('AviocNative', {
  platform: process.platform,
  isElectron: true,
  appId: 'cinema',
  appVersion: '1.0.0',
  isStandalone: true
});

window.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('is-native-desktop');
});
