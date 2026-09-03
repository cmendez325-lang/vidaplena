const ThermalPrinter = require('node-thermal-printer').printer;
const PrinterTypes = require('node-thermal-printer').types;

const IP_IMPRESORA = process.env.PRINTER_IP || '192.168.1.50'; // <-- poné acá la IP real
const PUERTO_IMPRESORA = process.env.PRINTER_PORT || '9100'; // 9100 es el estándar para térmicas en red

async function imprimirTicket(comprobante, empresa = {}) {
    const printer = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: `tcp://${IP_IMPRESORA}:${PUERTO_IMPRESORA}`,
        options: { timeout: 5000 },
        width: 48, // 42-48 aprox para 80mm, ~32 para 58mm
    });

    try {
        const conectada = await printer.isPrinterConnected();
        if (!conectada) {
            throw new Error('No se pudo conectar a la impresora en ' + IP_IMPRESORA);
        }

        printer.alignCenter();
        printer.println(empresa.nombre || 'Vida Plena - Insumos Hospitalarios');
        printer.println(empresa.direccion || '');
        printer.drawLine();

        printer.alignLeft();
        printer.println(`Comprobante: ${comprobante.tipoComprobante} N° ${comprobante.numeroComprobante}`);
        printer.println(`Punto de Venta: ${comprobante.puntoVenta}`);
        printer.println(`Fecha: ${new Date().toLocaleString('es-AR')}`);
        printer.drawLine();

        // Acá deberías iterar los items de la venta si los tenés
        // comprobante.items.forEach(item => {
        //     printer.println(`${item.cantidad} x ${item.nombre}  $${item.subtotal}`);
        // });

        printer.drawLine();
        printer.alignRight();
        printer.println(`TOTAL: $${comprobante.importeTotal.toFixed(2)}`);
        printer.drawLine();

        if (comprobante.cae) {
            printer.alignCenter();
            printer.println(`CAE: ${comprobante.cae}`);
            printer.println(`Vto CAE: ${comprobante.vencimientoCae}`);
        }

        printer.cut();
        await printer.execute();
        console.log('Ticket impreso correctamente');
        return { ok: true };
    } catch (error) {
        console.error('Error al imprimir:', error);
        return { ok: false, error: error.message };
    }
}

module.exports = { imprimirTicket };