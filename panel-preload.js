// Ponte do painel com o navegador. O processo principal também confere a origem (panel.html).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('painel', {
  call: (name, arg) => ipcRenderer.invoke('panel', name, arg),
});
