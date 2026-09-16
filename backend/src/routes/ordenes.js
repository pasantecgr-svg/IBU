import express from 'express';
import { crearOrden, listarOrdenes, obtenerOrden, editarOrden, eliminarOrden } from '../controllers/ordenesController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(requireAuth);
// Crear OT para cualquier usuario autenticado
router.post('/', crearOrden);

router.get('/', listarOrdenes);

router.get('/:id', obtenerOrden);

router.put('/:id', requireRole(['ADMIN']), editarOrden);

router.delete('/:id', requireRole(['ADMIN']), eliminarOrden);

export default router;
