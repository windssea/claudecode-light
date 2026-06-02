const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('trafficLight', {
  onStatus: (cb) => {
    ipcRenderer.removeAllListeners('status');
    ipcRenderer.on('status', (_e, data) => cb(data));
  },
});
