async function enviarFactura(datosVenta, puntoVentaSeleccionado) {
  try {
    const respuesta = await fetch('http://localhost:3000/api/facturar', {
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
      // Aquí puedes actualizar la interfaz o imprimir el ticket
    } else {
      alert(`Error al emitir: ${resultado.error}`);
    }
  } catch (error) {
    console.error('Error de conexión con el servidor:', error);
    alert('No se pudo conectar con el servidor de Facturación Méndez.');
  }
}