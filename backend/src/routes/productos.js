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
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const nombre = String(file.originalname || '').toLowerCase();
    const permitido = nombre.endsWith('.xlsx') || nombre.endsWith('.xls') || nombre.endsWith('.csv');
    if (!permitido) {
      return cb(new Error('El archivo debe ser un Excel válido (.xlsx o .xls)'));
    }
    cb(null, true);
  }
});

router.get('/plantilla', descargarPlantillaProductos);
router.post('/importar', requireRole(['ADMIN']), (req, res, next) => {
  upload.single('archivo')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, error: 'El archivo supera el límite permitido (10 MB).' });
      }
      return res.status(400).json({ success: false, error: err.message || 'Archivo inválido' });
    }
    return next();
  });
}, importarProductos);

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
