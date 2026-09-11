import express from 'express';
import { crearOrden, listarOrdenes, obtenerOrden, editarOrden } from '../controllers/ordenesController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(requireAuth);
// Solo administradores pueden acceder a las rutas de órdenes de trabajo
router.use(requireRole(['ADMIN']));

// Crear OT (solo ADMIN)
router.post('/', crearOrden);

// Listar OTs (solo ADMIN)
router.get('/', listarOrdenes);

// Obtener detalle (solo ADMIN)
router.get('/:id', obtenerOrden);

// Editar orden (solo ADMIN)
router.put('/:id', editarOrden);

export default router;
