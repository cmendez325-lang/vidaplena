// Incluir este script (con <script src="./src/auth.js"></script>) en el <head>
// de TODAS las páginas que deben estar protegidas por login (index.html, productos.html,
// listados.html, etc.), ANTES de que se cargue main.js o cualquier otro script que
// haga fetch al backend. NO incluir este script en login.html.
(function () {
    const token = localStorage.getItem('vidaplena_token');
    if (!token) {
        window.location.href = 'login.html';
    }
})();

// Helper para hacer fetch con el token ya incluido.
// Reemplaza a `fetch(url, opciones)` por `fetchConAuth(url, opciones)` en el resto del código.
async function fetchConAuth(url, opciones = {}) {
    const token = localStorage.getItem('vidaplena_token');

    const headers = {
        ...(opciones.headers || {}),
        'Authorization': `Bearer ${token}`
    };

    const resp = await fetch(url, { ...opciones, headers });

    if (resp.status === 401) {
        localStorage.removeItem('vidaplena_token');
        window.location.href = 'login.html';
        throw new Error('Sesión expirada. Volvé a iniciar sesión.');
    }

    return resp;
}

function cerrarSesion() {
    localStorage.removeItem('vidaplena_token');
    window.location.href = 'login.html';
}