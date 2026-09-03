const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
    throw new Error('Falta la variable de entorno MONGODB_URI');
}

const client = new MongoClient(uri);
let db = null;

async function connectDB() {
    if (db) return db;
    await client.connect();
    db = client.db('vidaplena');
    console.log('Conectado a MongoDB Atlas correctamente');
    return db;
}

module.exports = { connectDB };