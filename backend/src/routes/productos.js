import express from 'express';
import {
  obtenerProductos,
  obtenerProducto,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  actualizarCantidadDisponible
} from '../controllers/productosController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(requireAuth);

// CRUD completo
router.get('/', obtenerProductos);
router.get('/:id', obtenerProducto);
// Crear / editar / eliminar productos -> solo ADMIN
router.post('/', requireRole(['ADMIN']), crearProducto);
router.put('/:id', requireRole(['ADMIN']), actualizarProducto);
router.delete('/:id', requireRole(['ADMIN']), eliminarProducto);

// Actualizar cantidad disponible (solo ADMIN)
router.patch('/:id/cantidad', requireRole(['ADMIN']), actualizarCantidadDisponible);

export default router;
