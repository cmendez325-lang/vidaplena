const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'vidaplena.db'));

// Acá van tus CREATE TABLE IF NOT EXISTS, etc.

module.exports = db;