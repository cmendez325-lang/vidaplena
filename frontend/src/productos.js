// Detecta automáticamente si estás en la web (Netlify) o en la app de escritorio (Electron/Local)
const API_BASE = window.location.hostname.includes('netlify.app') 
    ? 'https://vidaplena-9jb2.onrender.com' 
    : 'http://localhost:3001';

const tablaProductos = document.getElementById('tablaProductos');

async function cargarProductos() {
    if (!tablaProductos) return;

    try {
        const respuesta = await fetch(`${API_BASE}/productos`);
        
        if (!respuesta.ok) {
            throw new Error('Respuesta no OK del servidor');
        }

        const productos = await respuesta.json();
        tablaProductos.innerHTML = '';

        if (productos.length === 0) {
            tablaProductos.innerHTML = `<tr><td colspan="7" style="text-align: center;">No hay productos registrados.</td></tr>`;
            return;
        }

        const fragmento = document.createDocumentFragment();

        productos.forEach(p => {
            const fila = document.createElement('tr');
            
            fila.innerHTML = `
                <td>${p.imagen ? `<img src="${p.imagen}" width="40" style="border-radius:4px;">` : 'Sin imagen'}</td>
                <td>${p.codigo || ''}</td>
                <td>${p.nombre || ''}</td>
                <td>${p.departamento || ''}</td>
                <td>${p.stock || 0}</td>
                <td>$${p.precioVenta || p.precio || 0}</td>
                <td>
                    <button class="btn-icon btn-editar" onclick="editarProducto(${p.id})">✏️</button>
                    <button class="btn-icon btn-eliminar" onclick="eliminarProducto(${p.id})">🗑️</button>
                </td>
            `;
            
            fragmento.appendChild(fila);
        });

        tablaProductos.appendChild(fragmento);

    } catch (error) {
        console.error('Error al cargar productos:', error);
        tablaProductos.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">No se pudo conectar con el servidor. Verificá tu conexión o que la app esté corriendo.</td></tr>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();
});