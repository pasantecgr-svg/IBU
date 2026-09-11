import express from 'express';
import { enviarNotificacionOrden } from '../controllers/notificacionesController.js';
import { requireAuth, requireEmailSender } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(requireAuth);

// Envío manual de notificación para una orden (protegido)
router.post('/orden/:id', requireEmailSender, enviarNotificacionOrden);

export default router;
