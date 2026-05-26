const { ipcRenderer } = require('electron');

window.electronAPI = {
  readModule: (path) => ipcRenderer.invoke('read-module', path),
  selectFile: () => ipcRenderer.invoke('select-file'),
  playFile: (filePath) => ipcRenderer.invoke('play-file', filePath),
  openFolder: (filePath) => ipcRenderer.invoke('open-folder', filePath)
};