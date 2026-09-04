// layout.js
// Genera el menú de navegación y el footer, y los inyecta en la página.
// Incluir con <script src="./layout.js"></script> en el <head> de TODAS las páginas,
// después de auth.js. Para agregar/quitar una página del menú, editar solo el array
// MENU_ITEMS de este archivo — no hace falta tocar cada .html.

const MENU_ITEMS = [
    { href: 'index.html', label: 'Archivo / Caja' },
    { href: 'productos.html', label: 'Artículos' },
    { href: 'ventas.html', label: 'Ventas' },
    { href: 'compras.html', label: 'Compras' },
    { href: 'clientes.html', label: 'Clientes' },
    { href: 'informes.html', label: 'Informes' },
    { href: 'proveedores.html', label: 'Proveedores' },
    { href: 'listados.html', label: 'Listados' },
    { href: 'alquileres.html', label: 'Alquileres' },
    { href: 'ayuda.html', label: 'Ayuda' }
];

function paginaActual() {
    const partes = window.location.pathname.split('/');
    const archivo = partes[partes.length - 1];
    return archivo === '' ? 'index.html' : archivo;
}

function construirMenuHTML() {
    const actual = paginaActual();
    const links = MENU_ITEMS.map(item => {
        const esActual = item.href === actual;
        const contenido = esActual ? `<strong>${item.label}</strong>` : item.label;
        return `<a href="${item.href}">${contenido}</a>`;
    }).join('\n        ');

    return `${links}
        <a href="#" onclick="cerrarSesion(); return false;" style="float: right;">Cerrar sesión</a>`;
}

function construirFooterHTML() {
    const anio = new Date().getFullYear();
    return `
        <footer style="margin-top: 30px; padding: 12px 0; border-top: 1px solid #d5e1cc; text-align: center; font-size: 12px; color: #6b7280;">
            Vida Plena - Insumos Hospitalarios &copy; ${anio}
        </footer>
    `;
}

function inyectarLayout() {
    // Menú: si ya existe un contenedor .menu-bar en la página, se reemplaza su contenido.
    // Si no existe, se crea uno al principio del <body>.
    let menuBar = document.querySelector('.menu-bar');
    if (!menuBar) {
        menuBar = document.createElement('div');
        menuBar.className = 'menu-bar';
        document.body.insertBefore(menuBar, document.body.firstChild);
    }
    menuBar.innerHTML = construirMenuHTML();

    // Footer: se agrega al final del body si todavía no existe uno inyectado por este script.
    if (!document.getElementById('layoutFooter')) {
        const footerWrapper = document.createElement('div');
        footerWrapper.id = 'layoutFooter';
        footerWrapper.innerHTML = construirFooterHTML();
        document.body.appendChild(footerWrapper);
    }
}

document.addEventListener('DOMContentLoaded', inyectarLayout);