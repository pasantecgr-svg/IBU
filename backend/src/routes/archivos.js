import express from 'express';
import multer from 'multer';
import {
  obtenerArchivosPorProducto,
  subirArchivoADrive,
  eliminarArchivo,
  obtenerEnlaceDescarga
} from '../controllers/archivosController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(requireAuth);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    callback(null, allowed.includes(file.mimetype));
  }
});

// Obtener archivos de un producto
router.get('/producto/:producto_id', obtenerArchivosPorProducto);

// Subir archivo a Google Drive
router.post('/producto/:producto_id/subir', upload.single('file'), subirArchivoADrive);

// Eliminar archivo
router.delete('/:id', requireRole(['ADMIN']), eliminarArchivo);

// Obtener enlace de descarga
router.get('/:id/descargar', obtenerEnlaceDescarga);

export default router;
