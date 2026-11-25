// Ponte da lista de sugestões: só recebe a lista e avisa qual item foi clicado.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('suggest', {
  onList: fn => ipcRenderer.on('suggest', (_, s) => fn(s)),
  pick: i => ipcRenderer.send('suggest-pick', i),
});
