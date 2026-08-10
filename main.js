const { app, BrowserWindow } = require('electron');
const path = require('path');

// Arranca el backend (Express + SQLite) en el mismo proceso de Electron.
// backend/server.js ya detecta que corre dentro de Electron (require('electron'))
// y expone los endpoints IPC además de levantar el servidor HTTP en el puerto 3001.
require('./backend/server.js');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    icon: path.join(__dirname, 'frontend', 'public', 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'backend', 'preload.js'),
      contextIsolation: false,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Carga la versión compilada del frontend (generada con "npx vite build" en /frontend)
  mainWindow.loadFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));

  // Descomentar para depurar con DevTools abiertas automáticamente:
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});