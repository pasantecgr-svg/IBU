import express from 'express';
import {
  generarReportePDF,
  generarReporteExcel,
  obtenerEstadisticas
} from '../controllers/reportesController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(requireAuth);

// Reportes
router.get('/pdf', generarReportePDF);
router.get('/excel', generarReporteExcel);

// Estadísticas
router.get('/estadisticas', obtenerEstadisticas);

export default router;
