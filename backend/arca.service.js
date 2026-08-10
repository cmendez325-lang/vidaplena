// backend/arca.service.js
// Módulo de integración con ARCA (ex AFIP) usando afip.js (AfipSDK).
// En homologación (testing) no hace falta certificado propio: afip.js
// trae uno de prueba con el CUIT de testing 20409378472.
// Cuando tu cliente te pase su certificado real, solo cambiás las
// variables de entorno (ver .env.example más abajo) y pasa a producción.

const Afip = require('@afipsdk/afip.js');

const ES_PRODUCCION = process.env.ARCA_PRODUCCION === 'true';

// En homologación, afip.js ignora cert/key y usa los suyos de prueba.
// En producción, hay que pasarle el CUIT real y las rutas a los archivos.
const afip = new Afip({
    CUIT: ES_PRODUCCION ? Number(process.env.ARCA_CUIT) : 20409378472,
    access_token: process.env.ARCA_ACCESS_TOKEN,
    production: ES_PRODUCCION,
    cert: ES_PRODUCCION ? process.env.ARCA_CERT_PATH : undefined,
    key: ES_PRODUCCION ? process.env.ARCA_KEY_PATH : undefined,
});

/**
 * Mapea el tipo de comprobante del frontend ("Factura A", "Factura B", "Ticket Fiscal")
 * al código numérico que espera ARCA.
 */
function mapearTipoComprobante(tipoTexto) {
    const mapa = {
        'Factura A': 1,
        'Factura B': 6,
        'Ticket Fiscal': 6, // Se emite como Factura B para Consumidor Final
    };
    return mapa[tipoTexto] || 6;
}

/**
 * Mapea la condición de IVA del cliente al código de "Doc Tipo" de ARCA.
 * Consumidor Final sin CUIT/DNI -> DocTipo 99 (Consumidor Final, sin identificar)
 */
function mapearDocTipo(condicionIva) {
    if (condicionIva === 'Responsable Inscripto' || condicionIva === 'Monotributo') {
        return 80; // CUIT
    }
    return 99; // Consumidor Final sin identificar
}

/**
 * Mapea la condición de IVA del cliente al código "CondicionIVAReceptorId"
 * que exige ARCA desde la RG 5616/2024 en todo comprobante electrónico.
 */
function mapearCondicionIvaReceptor(condicionIva) {
    const mapa = {
        'Responsable Inscripto': 1,
        'Exento': 4,
        'Consumidor Final': 5,
        'Monotributo': 6,
    };
    return mapa[condicionIva] || 5; // Por defecto: Consumidor Final
}

/**
 * Solicita el CAE a ARCA para una venta.
 * @param {Object} venta
 * @param {number} venta.total - Importe total de la venta
 * @param {string} venta.tipoComprobante - "Factura A" | "Factura B" | "Ticket Fiscal"
 * @param {string} venta.condicionIva - Condición IVA del cliente
 * @param {string} [venta.cuitCliente] - CUIT del cliente (obligatorio si es Factura A o RI)
 * @param {number} [puntoVenta] - Punto de venta habilitado en ARCA
 */
async function emitirComprobante(venta, puntoVenta = 1) {
    const tipoCbte = mapearTipoComprobante(venta.tipoComprobante);
    const docTipo = mapearDocTipo(venta.condicionIva);
    const docNro = docTipo === 99 ? 0 : (venta.cuitCliente || 0);

    // Obtiene el próximo número de comprobante disponible
    const ultimoAutorizado = await afip.ElectronicBilling.getLastVoucher(puntoVenta, tipoCbte);
    const numeroComprobante = ultimoAutorizado + 1;

    const fechaHoy = new Date();
    const fechaCbte = fechaHoy.toISOString().slice(0, 10).replace(/-/g, '');

    // Importes: si es Factura B/C a Consumidor Final, el total ya incluye IVA (21%)
    const importeTotal = Math.round(venta.total * 100) / 100;
    const importeNeto = Math.round((importeTotal / 1.21) * 100) / 100;
    const importeIva = Math.round((importeTotal - importeNeto) * 100) / 100;

    const datosComprobante = {
        CantReg: 1,
        PtoVta: puntoVenta,
        CbteTipo: tipoCbte,
        Concepto: 1, // Productos
        DocTipo: docTipo,
        DocNro: docNro,
        CbteDesde: numeroComprobante,
        CbteHasta: numeroComprobante,
        CbteFch: parseInt(fechaCbte, 10),
        ImpTotal: importeTotal,
        ImpTotConc: 0,
        ImpNeto: importeNeto,
        ImpOpEx: 0,
        ImpIVA: importeIva,
        ImpTrib: 0,
        MonId: 'PES',
        MonCotiz: 1,
        Iva: [
            { Id: 5, BaseImp: importeNeto, Importe: importeIva } // 21%
        ],
        CondicionIVAReceptorId: mapearCondicionIvaReceptor(venta.condicionIva),
    };

    const resultado = await afip.ElectronicBilling.createVoucher(datosComprobante);

    return {
        cae: resultado.CAE,
        vencimientoCae: resultado.CAEFchVto,
        numeroComprobante,
        puntoVenta,
        tipoComprobante: tipoCbte,
    };
}

module.exports = { emitirComprobante, mapearTipoComprobante, mapearDocTipo };