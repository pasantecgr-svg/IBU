import express from 'express';
import {
  loginUsuario,
  registerUsuario,
  googleLogin,
  obtenerPerfil,
  cambiarPassword
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUsuario);
router.post('/login', loginUsuario);
router.post('/google', googleLogin);
router.get('/me', requireAuth, obtenerPerfil);
router.put('/change-password', requireAuth, cambiarPassword);

export default router;
