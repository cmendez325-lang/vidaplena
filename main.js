const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow;
let serverProcess = null;

function startBackendServer() {
    const serverPath = path.join(__dirname, 'backend', 'server.js');
    
    // Lanzamos el servidor Express en un proceso hijo independiente
    serverProcess = fork(serverPath, [], {
        silent: false,
        env: Object.assign({}, process.env, { PORT: 3000 })
    });

    serverProcess.on('error', (err) => {
        console.error('Error en el proceso del backend:', err);
    });
}

function createWindow() {
    startBackendServer();

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'frontend', 'public', 'logo.png'),
        webPreferences: {
            preload: path.join(__dirname, 'backend', 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    mainWindow.setMenu(null);
    mainWindow.loadFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));

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

app.on('will-quit', () => {
    // Matamos el proceso del servidor al salir de la aplicación
    if (serverProcess) {
        serverProcess.kill();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});