// Incluir este script (con <script src="auth.js"></script>) en el <head>
// de TODAS las páginas que deben estar protegidas por login,
// ANTES de que se cargue el resto del contenido de la página.
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
