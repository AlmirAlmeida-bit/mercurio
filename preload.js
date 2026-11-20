const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mercurio', {
  cmd: (name, arg) => ipcRenderer.send('cmd', name, arg),
  onState: fn => ipcRenderer.on('state', (_, s) => fn(s)),
  onFocusUrl: fn => ipcRenderer.on('focus-url', () => fn()),
});
