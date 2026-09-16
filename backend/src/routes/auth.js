import express from 'express';
import {
  loginUsuario,
  registerUsuario,
  googleLogin,
  obtenerPerfil,
  cambiarPassword
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Demasiados intentos. Intenta nuevamente más tarde.' }
});

router.post('/register', authLimiter, registerUsuario);
router.post('/login', authLimiter, loginUsuario);
router.post('/google', authLimiter, googleLogin);
router.get('/me', requireAuth, obtenerPerfil);
router.put('/change-password', requireAuth, cambiarPassword);

export default router;
