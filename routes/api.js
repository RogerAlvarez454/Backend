

const express = require('express');
const router = express.Router();

const auth = require('../controllers/authController');
const cliente = require('../controllers/clienteController');
const producto = require('../controllers/productoController');
const factura = require('../controllers/facturaController');

// Auth
router.post('/login', auth.login);

// Clientes
router.post('/clientes', cliente.crearCliente);
router.get('/clientes', cliente.obtenerClientes);
router.put('/clientes/:id', cliente.actualizarCliente);
router.delete('/clientes/:id', cliente.eliminarCliente);
// NUEVO ENDPOINT para obtener PDF
router.get('/facturas/pdf/:id', factura.obtenerFacturaPDF);
// Productos
router.post('/productos', producto.crearProducto);
router.get('/productos', producto.obtenerProductos);
router.put('/productos/:id', producto.actualizarProducto);
router.delete('/productos/:id', producto.eliminarProducto);

// Facturas
router.post('/facturas', factura.emitirFactura);
router.get('/facturas', factura.obtenerFacturas); // Obtener todas las facturas
router.get('/facturas/:id', factura.obtenerFactura); // Obtener factura por ID

module.exports = router;
