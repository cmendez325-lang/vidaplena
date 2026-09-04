// Base de datos de fallback con estructura unificada
const productosEjemplo = [
    { codigo: '43', descripcion: 'BOLSO ESTAMPADO CON CORREA', departamento: 'SALUD', precio_venta: 33795.30, stock: 1 },
    { codigo: '12112025', descripcion: 'BOTA WALKER ABIERTA GRANDE', departamento: 'SALUD', precio_venta: 43234.27, stock: 1 },
    { codigo: '4032026', descripcion: 'BOTA WALKER CORTA ABIERTA MEDIA', departamento: 'SALUD', precio_venta: 43281.70, stock: 1 },
    { codigo: '7798068204654', descripcion: 'CABRESTILLO CHICO', departamento: 'SALUD', precio_venta: 29887.00, stock: 2 }
];

// Misma URL de backend que usa productos.html
const API_BASE = window.location.hostname === 'localhost'
    ? 'http://127.0.0.1:3001/api'
    : 'https://vidaplena-lt86.onrender.com/api';

// Estado global del ticket
window.ticketActual = window.ticketActual || [];

// Caché del catálogo (se llena desde la API al iniciar; localStorage/ejemplo son solo respaldo)
let productosCache = null;

// Normalizar texto eliminando tildes y caracteres especiales
function normalizarTexto(texto) {
    return String(texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

// Convierte el formato de un producto (venga de la API o de localStorage) al formato interno de la Caja
function mapearProducto(p) {
    return {
        codigo: String(p.codigo || p.id || ''),
        descripcion: p.descripcion || p.nombre || p.articulo || 'Sin descripción',
        precio_venta: Number(p.precio_venta || p.precio || p.precioVenta || 0),
        departamento: p.departamento || p.categoria || 'VARIOS',
        stock: p.stock !== undefined ? p.stock : 0,
        imagen: p.imagen || p.imagenUrl || p.foto || ''
    };
}

// Intenta traer el catálogo real desde el backend (misma fuente que productos.html)
async function cargarCatalogoDesdeAPI() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const resp = await fetch(`${API_BASE}/productos`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (resp.ok) {
            const datos = await resp.json();
            if (Array.isArray(datos) && datos.length > 0) {
                productosCache = datos.map(mapearProducto);
                console.log('Catálogo cargado desde la API:', productosCache.length, 'productos');
            }
        }
    } catch (err) {
        console.warn('No se pudo conectar con el backend en la nube. Usando respaldo local.', err);
    }
}

// Obtener catálogo: usa la caché de la API si ya está lista, si no cae a localStorage/ejemplo
function obtenerProductos() {
    if (productosCache !== null) return productosCache;

    try {
        const guardados = localStorage.getItem('listaProductos') || localStorage.getItem('productos');
        if (guardados) {
            const parsed = JSON.parse(guardados);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map(mapearProducto);
            }
        }
    } catch (err) {
        console.error('Error al leer localStorage:', err);
    }
    return productosEjemplo;
}

