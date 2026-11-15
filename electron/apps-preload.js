const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('AviocNative', {
  platform: process.platform,
  isElectron: true,
  appId: 'apps',
  appVersion: '1.0.12',
  isStandalone: true
});

window.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('is-native-desktop');
});
