import express from 'express';
import {
  obtenerCategorias,
  obtenerCategoriaConProductos,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria
} from '../controllers/categoriasController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(requireAuth);

// Lectura disponible para cualquier usuario autenticado
router.get('/', obtenerCategorias);
router.get('/:id/productos', obtenerCategoriaConProductos);
// Crear, editar y eliminar categorías: solo ADMIN
router.post('/', requireRole(['ADMIN']), crearCategoria);
router.put('/:id', requireRole(['ADMIN']), actualizarCategoria);
router.delete('/:id', requireRole(['ADMIN']), eliminarCategoria);

export default router;
