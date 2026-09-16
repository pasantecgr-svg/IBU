import express from 'express';
import {
  generarReportePDF,
  generarOrdenPDF,
  generarReporteExcel,
  obtenerEstadisticas,
  exportOrdenesExcel,
  exportOrdenesCSV
} from '../controllers/reportesController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(requireAuth);

// Reportes
router.get('/pdf', generarReportePDF);
router.get('/ordenes/:id/pdf', generarOrdenPDF);
router.get('/excel', generarReporteExcel);
// Exportar órdenes de trabajo
router.get('/ordenes/excel', exportOrdenesExcel);
router.get('/ordenes/csv', exportOrdenesCSV);

router.get('/estadisticas', obtenerEstadisticas);

export default router;
