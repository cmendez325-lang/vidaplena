async function enviarFactura(datosVenta, puntoVentaSeleccionado) {
  try {
    const respuesta = await fetch('https://vidaplena-9jb2.onrender.com/api/facturar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        venta: datosVenta,
        puntoVenta: puntoVentaSeleccionado
      })
    });

    const resultado = await respuesta.json();

    if (resultado.success) {
      alert(`¡Factura emitida con éxito! CAE: ${resultado.data.cae}`);
    } else {
      alert(`Error al emitir: ${resultado.error}`);
    }
  } catch (error) {
    console.error('Error de conexión con el servidor:', error);
    alert('No se pudo conectar con el servidor de Facturación.');
  }
}