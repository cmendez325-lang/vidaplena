console.log('Frontend de Vida Plena cargado correctamente.');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM listo.');
});


const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function iniciarBackend() {
    try {
        const serverPath = path.join(__dirname, 'backend', 'server.js');
        if (fs.existsSync(serverPath)) {
            require(serverPath);
            console.log('Backend (Express + SQLite) inicializado correctamente.');
        } else {
            console.error('No se encontró el archivo del backend en:', serverPath);
        }
    } catch (err) {
        console.error('Error al iniciar el servidor backend:', err);
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1350,
        height: 800,
        title: 'Vida Plena - Sistema de Gestión',
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, 'backend', 'preload.js')
        }
    });

    mainWindow.setMenu(null);

    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        const indexPath = path.join(__dirname, 'frontend', 'dist', 'index.html');
        if (fs.existsSync(indexPath)) {
            mainWindow.loadFile(indexPath);
        } else {
            mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
        }
    }
}

app.whenReady().then(() => {
    iniciarBackend();
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
console.log('Frontend de Vida Plena cargado correctamente.');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM listo.');
});