const Afip = require('@afipsdk/afip.js');

const ES_PRODUCCION = process.env.ARCA_PRODUCCION === 'true';

const afip = new Afip({
    CUIT: ES_PRODUCCION ? Number(process.env.ARCA_CUIT) : 20409378472,
    access_token: process.env.ARCA_ACCESS_TOKEN,
    production: ES_PRODUCCION,
    cert: ES_PRODUCCION ? process.env.ARCA_CERT_PATH : undefined,
    key: ES_PRODUCCION ? process.env.ARCA_KEY_PATH : undefined,
});

function mapearTipoComprobante(tipoTexto) {
    const mapa = {
        'Factura A': 1,
        'Factura B': 6,
        'Factura C': 11,
        'Ticket Fiscal': 6,
    };
    return mapa[tipoTexto] || 6;
}

function mapearTipoNotaCredito(tipoTexto) {
    const mapa = {
        'Nota de Crédito A': 3,
        'Nota de Crédito B': 8,
        'Nota de Crédito C': 13,
    };
    return mapa[tipoTexto] || 8;
}

function mapearDocTipo(condicionIva, docNro) {
    const docStr = String(docNro || '').replace(/\D/g, '');
    if (docStr.length === 11) return 80; // CUIT
    if (docStr.length === 8 || docStr.length === 7) return 96; // DNI
    if (condicionIva === 'Responsable Inscripto' || condicionIva === 'Monotributo') return 80;
    return 99; // Consumidor Final sin identificar
}

function mapearCondicionIvaReceptor(condicionIva) {
    const mapa = {
        'Responsable Inscripto': 1,
        'Exento': 4,
        'Consumidor Final': 5,
        'Monotributo': 6,
    };
    return mapa[condicionIva] || 5;
}

/**
 * Emite una Factura en ARCA
 */
async function emitirComprobante(venta, puntoVenta = 1) {
    const tipoCbte = mapearTipoComprobante(venta.tipoComprobante);
    const docTipo = mapearDocTipo(venta.condicionIva, venta.cuitCliente);
    const docNroRaw = String(venta.cuitCliente || '').replace(/\D/g, '');
    const docNro = docTipo === 99 ? 0 : Number(docNroRaw || 0);

    const ultimoAutorizado = await afip.ElectronicBilling.getLastVoucher(puntoVenta, tipoCbte);
    const numeroComprobante = ultimoAutorizado + 1;

    const fechaHoy = new Date();
    const fechaCbte = fechaHoy.toISOString().slice(0, 10).replace(/-/g, '');
    const percepcionArba = Math.round((venta.percepcionArba || 0) * 100) / 100;

    let importeNeto = Math.round((venta.total / 1.21) * 100) / 100;
    let importeIva = Math.round((venta.total - importeNeto) * 100) / 100;
    let importeTotal = Math.round((venta.total + percepcionArba) * 100) / 100;

    const datosComprobante = {
        CantReg: 1,
        PtoVta: puntoVenta,
        CbteTipo: tipoCbte,
        Concepto: 1,
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
        ImpTrib: percepcionArba,
        MonId: 'PES',
        MonCotiz: 1,
        Iva: [
            { Id: 5, BaseImp: importeNeto, Importe: importeIva }
        ],
        CondicionIVAReceptorId: mapearCondicionIvaReceptor(venta.condicionIva),
    };

    if (percepcionArba > 0) {
        datosComprobante.Tributos = [
            {
                Id: 2,
                Desc: 'Percepción IIBB ARBA',
                BaseImp: importeNeto,
                Alic: Math.round(((percepcionArba / importeNeto) * 100) * 100) / 100,
                Importe: percepcionArba
            }
        ];
    }

    const resultado = await afip.ElectronicBilling.createVoucher(datosComprobante);

    return {
        cae: resultado.CAE,
        vencimientoCae: resultado.CAEFchVto,
        numeroComprobante,
        puntoVenta,
        tipoComprobante: tipoCbte,
        importeTotal
    };
}

/**
 * Emite una Nota de Crédito vinculada a una Factura previa
 */
async function emitirNotaCredito(nc, puntoVenta = 1) {
    const tipoCbte = mapearTipoNotaCredito(nc.tipoComprobante);
    const docTipo = mapearDocTipo(nc.condicionIva, nc.cuitCliente);
    const docNroRaw = String(nc.cuitCliente || '').replace(/\D/g, '');
    const docNro = docTipo === 99 ? 0 : Number(docNroRaw || 0);

    const ultimoAutorizado = await afip.ElectronicBilling.getLastVoucher(puntoVenta, tipoCbte);
    const numeroComprobante = ultimoAutorizado + 1;

    const fechaHoy = new Date();
    const fechaCbte = fechaHoy.toISOString().slice(0, 10).replace(/-/g, '');
    const percepcionArba = Math.round((nc.percepcionArba || 0) * 100) / 100;

    const importeNeto = Math.round((nc.total / 1.21) * 100) / 100;
    const importeIva = Math.round((nc.total - importeNeto) * 100) / 100;
    const importeTotal = Math.round((nc.total + percepcionArba) * 100) / 100;

    const datosComprobante = {
        CantReg: 1,
        PtoVta: puntoVenta,
        CbteTipo: tipoCbte,
        Concepto: 1,
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
        ImpTrib: percepcionArba,
        MonId: 'PES',
        MonCotiz: 1,
        Iva: [
            { Id: 5, BaseImp: importeNeto, Importe: importeIva }
        ],
        CondicionIVAReceptorId: mapearCondicionIvaReceptor(nc.condicionIva),
        CbtesAsoc: [
            {
                Tipo: nc.comprobanteAsociado.tipoCbte,
                PtoVta: nc.comprobanteAsociado.puntoVenta,
                Nro: nc.comprobanteAsociado.numero
            }
        ]
    };

    if (percepcionArba > 0) {
        datosComprobante.Tributos = [
            {
                Id: 2,
                Desc: 'Percepción IIBB ARBA',
                BaseImp: importeNeto,
                Alic: Math.round(((percepcionArba / importeNeto) * 100) * 100) / 100,
                Importe: percepcionArba
            }
        ];
    }

    const resultado = await afip.ElectronicBilling.createVoucher(datosComprobante);

    return {
        cae: resultado.CAE,
        vencimientoCae: resultado.CAEFchVto,
        numeroComprobante,
        puntoVenta,
        tipoComprobante: tipoCbte,
        importeTotal
    };
}

module.exports = { 
    emitirComprobante, 
    emitirNotaCredito,
    mapearTipoComprobante, 
    mapearTipoNotaCredito,
    mapearDocTipo,
    mapearCondicionIvaReceptor 
};