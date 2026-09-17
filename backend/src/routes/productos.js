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
    const permitido = ['.xlsx', '.xls', '.xlsm', '.csv'].some((extension) => nombre.endsWith(extension));
    if (!permitido) {
      return cb(new Error('El archivo debe ser un Excel válido (.xlsx, .xls, .xlsm o .csv)'));
    }
    cb(null, true);
  }
});

router.get('/plantilla', descargarPlantillaProductos);
router.post('/importar', (req, res, next) => {
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

// CRUD completo para usuarios autenticados del middleware institucional
router.get('/', obtenerProductos);
router.get('/:id', obtenerProducto);
router.post('/', crearProducto);
router.put('/:id', actualizarProducto);
router.delete('/:id', eliminarProducto);

// Actualizar cantidad disponible
router.patch('/:id/cantidad', actualizarCantidadDisponible);

export default router;
