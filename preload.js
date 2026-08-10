const { ipcRenderer } = require('electron');

// Exposición global para scripts legados y llamadas IPC en el Renderer
window.ipcRenderer = ipcRenderer;
window.require = require;