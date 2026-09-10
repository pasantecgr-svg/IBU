import express from 'express';
import {
  obtenerCategorias,
  obtenerCategoriaConProductos,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria
} from '../controllers/categoriasController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(requireAuth);

// CRUD
router.get('/', obtenerCategorias);
router.get('/:id/productos', obtenerCategoriaConProductos);
router.post('/', crearCategoria);
router.put('/:id', actualizarCategoria);
router.delete('/:id', eliminarCategoria);

export default router;
