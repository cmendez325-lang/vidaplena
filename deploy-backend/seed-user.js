// Script de un solo uso para crear el usuario admin en MongoDB.
// Ejecutar UNA VEZ desde la carpeta deploy-backend con: node seed-user.js
// Después se puede borrar este archivo si se quiere.

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const uri = process.env.MONGODB_URI;

if (!uri) {
    console.error('Falta la variable de entorno MONGODB_URI. Corré este script con la variable seteada, por ejemplo:');
    console.error('  set MONGODB_URI=mongodb+srv://... && node seed-user.js   (Windows cmd)');
    console.error('  $env:MONGODB_URI="mongodb+srv://..."; node seed-user.js  (PowerShell)');
    process.exit(1);
}

const USUARIO = 'Daniela26';
const CONTRASENA = 'Ayeliabenja';

async function seedUser() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('vidaplena');
        const usuarios = db.collection('usuarios');

        const existente = await usuarios.findOne({ usuario: USUARIO });
        if (existente) {
            console.log(`El usuario "${USUARIO}" ya existe. No se creó de nuevo.`);
            return;
        }

        const hash = await bcrypt.hash(CONTRASENA, 10);
        await usuarios.insertOne({ usuario: USUARIO, passwordHash: hash });
        console.log(`Usuario "${USUARIO}" creado correctamente.`);
    } catch (err) {
        console.error('Error al crear el usuario:', err);
    } finally {
        await client.close();
    }
}

seedUser();
