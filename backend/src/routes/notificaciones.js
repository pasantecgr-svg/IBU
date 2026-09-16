import express from 'express';
import { enviarNotificacionOrden, obtenerNotificaciones } from '../controllers/notificacionesController.js';
import { requireAuth, requireEmailSender } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', obtenerNotificaciones);

// Envío manual de notificación para una orden (protegido)
router.post('/orden/:id', requireEmailSender, enviarNotificacionOrden);

export default router;
