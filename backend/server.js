const express = require('express');
const cors = require('cors');

const db = require('./database');
const arcaService = require('./arca.service');

const app = express();

app.use(express.json());
app.use(cors());

// 1. Endpoint real para obtener las ventas del día desde SQLite
app.get('/api/ventas/hoy', (req, res) => {
    try {
        const hoy = new Date().toISOString().split('T')[0];
        
        const stmt = db.prepare(`SELECT * FROM ventas WHERE DATE(fecha) = ?`);
        const ventasDelDia = stmt.all(hoy);

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

// 2. Endpoint para emisión real de Nota de Crédito mediante ARCA
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
            const insert = db.prepare(`
                INSERT INTO notas_credito (cae, vencimiento_cae, numero, punto_venta, total, fecha) 
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            `);
            insert.run(resultadoArca.cae, resultadoArca.vencimientoCae, resultadoArca.numeroComprobante, resultadoArca.puntoVenta, resultadoArca.importeTotal);
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

/// 3. Inicialización limpia del Servidor para Render
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});