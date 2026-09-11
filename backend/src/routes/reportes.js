import express from 'express';
import {
  generarReportePDF,
  generarReporteExcel,
  obtenerEstadisticas,
  exportOrdenesExcel,
  exportOrdenesCSV
} from '../controllers/reportesController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(requireAuth);

// Reportes
router.get('/pdf', generarReportePDF);
router.get('/excel', generarReporteExcel);
// Exportar órdenes de trabajo
router.get('/ordenes/excel', requireRole(['ADMIN']), exportOrdenesExcel);
router.get('/ordenes/csv', requireRole(['ADMIN']), exportOrdenesCSV);

// Estadísticas (dashboard) solo ADMIN
router.get('/estadisticas', requireRole(['ADMIN']), obtenerEstadisticas);

export default router;
