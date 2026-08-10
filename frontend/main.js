import './style.css';

let ticketItems = [];
let productoConsultaActual = null;
let itemSeleccionadoIndex = null;
let descuentoPorcentaje = 0;
let recargoPorcentaje = 0;
let callbackModalAceptar = null;

// Formateador de moneda
function fmt(n) {
    return (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function parsearPrecio(precioCrudo) {
    if (precioCrudo === undefined || precioCrudo === null) return 0;
    if (typeof precioCrudo === 'number') return Math.round(precioCrudo * 100) / 100;
    
    let str = String(precioCrudo)
        .replace(/\$/g, '')
        .replace(/\s+/g, '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim();

    return Math.round((parseFloat(str) || 0) * 100) / 100;
}

// Funciones expuestas globalmente
window.mostrarEnConsulta = function (prod) {
    if (!prod) return;
    productoConsultaActual = prod;

    const inputCodigo = document.getElementById('inputCodigo');
    const inputNombre = document.getElementById('inputNombre');
    const listaSugerencias = document.getElementById('listaSugerencias');

    if (inputCodigo) inputCodigo.value = prod.codigo || '';
    if (inputNombre) inputNombre.value = prod.descripcion || prod.nombre || '';
    if (listaSugerencias) listaSugerencias.style.display = 'none';

    let precioNum = parsearPrecio(prod.precio !== undefined ? prod.precio : (prod.precioUnitario || prod.precioVenta || 0));

    const contenedorImg = document.getElementById('contenedorImagenCaja');
    const imgProd = document.getElementById('imagenProductoCaja');
    const nombreProdCaja = document.getElementById('nombreProductoCaja');
    const lblSubtotal = document.getElementById('lblSubtotal');
    const lblTotal = document.getElementById('lblTotal');

    let imagenSrc = prod.idImg || prod.imagen || prod.foto || prod.urlImagen || '';
    if (typeof imagenSrc === 'string' && (imagenSrc.trim() === 'S/I' || imagenSrc.trim() === '')) {
        imagenSrc = '';
    }

    if (contenedorImg) {
        contenedorImg.style.display = (imagenSrc && imgProd) ? 'flex' : 'none';
        if (imagenSrc && imgProd) imgProd.src = imagenSrc.trim();
    }

    if (nombreProdCaja) nombreProdCaja.innerText = prod.descripcion || prod.nombre || '';

    if (ticketItems.length === 0) {
        if (lblSubtotal) lblSubtotal.innerText = '$ ' + fmt(precioNum);
        if (lblTotal) lblTotal.innerText = '$ ' + fmt(precioNum);
    }
};

window.agregarItemAlTicket = function (prod) {
    if (!prod) return;

    const inputCantidad = document.getElementById('inputCantidad');
    const inputCodigo = document.getElementById('inputCodigo');
    const inputNombre = document.getElementById('inputNombre');
    const listaSugerencias = document.getElementById('listaSugerencias');

    let cant = parseInt(inputCantidad?.value, 10);
    if (isNaN(cant) || cant <= 0) cant = 1;

    let precioUnitarioNum = parsearPrecio(prod.precio !== undefined ? prod.precio : (prod.precioUnitario || prod.precioVenta || 0));
    let cod = prod.codigo || 'S/N';
    let desc = prod.descripcion || prod.nombre || 'Producto Sin Nombre';

    let existente = ticketItems.find(item => String(item.codigo) === String(cod) && item.descripcion === desc);
    if (existente) {
        existente.cantidad += cant;
    } else {
        ticketItems.push({ codigo: cod, descripcion: desc, cantidad: cant, precioUnitario: precioUnitarioNum });
    }

    if (inputCodigo) inputCodigo.value = '';
    if (inputNombre) inputNombre.value = '';
    if (inputCantidad) inputCantidad.value = 1;
    productoConsultaActual = null;
    if (listaSugerencias) listaSugerencias.style.display = 'none';

    window.renderizarTicket();
    if (inputCodigo) inputCodigo.focus();
};

window.eliminarProducto = function (index) {
    ticketItems.splice(index, 1);
    if (itemSeleccionadoIndex === index) {
        itemSeleccionadoIndex = null;
    } else if (itemSeleccionadoIndex > index) {
        itemSeleccionadoIndex--;
    }
    window.renderizarTicket();
};

window.calcularTotalFinal = function () {
    let subtotal = ticketItems.reduce((acc, item) => acc + (item.cantidad * item.precioUnitario), 0);
    subtotal = Math.round(subtotal * 100) / 100;
    
    let ajusteDescuento = Math.round((subtotal * (descuentoPorcentaje / 100)) * 100) / 100;
    let ajusteRecargo = Math.round((subtotal * (recargoPorcentaje / 100)) * 100) / 100;
    
    return Math.round((subtotal + ajusteRecargo - ajusteDescuento) * 100) / 100;
};

window.renderizarTicket = function () {
    const tbody = document.getElementById('tablaTicket');
    if (!tbody) return;
    tbody.innerHTML = '';

    let subtotalGeneral = 0;

    ticketItems.forEach((item, index) => {
        let importe = Math.round((item.cantidad * item.precioUnitario) * 100) / 100;
        subtotalGeneral += importe;

        let tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        if (index === itemSeleccionadoIndex) {
            tr.style.backgroundColor = '#d1e7dd';
            tr.style.fontWeight = 'bold';
        }
        
        tr.addEventListener('click', () => {
            itemSeleccionadoIndex = index;
            window.renderizarTicket();
        });

        tr.innerHTML = `
            <td style="padding: 6px; text-align: center;">${index + 1}</td>
            <td style="padding: 6px;">${item.codigo}</td>
            <td style="padding: 6px;">${item.descripcion}</td>
            <td style="padding: 6px; text-align: center;">${item.cantidad}</td>
            <td style="padding: 6px;">$ ${fmt(item.precioUnitario)}</td>
            <td style="padding: 6px; font-weight: bold;">$ ${fmt(importe)}</td>
            <td style="padding: 6px; text-align: center;">
                <button class="btn-eliminar-item" style="background: #ff4d4d; color: white; border: none; border-radius: 4px; cursor: pointer; padding: 3px 7px; font-size: 12px;" title="Eliminar ítem">🗑️</button>
            </td>
        `;

        const btnEliminar = tr.querySelector('.btn-eliminar-item');
        btnEliminar?.addEventListener('click', (e) => {
            e.stopPropagation();
            window.eliminarProducto(index);
        });

        tbody.appendChild(tr);
    });

    subtotalGeneral = Math.round(subtotalGeneral * 100) / 100;
    let ajusteDescuento = Math.round((subtotalGeneral * (descuentoPorcentaje / 100)) * 100) / 100;
    let ajusteRecargo = Math.round((subtotalGeneral * (recargoPorcentaje / 100)) * 100) / 100;
    let totalFinal = Math.round((subtotalGeneral + ajusteRecargo - ajusteDescuento) * 100) / 100;

    const lblSubtotal = document.getElementById('lblSubtotal');
    const lblDescuento = document.getElementById('lblDescuento');
    const lblTotal = document.getElementById('lblTotal');

    if (lblSubtotal) lblSubtotal.innerText = '$ ' + fmt(subtotalGeneral);
    if (lblDescuento) lblDescuento.innerText = '$ ' + fmt(ajusteRecargo - ajusteDescuento);
    if (lblTotal) lblTotal.innerText = '$ ' + fmt(totalFinal);
};

window.nuevaVenta = function () {
    ticketItems = [];
    productoConsultaActual = null;
    itemSeleccionadoIndex = null;
    descuentoPorcentaje = 0;
    recargoPorcentaje = 0;
    window.renderizarTicket();
    
    const cont = document.getElementById('contenedorImagenCaja');
    if (cont) cont.style.display = 'none';
    
    const inputCodigo = document.getElementById('inputCodigo');
    if (inputCodigo) inputCodigo.focus();
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('Frontend cargado.');

    const inputCodigo = document.getElementById('inputCodigo');
    const inputNombre = document.getElementById('inputNombre');
    const listaSugerencias = document.getElementById('listaSugerencias');
    const btnBuscar = document.getElementById('btnBuscar');

    const hoy = new Date();
    const fechaStr = String(hoy.getDate()).padStart(2, '0') + '/' +
                     String(hoy.getMonth() + 1).padStart(2, '0') + '/' +
                     hoy.getFullYear();
    const txtFecha = document.getElementById('txtFecha');
    if (txtFecha) txtFecha.value = fechaStr;

    // Asegurar estilos para el contenedor de sugerencias desplegable
    if (listaSugerencias) {
        listaSugerencias.style.position = 'absolute';
        listaSugerencias.style.zIndex = '9999';
        listaSugerencias.style.backgroundColor = '#ffffff';
        listaSugerencias.style.border = '1px solid #ccc';
        listaSugerencias.style.maxHeight = '200px';
        listaSugerencias.style.overflowY = 'auto';
        listaSugerencias.style.width = '100%';
        listaSugerencias.style.boxShadow = '0px 4px 8px rgba(0,0,0,0.15)';
    }

    // Búsqueda en vivo
    inputNombre?.addEventListener('input', async (e) => {
        const query = e.target.value.trim();
        productoConsultaActual = null;

        if (!query || query.length < 1) {
            if (listaSugerencias) listaSugerencias.style.display = 'none';
            return;
        }

        try {
            const respuesta = await fetch(`http://localhost:3001/api/productos?buscar=${encodeURIComponent(query)}`);
            const productosDB = await respuesta.json();

            if (listaSugerencias) {
                listaSugerencias.innerHTML = '';
                if (Array.isArray(productosDB) && productosDB.length > 0) {
                    listaSugerencias.style.display = 'block';
                    productosDB.forEach(prod => {
                        let div = document.createElement('div');
                        div.style.padding = '8px 12px';
                        div.style.cursor = 'pointer';
                        div.style.borderBottom = '1px solid #eee';
                        div.style.display = 'flex';
                        div.style.justifyContent = 'space-between';

                        let precio = parsearPrecio(prod.precio !== undefined ? prod.precio : (prod.precioVenta || prod.precioUnitario || 0));
                        div.innerHTML = `<span>${prod.descripcion || prod.nombre}</span> <strong>$${fmt(precio)}</strong>`;

                        div.addEventListener('mouseenter', () => div.style.backgroundColor = '#f0f0f0');
                        div.addEventListener('mouseleave', () => div.style.backgroundColor = '#ffffff');
                        div.addEventListener('click', () => window.mostrarEnConsulta(prod));

                        listaSugerencias.appendChild(div);
                    });
                } else {
                    listaSugerencias.style.display = 'none';
                }
            }
        } catch (err) {
            console.error('Error al buscar productos:', err);
        }
    });

    async function procesarBusquedaOCarga() {
        let codigoTxt = inputCodigo?.value.trim() || '';
        let nombreTxt = inputNombre?.value.trim() || '';

        let prodAProcesar = productoConsultaActual;

        if (!prodAProcesar && (codigoTxt !== '' || nombreTxt !== '')) {
            try {
                const query = codigoTxt || nombreTxt;
                const respuesta = await fetch(`http://localhost:3001/api/productos?buscar=${encodeURIComponent(query)}`);
                const productosDB = await respuesta.json();

                if (Array.isArray(productosDB) && productosDB.length > 0) {
                    prodAProcesar = productosDB[0];
                }
            } catch (err) {
                console.error('Error al consultar producto:', err);
            }
        }

        if (prodAProcesar) {
            window.agregarItemAlTicket(prodAProcesar);
        } else if (codigoTxt !== '' || nombreTxt !== '') {
            window.agregarItemAlTicket({ codigo: codigoTxt || 'S/N', descripcion: nombreTxt || 'Producto Manual', precio: 0 });
        } else {
            alert('Busca o selecciona un producto primero para consultar/cargar.');
        }
    }

    btnBuscar?.addEventListener('click', (e) => {
        e.preventDefault();
        procesarBusquedaOCarga();
    });

    inputCodigo?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            procesarBusquedaOCarga();
        }
    });

    inputNombre?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            procesarBusquedaOCarga();
        }
    });

    // Ocultar sugerencias al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!inputNombre?.contains(e.target) && !listaSugerencias?.contains(e.target)) {
            if (listaSugerencias) listaSugerencias.style.display = 'none';
        }
    });
});
// --- Botones de acción del ticket ---
    document.getElementById('btnQuitar')?.addEventListener('click', () => {
        if (itemSeleccionadoIndex === null) {
            alert('Seleccioná un ítem de la tabla primero (hacé clic en la fila).');
            return;
        }
        window.eliminarProducto(itemSeleccionadoIndex);
    });

    document.getElementById('btnDescuento')?.addEventListener('click', () => {
        abrirModalInput('Aplicar Descuento', '% Descuento:', descuentoPorcentaje, (valor) => {
            descuentoPorcentaje = valor;
            recargoPorcentaje = 0;
            window.renderizarTicket();
        });
    });

    document.getElementById('btnRecargo')?.addEventListener('click', () => {
        abrirModalInput('Aplicar Recargo', '% Recargo:', recargoPorcentaje, (valor) => {
            recargoPorcentaje = valor;
            descuentoPorcentaje = 0;
            window.renderizarTicket();
        });
    });

    document.getElementById('btnCambiarCantidad')?.addEventListener('click', () => {
        if (itemSeleccionadoIndex === null) {
            alert('Seleccioná un ítem de la tabla primero.');
            return;
        }
        const item = ticketItems[itemSeleccionadoIndex];
        abrirModalInput('Cambiar Cantidad', 'Nueva cantidad:', item.cantidad, (valor) => {
            if (valor > 0) {
                item.cantidad = valor;
                window.renderizarTicket();
            }
        });
    });

    document.getElementById('btnCambiarPrecio')?.addEventListener('click', () => {
        if (itemSeleccionadoIndex === null) {
            alert('Seleccioná un ítem de la tabla primero.');
            return;
        }
        const item = ticketItems[itemSeleccionadoIndex];
        abrirModalInput('Cambiar Precio', 'Nuevo precio unitario:', item.precioUnitario, (valor) => {
            if (valor >= 0) {
                item.precioUnitario = valor;
                window.renderizarTicket();
            }
        });
    });

    document.getElementById('btnNuevaVenta')?.addEventListener('click', () => {
        if (ticketItems.length > 0 && !confirm('¿Iniciar una nueva venta? Se perderá el ticket actual.')) return;
        window.nuevaVenta();
    });

    // --- Modal de cobro (F2) ---
    const modalCobro = document.getElementById('modalCobro');

    document.getElementById('btnAbrirCobro')?.addEventListener('click', () => {
        if (ticketItems.length === 0) {
            alert('No hay artículos en el ticket.');
            return;
        }
        const total = window.calcularTotalFinal();
        document.getElementById('lblTotalPagar').innerText = '$ ' + fmt(total);
        document.getElementById('lblTotalPagado').innerText = '$ 0,00';
        document.getElementById('lblRestan').innerText = '$ ' + fmt(total);
        ['pagoEfectivo', 'pagoCredito', 'pagoCC', 'pagoDebito'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        if (modalCobro) modalCobro.style.display = 'flex';
    });

    document.getElementById('btnCerrarCobro')?.addEventListener('click', () => {
        if (modalCobro) modalCobro.style.display = 'none';
    });

    function actualizarTotalesPago() {
        const total = window.calcularTotalFinal();
        const efectivo = parseFloat(document.getElementById('pagoEfectivo')?.value) || 0;
        const credito = parseFloat(document.getElementById('pagoCredito')?.value) || 0;
        const cc = parseFloat(document.getElementById('pagoCC')?.value) || 0;
        const debito = parseFloat(document.getElementById('pagoDebito')?.value) || 0;
        const pagado = efectivo + credito + cc + debito;
        const restan = Math.round((total - pagado) * 100) / 100;

        document.getElementById('lblTotalPagado').innerText = '$ ' + fmt(pagado);
        document.getElementById('lblRestan').innerText = '$ ' + fmt(restan);
    }

    ['pagoEfectivo', 'pagoCredito', 'pagoCC', 'pagoDebito'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', actualizarTotalesPago);
    });

    document.getElementById('btnProcesarPago')?.addEventListener('click', async () => {
        // TODO: acá va tu lógica actual de facturación/ARCA (la que ya tenías conectada al backend)
        alert('Falta conectar btnProcesarPago con tu endpoint de facturación.');
    });

    document.getElementById('btnEscanearCamara')?.addEventListener('click', () => {
        const reader = document.getElementById('reader');
        if (reader) reader.style.display = reader.style.display === 'none' ? 'block' : 'none';
        // TODO: acá va tu init de Html5Qrcode si lo tenías
    });

    // --- Modal genérico de input (Descuento/Recargo/Cantidad/Precio) ---
    const modalInput = document.getElementById('modalInput');

    function abrirModalInput(titulo, label, valorActual, onAceptar) {
        document.getElementById('modalInputTitulo').innerText = titulo;
        document.getElementById('modalInputLabel').innerText = label;
        document.getElementById('modalInputValue').value = valorActual || '';
        callbackModalAceptar = onAceptar;
        if (modalInput) modalInput.style.display = 'flex';
        document.getElementById('modalInputValue')?.focus();
    }

    document.getElementById('modalInputBtnCancelar')?.addEventListener('click', () => {
        if (modalInput) modalInput.style.display = 'none';
        callbackModalAceptar = null;
    });

    document.getElementById('modalInputBtnAceptar')?.addEventListener('click', () => {
        const valor = parseFloat(document.getElementById('modalInputValue').value) || 0;
        if (callbackModalAceptar) callbackModalAceptar(valor);
        if (modalInput) modalInput.style.display = 'none';
        callbackModalAceptar = null;
    });