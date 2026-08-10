import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        alquileres: resolve(__dirname, 'alquileres.html'),
        ayuda: resolve(__dirname, 'ayuda.html'),
        clientes: resolve(__dirname, 'clientes.html'),
        compras: resolve(__dirname, 'compras.html'),
        informes: resolve(__dirname, 'informes.html'),
        listados: resolve(__dirname, 'listados.html'),
        productos: resolve(__dirname, 'productos.html'),
        proveedores: resolve(__dirname, 'proveedores.html'),
        ticket: resolve(__dirname, 'ticket.html'),
        ventas: resolve(__dirname, 'ventas.html')
      }
    }
  }
});