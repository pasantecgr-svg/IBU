import express from 'express';
import {
  obtenerProductos,
  obtenerProducto,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  actualizarCantidadDisponible,
  descargarPlantillaProductos,
  importarProductos
} from '../controllers/productosController.js';
import multer from 'multer';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(requireAuth);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/plantilla', descargarPlantillaProductos);
router.post('/importar', requireRole(['ADMIN']), upload.single('archivo'), importarProductos);

// CRUD completo
router.get('/', obtenerProductos);
router.get('/:id', obtenerProducto);
// Las operaciones de escritura requieren administración.
router.post('/', requireRole(['ADMIN']), crearProducto);
router.put('/:id', requireRole(['ADMIN']), actualizarProducto);
router.delete('/:id', requireRole(['ADMIN']), eliminarProducto);

// Actualizar cantidad disponible (solo ADMIN)
router.patch('/:id/cantidad', actualizarCantidadDisponible);

export default router;
