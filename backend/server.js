console.log('--- INICIANDO SERVIDOR BACKEND VIDA PLENA ---');

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// 1. Determinar ruta de la base de datos
let dbPath;
let ipcMain;

try {
  const electron = require('electron');
  if (electron.app) {
    dbPath = path.join(electron.app.getPath('userData'), 'database.db');
  }
  ipcMain = electron.ipcMain;
} catch (e) {}

if (!dbPath) {
  const appData = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + '/.local/share');
  const userDataDir = path.join(appData, 'vida-plena');
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }
  dbPath = path.join(userDataDir, 'database.db');
}

console.log('Ruta de DB resuelta:', dbPath);

// 2. Inicializar SQLite
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar la Base de Datos:', err.message);
  } else {
    console.log('Base de Datos conectada con éxito.');

    db.run('PRAGMA journal_mode = WAL;');
    db.run('PRAGMA synchronous = NORMAL;');

    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS productos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo_barras TEXT,
        nombre TEXT,
        precio REAL DEFAULT 0,
        stock INTEGER DEFAULT 0,
        categoria TEXT
      );`);

      db.run('CREATE INDEX IF NOT EXISTS idx_prod_nombre ON productos(nombre);');
      db.run('CREATE INDEX IF NOT EXISTS idx_prod_codigo ON productos(codigo_barras);');

      // Cargar producto de prueba si la tabla está vacía
      db.get('SELECT COUNT(*) AS total FROM productos', [], (errRow, row) => {
        if (!errRow && row && row.total === 0) {
          db.run(`INSERT INTO productos (codigo_barras, nombre, precio, stock)
                  VALUES ('12345', 'Silla de ruedas plegable', 150000, 5)`);
          console.log('>>> Producto de prueba cargado (12345 - Silla de ruedas plegable) <<<');
        }
      });
    });
  }
});

// 3. Función unificada de consulta de productos
// NOTA: se alias-ean las columnas para que coincidan EXACTAMENTE
// con lo que espera el frontend (main.js usa prod.codigo, prod.descripcion, prod.precio)
function ejecutarBusquedaProductos(queryTerm, callback) {
  const q = queryTerm ? String(queryTerm).trim() : '';
  console.log(`[DB SEARCH] Buscando término: "${q}"`);

  const sql = `
    SELECT
      id,
      codigo_barras AS codigo,
      nombre AS descripcion,
      precio,
      stock,
      categoria
    FROM productos
    WHERE nombre LIKE ? OR codigo_barras LIKE ?
    LIMIT 30
  `;
  const param = `%${q}%`;

  db.all(sql, [param, param], (err, rows) => {
    if (err) {
      console.error('[DB ERROR] Error en la búsqueda:', err.message);
      return callback(err, []);
    }
    console.log(`[DB SEARCH] Resultados encontrados: ${rows.length}`);
    callback(null, rows);
  });
}

// 4. Endpoints API HTTP
const handlerHTTP = (req, res) => {
  const q = req.query.q || req.query.query || req.query.buscar || req.query.term || req.params.q || '';
  ejecutarBusquedaProductos(q, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error en la base de datos' });
    res.json(rows);
  });
};

app.get('/api/productos/buscar', handlerHTTP);
app.get('/api/productos', handlerHTTP);
app.get('/api/productos/buscar/:q', handlerHTTP);
app.get('/api/articulos', handlerHTTP);

// Actualizar producto por ID
app.put('/api/productos/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, precio, precio_venta, stock, stock_actual } = req.body;

  const valPrecio = precio_venta ?? precio ?? 0;
  const valStock = stock_actual ?? stock ?? 0;

  const sql = `UPDATE productos SET nombre = ?, precio = ?, stock = ? WHERE id = ?`;
  db.run(sql, [nombre, valPrecio, valStock, id], function (err) {
    if (err) {
      console.error('[DB ERROR] Error al actualizar:', err.message);
      return res.status(500).json({ error: 'Error al actualizar producto' });
    }
    res.json({ success: true, cambios: this.changes });
  });
});

// Eliminar producto por ID
app.delete('/api/productos/:id', (req, res) => {
  const { id } = req.params;

  const sql = `DELETE FROM productos WHERE id = ?`;
  db.run(sql, [id], function (err) {
    if (err) {
      console.error('[DB ERROR] Error al eliminar:', err.message);
      return res.status(500).json({ error: 'Error al eliminar producto' });
    }
    res.json({ success: true, eliminados: this.changes });
  });
});

// 5. Manejadores IPC (para Electron)
if (ipcMain) {
  const canalesBusqueda = [
    'buscar-producto',
    'buscar-productos',
    'obtener-productos',
    'get-productos',
    'search-products'
  ];

  canalesBusqueda.forEach((canal) => {
    ipcMain.handle(canal, async (event, term) => {
      return new Promise((resolve) => {
        ejecutarBusquedaProductos(term, (err, rows) => resolve(rows));
      });
    });

    ipcMain.on(canal, (event, term) => {
      ejecutarBusquedaProductos(term, (err, rows) => {
        event.reply(`${canal}-respuesta`, rows);
        event.returnValue = rows;
      });
    });
  });
}

// 6. Servir la interfaz estática compilada desde frontend/dist
const distPath = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
  console.log('Frontend estático configurado correctamente.');
} else {
  console.warn('Atención: No se encontró la carpeta frontend/dist en:', distPath);
}

// 7. Iniciar Servidor Express
app.listen(PORT, () => {
  console.log(`Servidor Backend ejecutándose en puerto ${PORT}`);
});

module.exports = { app, db };