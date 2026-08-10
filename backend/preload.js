const { ipcRenderer } = require('electron');

// Exponer ipcRenderer y require a la interfaz web (Renderer)
window.ipcRenderer = ipcRenderer;
window.require = require;