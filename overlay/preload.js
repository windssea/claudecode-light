const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('trafficLight', {
  onStatus: (cb) => ipcRenderer.on('status', (_e, data) => cb(data)),
});
