import express from 'express';
import {
  obtenerProductos,
  obtenerProducto,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  actualizarCantidadDisponible
} from '../controllers/productosController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(requireAuth);

// CRUD completo
router.get('/', obtenerProductos);
router.get('/:id', obtenerProducto);
router.post('/', crearProducto);
router.put('/:id', actualizarProducto);
router.delete('/:id', eliminarProducto);

// Actualizar cantidad disponible
router.patch('/:id/cantidad', actualizarCantidadDisponible);

export default router;
