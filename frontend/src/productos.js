const API_URL = 'https://vidaplena-9jb2.onrender.com/api';
const tablaProductos = document.getElementById('tablaProductos');

async function cargarProductos() {
  if (!tablaProductos) return;

  try {
    const respuesta = await fetch(`${API_URL}/productos`);
    const productos = await respuesta.json();
    
    tablaProductos.innerHTML = '';
    
    if (productos.length === 0) {
      tablaProductos.innerHTML = `<tr><td colspan="6" style="text-align: center;">No hay productos registrados.</td></tr>`;
      return;
    }

    const fragmento = document.createDocumentFragment();

    productos.forEach(p => {
      const fila = document.createElement('tr');
      
      fila.innerHTML = `
        <td>${p.codigo_barras || '-'}</td>
        <td><input type="text" value="${p.nombre || ''}" data-id="${p.id}" class="input-nombre" style="width: 100%; padding: 6px;"></td>
        <td><input type="number" value="${p.precio_costo ?? 0}" data-id="${p.id}" class="input-costo" style="width: 80px; padding: 6px;"></td>
        <td><input type="number" value="${p.precio_venta ?? p.precio ?? 0}" data-id="${p.id}" class="input-venta" style="width: 80px; padding: 6px;"></td>
        <td><input type="number" value="${p.stock_actual ?? p.stock ?? 0}" data-id="${p.id}" class="input-stock" style="width: 60px; padding: 6px;"></td>
        <td>
          <button onclick="guardarCambios(${p.id})" style="background-color: #28a745; color: white; border: none; padding: 6px 10px; cursor: pointer; border-radius: 4px;">Guardar</button>
          <button onclick="eliminarProducto(${p.id})" style="background-color: #dc3545; color: white; border: none; padding: 6px 10px; cursor: pointer; border-radius: 4px; margin-left: 5px;">Borrar</button>
        </td>
      `;
      
      fragmento.appendChild(fila);
    });

    tablaProductos.appendChild(fragmento);
  } catch (error) {
    console.error('Error al cargar productos:', error);
  }
}

window.guardarCambios = async function(id) {
  const inputNombre = document.querySelector(`input.input-nombre[data-id="${id}"]`);
  if (!inputNombre) return;
  
  const fila = inputNombre.closest('tr');
  const nombre = fila.querySelector('.input-nombre').value;
  const precio_costo = parseFloat(fila.querySelector('.input-costo').value) || 0;
  const precio_venta = parseFloat(fila.querySelector('.input-venta').value) || 0;
  const stock_actual = parseInt(fila.querySelector('.input-stock').value) || 0;

  try {
    const respuesta = await fetch(`${API_URL}/productos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        nombre, 
        precio: precio_venta, 
        precio_costo, 
        precio_venta, 
        stock: stock_actual, 
        stock_actual 
      })
    });

    if (respuesta.ok) {
      alert('¡Modificado con éxito!');
      cargarProductos();
    } else {
      alert('Error al actualizar el producto.');
    }
  } catch (error) {
    console.error('Error de red:', error);
  }
};

window.eliminarProducto = async function(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) return;

  try {
    const respuesta = await fetch(`${API_URL}/productos/${id}`, {
      method: 'DELETE'
    });

    if (respuesta.ok) {
      cargarProductos();
    } else {
      alert('Error al eliminar el producto.');
    }
  } catch (error) {
    console.error('Error de red:', error);
  }
};

cargarProductos();