// Renderizar la tabla del ticket
function renderizarTabla() {
    const tbody = document.getElementById('tablaTicket');
    if (!tbody) return;

    tbody.innerHTML = '';
    let total = 0;

    window.ticketActual.forEach((item, index) => {
        const importe = item.cantidad * item.precio;
        total += importe;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.codigo}</td>
            <td>${item.nombre}</td>
            <td>${item.cantidad}</td>
            <td>$${item.precio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
            <td>$${importe.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
            <td><button style="color:red; cursor:pointer;" onclick="window.eliminarItem(${index})">X</button></td>
        `;
        tbody.appendChild(tr);
    });

    const lblTotal = document.getElementById('lblTotal');
    const lblSubtotal = document.getElementById('lblSubtotal');
    if (lblTotal) lblTotal.innerText = `$${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    if (lblSubtotal) lblSubtotal.innerText = `$${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

window.eliminarItem = function(index) {
    window.ticketActual.splice(index, 1);
    renderizarTabla();
};

function agregarProductoAlTicket(producto, cantidad = 1) {
    const codStr = String(producto.codigo);
    const existe = window.ticketActual.find(p => String(p.codigo) === codStr && codStr !== 'DEP');
    
    if (existe) {
        existe.cantidad += cantidad;
    } else {
        window.ticketActual.push({
            codigo: producto.codigo,
            nombre: producto.descripcion || producto.nombre,
            precio: Number(producto.precio_venta || producto.precio || 0),
            cantidad: cantidad
        });
    }
    renderizarTabla();
}

// Muestra u oculta la vista previa de producto seleccionado (solo imagen + precio, sin texto de nombre)
function mostrarPreviewProducto(producto) {
    const contenedor = document.getElementById('contenedorImagenCaja');
    const nombreEl = document.getElementById('nombreProductoCaja');
    const imagenEl = document.getElementById('imagenProductoCaja');
    const lblSubtotal = document.getElementById('lblSubtotal');
    const lblTotal = document.getElementById('lblTotal');

    if (!producto) {
        if (contenedor) contenedor.style.display = 'none';
        if (nombreEl) nombreEl.innerText = '';
        if (imagenEl) {
            imagenEl.src = '';
            imagenEl.style.display = 'none';
        }
        if (window.ticketActual.length === 0) {
            if (lblSubtotal) lblSubtotal.innerText = '$0,00';
            if (lblTotal) lblTotal.innerText = '$0,00';
        }
        return;
    }

    const precioVenta = Number(producto.precio_venta || producto.precio || 0);
    const precioFmt = precioVenta.toLocaleString('es-AR', { minimumFractionDigits: 2 });
    
    // Se deja vacío el texto del nombre para que no se muestre debajo de la imagen
    if (nombreEl) nombreEl.innerText = '';

    // Actualiza los montos del panel lateral si el ticket actual está vacío
    if (window.ticketActual.length === 0) {
        if (lblSubtotal) lblSubtotal.innerText = `$${precioFmt}`;
        if (lblTotal) lblTotal.innerText = `$${precioFmt}`;
    }

    if (imagenEl) {
        if (producto.imagen) {
            imagenEl.src = producto.imagen;
            imagenEl.style.display = 'block';
            imagenEl.onerror = () => { imagenEl.style.display = 'none'; };
        } else {
            imagenEl.src = '';
            imagenEl.style.display = 'none';
        }
    }

    if (contenedor) contenedor.style.display = 'block';
}

function iniciarNuevaVenta() {
    window.ticketActual = [];
    renderizarTabla();
    mostrarPreviewProducto(null);
    const inputCodigo = document.getElementById('inputCodigo');
    const inputNombre = document.getElementById('inputNombre');
    if (inputCodigo) inputCodigo.value = '';
    if (inputNombre) inputNombre.value = '';
    setTimeout(() => {
        if (inputCodigo) inputCodigo.focus();
    }, 0);
}

window.iniciarNuevaVenta = iniciarNuevaVenta;

window.agregarItemRapido = function(departamento) {
    const p = { codigo: 'DEP', descripcion: `Rubro: ${departamento}`, precio_venta: 0 };
    agregarProductoAlTicket(p, 1);
};

// Calcula el total del ticket actual
function calcularTotalTicket() {
    return window.ticketActual.reduce((acc, item) => acc + (item.cantidad * item.precio), 0);
}

// Recalcula lo pagado y lo que resta pagar dentro del modal de cobro
function recalcularPago() {
    const efectivo = parseFloat(document.getElementById('pagoEfectivo')?.value) || 0;
    const credito = parseFloat(document.getElementById('pagoCredito')?.value) || 0;
    const cc = parseFloat(document.getElementById('pagoCC')?.value) || 0;
    const debito = parseFloat(document.getElementById('pagoDebito')?.value) || 0;

    const totalPagado = efectivo + credito + cc + debito;
    
    // Tomar total a pagar del modal
    const lblTotalPagar = document.getElementById('lblTotalPagar');
    let totalTicket = 0;
    if (lblTotalPagar) {
        const txt = lblTotalPagar.innerText.replace('$', '').replace(/\./g, '').replace(',', '.').trim();
        totalTicket = parseFloat(txt) || 0;
    }

    const restan = totalTicket - totalPagado;

    const lblTotalPagado = document.getElementById('lblTotalPagado');
    const lblRestan = document.getElementById('lblRestan');

    if (lblTotalPagado) lblTotalPagado.innerText = `$ ${totalPagado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    if (lblRestan) lblRestan.innerText = `$ ${restan.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

// Inicialización cuando se carga el DOM
document.addEventListener('DOMContentLoaded', () => {
    // Traer catálogo real desde el backend apenas arranca la Caja
    cargarCatalogoDesdeAPI();

    const txtFecha = document.getElementById('txtFecha');
    if (txtFecha) {
        txtFecha.value = new Date().toLocaleDateString('es-AR');
    }

    const inputNombre = document.getElementById('inputNombre');
    const inputCodigo = document.getElementById('inputCodigo');
    const inputCantidad = document.getElementById('inputCantidad');
    const listaSugerencias = document.getElementById('listaSugerencias');
    const btnBuscar = document.getElementById('btnBuscar');

    // 1. Buscador dinámico por Nombre / Descripción / Código
    if (inputNombre && listaSugerencias) {
        inputNombre.addEventListener('input', (e) => {
            const busqueda = normalizarTexto(e.target.value.trim());
            
            if (busqueda.length < 1) {
                listaSugerencias.style.display = 'none';
                mostrarPreviewProducto(null);
                return;
            }

            const productos = obtenerProductos();
            const coincidencias = productos.filter(p => 
                normalizarTexto(p.descripcion).includes(busqueda) || 
                normalizarTexto(p.codigo).includes(busqueda)
            );

            listaSugerencias.innerHTML = '';

            if (coincidencias.length === 0) {
                const sinResultados = document.createElement('div');
                sinResultados.className = 'sugerencia-item';
                sinResultados.style.color = '#888';
                sinResultados.innerText = 'Sin coincidencias en el catálogo';
                listaSugerencias.appendChild(sinResultados);
            } else {
                coincidencias.slice(0, 15).forEach(p => { 
                    const item = document.createElement('div');
                    item.className = 'sugerencia-item';
                    item.innerHTML = `<span>${p.descripcion} <small style="color:#666;">(${p.codigo})</small></span> <strong>$${p.precio_venta.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong>`;
                    item.addEventListener('click', () => {
                        if (inputCodigo) inputCodigo.value = p.codigo;
                        inputNombre.value = p.descripcion;
                        listaSugerencias.style.display = 'none';
                        mostrarPreviewProducto(p);
                    });
                    listaSugerencias.appendChild(item);
                });
            }

            listaSugerencias.style.display = 'block';
        });

        document.addEventListener('click', (e) => {
            if (!inputNombre.contains(e.target) && !listaSugerencias.contains(e.target)) {
                listaSugerencias.style.display = 'none';
            }
        });
    }

    // 2. Búsqueda por Código de Barras con Enter
    if (inputCodigo) {
        inputCodigo.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const codigo = inputCodigo.value.trim();
                if (!codigo) return;

                const productos = obtenerProductos();
                const prod = productos.find(p => p.codigo.toLowerCase() === codigo.toLowerCase());

                if (prod) {
                    const cant = parseInt(inputCantidad?.value || '1', 10);
                    agregarProductoAlTicket(prod, cant);
                    inputCodigo.value = '';
                    mostrarPreviewProducto(null);
                } else {
                    alert('Producto no encontrado con el código: ' + codigo);
                }
            }
        });
    }

    // 3. Botón "Cargar"
    if (btnBuscar) {
        btnBuscar.addEventListener('click', () => {
            const codigo = inputCodigo?.value.trim();
            const nombre = normalizarTexto(inputNombre?.value.trim());
            const cant = parseInt(inputCantidad?.value || '1', 10);
            const productos = obtenerProductos();

            let prod = null;

            if (codigo) {
                prod = productos.find(p => p.codigo.toLowerCase() === codigo.toLowerCase());
            } else if (nombre) {
                prod = productos.find(p => normalizarTexto(p.descripcion).includes(nombre));
            }

            if (prod) {
                agregarProductoAlTicket(prod, cant);
                if (inputCodigo) inputCodigo.value = '';
                if (inputNombre) inputNombre.value = '';
                if (listaSugerencias) listaSugerencias.style.display = 'none';
                mostrarPreviewProducto(null);
            } else {
                alert('No se encontró ningún producto. Verifique que los productos estén cargados en la base de datos.');
            }
        });
    }

    // 4. Botón Nueva Venta (F4)
    const btnNuevaVenta = document.getElementById('btnNuevaVenta');
    if (btnNuevaVenta) {
        btnNuevaVenta.addEventListener('click', (e) => {
            e.preventDefault();
            iniciarNuevaVenta();
        });
    }

    // 5. Modal de Cobro (F2) - Única declaración unificada y robusta
    const btnAbrirCobro = document.getElementById('btnAbrirCobro');
    const btnCerrarCobro = document.getElementById('btnCerrarCobro');
    const modalCobro = document.getElementById('modalCobro');

    if (btnAbrirCobro && modalCobro) {
        btnAbrirCobro.addEventListener('click', () => {
            // Calcula desde el ticket actual o extrae del panel lateral si está vacío
            let totalTicket = calcularTotalTicket();
            if (totalTicket === 0) {
                const lblTotalPanel = document.getElementById('lblTotal');
                if (lblTotalPanel) {
                    const textoTotal = lblTotalPanel.innerText.replace('$', '').replace(/\./g, '').replace(',', '.').trim();
                    totalTicket = parseFloat(textoTotal) || 0;
                }
            }

            const lblTotalPagar = document.getElementById('lblTotalPagar');
            if (lblTotalPagar) {
                lblTotalPagar.innerText = `$ ${totalTicket.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
            }

            // Limpiar los campos de pago de la venta anterior
            ['pagoEfectivo', 'pagoCredito', 'pagoCC', 'pagoDebito'].forEach(id => {
                const input = document.getElementById(id);
                if (input) input.value = '';
            });

            recalcularPago();
            modalCobro.style.display = 'flex';
        });
    }

    if (btnCerrarCobro && modalCobro) {
        btnCerrarCobro.addEventListener('click', () => {
            modalCobro.style.display = 'none';
        });
    }

    // Recalcular en vivo mientras se escribe en los campos de pago
    ['pagoEfectivo', 'pagoCredito', 'pagoCC', 'pagoDebito'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.addEventListener('input', recalcularPago);
    });

    // 6. Atajos de Teclado
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F2') {
            e.preventDefault();
            if (btnAbrirCobro) btnAbrirCobro.click();
        }
        if (e.key === 'F4') {
            e.preventDefault();
            iniciarNuevaVenta();
        }
        if (e.key === 'F5') {
            e.preventDefault();
            window.location.href = 'productos.html';
        }
    });
});