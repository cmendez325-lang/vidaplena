const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { connectDB } = require('./database');
const arcaService = require('./arca.service');

const app = express();

app.use(express.json());
app.use(cors());

let db;

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('Falta la variable de entorno JWT_SECRET');
}

// ---------- Login (ruta pública, no requiere token) ----------

app.post('/api/login', async (req, res) => {
    try {
        const { usuario, contrasena } = req.body;

        if (!usuario || !contrasena) {
            return res.status(400).json({ ok: false, error: 'Faltan usuario o contraseña.' });
        }

        const user = await db.collection('usuarios').findOne({ usuario });
        if (!user) {
            return res.status(401).json({ ok: false, error: 'Usuario o contraseña incorrectos.' });
        }

        const passwordOk = await bcrypt.compare(contrasena, user.passwordHash);
        if (!passwordOk) {
            return res.status(401).json({ ok: false, error: 'Usuario o contraseña incorrectos.' });
        }

        const token = jwt.sign({ usuario: user.usuario }, JWT_SECRET, { expiresIn: '12h' });
        res.json({ ok: true, token });
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// ---------- Middleware de autenticación (protege todo lo que sigue) ----------

function verificarToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ ok: false, error: 'No autorizado. Falta el token.' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.usuario = payload.usuario;
        next();
    } catch (err) {
        return res.status(401).json({ ok: false, error: 'Token inválido o expirado.' });
    }
}

app.use('/api', verificarToken);

// ---------- Productos ----------

app.get('/api/productos', async (req, res) => {
    try {
        const productos = await db.collection('productos').find().sort({ _id: -1 }).toArray();
        const mapeados = productos.map(p => ({ ...p, id: p._id.toString() }));
        res.json(mapeados);
    } catch (error) {
        console.error("Error al listar productos:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

app.post('/api/productos', async (req, res) => {
    try {
        const { codigo, descripcion, categoria, costo, ganancia, iva, precio, stock, imagen } = req.body;

        if (!codigo || !descripcion) {
            return res.status(400).json({ ok: false, error: 'Faltan código o descripción.' });
        }

        const nuevoDoc = {
            codigo,
            descripcion,
            categoria: categoria || 'VARIOS',
            costo: costo || 0,
            ganancia: ganancia || 30,
            iva: iva || 21,
            precio: precio || 0,
            stock: stock || 0,
            imagen: imagen || ''
        };

        const resultado = await db.collection('productos').insertOne(nuevoDoc);
        res.status(201).json({ ...nuevoDoc, id: resultado.insertedId.toString() });
    } catch (error) {
        console.error("Error al crear producto:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

app.put('/api/productos/:id', async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const { id } = req.params;
        const { codigo, descripcion, categoria, costo, ganancia, iva, precio, stock, imagen } = req.body;

        const actualizado = {
            codigo, descripcion,
            categoria: categoria || 'VARIOS',
            costo: costo || 0,
            ganancia: ganancia || 30,
            iva: iva || 21,
            precio: precio || 0,
            stock: stock || 0,
            imagen: imagen || ''
        };

        const resultado = await db.collection('productos').findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: actualizado },
            { returnDocument: 'after' }
        );

        if (!resultado) {
            return res.status(404).json({ ok: false, error: 'Producto no encontrado.' });
        }

        res.json({ ...resultado, id: resultado._id.toString() });
    } catch (error) {
        console.error("Error al actualizar producto:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

app.delete('/api/productos/:id', async (req, res) => {
    try {
        const { ObjectId } = require('mongodb');
        const { id } = req.params;

        const resultado = await db.collection('productos').deleteOne({ _id: new ObjectId(id) });

        if (resultado.deletedCount === 0) {
            return res.status(404).json({ ok: false, error: 'Producto no encontrado.' });
        }
        res.json({ ok: true, mensaje: 'Producto eliminado correctamente.' });
    } catch (error) {
        console.error("Error al eliminar producto:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// ---------- Ventas ----------

app.get('/api/ventas/hoy', async (req, res) => {
    try {
        const inicioHoy = new Date();
        inicioHoy.setHours(0, 0, 0, 0);
        const finHoy = new Date();
        finHoy.setHours(23, 59, 59, 999);

        const ventasDelDia = await db.collection('ventas').find({
            fecha: { $gte: inicioHoy, $lte: finHoy }
        }).toArray();

        const totalVendido = ventasDelDia.reduce((acc, v) => acc + (v.total || 0), 0);
        const cantTickets = ventasDelDia.length;
        const ticketPromedio = cantTickets > 0 ? totalVendido / cantTickets : 0;

        res.json({
            ventas: ventasDelDia,
            totalVendido,
            cantTickets,
            ticketPromedio
        });
    } catch (error) {
        console.error("Error al consultar las ventas:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// ---------- Nota de Crédito (ARCA) ----------

app.post('/api/nota-credito', async (req, res) => {
    try {
        const { total, condicionIva, cuitCliente, facturaOriginal, percepcionArba, tipoComprobante } = req.body;

        if (!total || !facturaOriginal) {
            return res.status(400).json({ ok: false, error: 'Faltan datos obligatorios para la Nota de Crédito.' });
        }

        const datosNC = {
            tipoComprobante: tipoComprobante || 'Nota de Crédito B',
            condicionIva: condicionIva || 'Consumidor Final',
            cuitCliente: cuitCliente || '',
            total: Number(total),
            percepcionArba: percepcionArba || 0,
            comprobanteAsociado: {
                tipoCbte: facturaOriginal.tipoCbte || 6,
                puntoVenta: facturaOriginal.puntoVenta || 1,
                numero: facturaOriginal.numero
            }
        };

        const resultadoArca = await arcaService.emitirNotaCredito(datosNC);

        try {
            await db.collection('notas_credito').insertOne({
                cae: resultadoArca.cae,
                vencimiento_cae: resultadoArca.vencimientoCae,
                numero: resultadoArca.numeroComprobante,
                punto_venta: resultadoArca.puntoVenta,
                total: resultadoArca.importeTotal,
                fecha: new Date()
            });
        } catch (dbError) {
            console.warn("La Nota de Crédito se autorizó en ARCA pero hubo un error al guardarla localmente:", dbError.message);
        }

        return res.json({
            ok: true,
            cae: resultadoArca.cae,
            vencimientoCae: resultadoArca.vencimientoCae,
            numeroComprobante: resultadoArca.numeroComprobante,
            mensaje: "Nota de Crédito autorizada correctamente por ARCA."
        });

    } catch (error) {
        console.error("Error en servidor al procesar Nota de Crédito con ARCA:", error);
        return res.status(500).json({ ok: false, error: error.message });
    }
});

// ---------- Inicialización ----------

const PORT = process.env.PORT || 3000;

connectDB()
    .then((database) => {
        db = database;
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Servidor backend corriendo en el puerto ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('No se pudo conectar a MongoDB:', err);
        process.exit(1);
    });
