const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 1. Determinar la ruta de la base de datos
let dbPath;
try {
  const { app } = require('electron');
  if (app) {
    dbPath = path.join(app.getPath('userData'), 'database.db');
  }
} catch (e) {}

if (!dbPath) {
  const appData = process.env.APPDATA || process.env.HOME;
  const userDataDir = path.join(appData, 'vida-plena');
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }
  dbPath = path.join(userDataDir, 'database.db');
}

// 2. Determinar la ubicación del archivo binario .node
const options = {};
if (process.mainModule && process.mainModule.filename.includes('app.asar')) {
  const unpackedNative = path.join(
    process.resourcesPath,
    'app.asar.unpacked',
    'node_modules',
    'better-sqlite3',
    'build',
    'Release',
    'better_sqlite3.node'
  );

  const extraResourceNative = path.join(
    process.resourcesPath,
    'node_modules',
    'better-sqlite3',
    'build',
    'Release',
    'better_sqlite3.node'
  );

  if (fs.existsSync(unpackedNative)) {
    options.nativeBinding = unpackedNative;
  } else if (fs.existsSync(extraResourceNative)) {
    options.nativeBinding = extraResourceNative;
  }
}

// 3. Crear y exportar la instancia
const db = new Database(dbPath, options);
console.log('Base de datos conectada en:', dbPath);

module.exports = db;