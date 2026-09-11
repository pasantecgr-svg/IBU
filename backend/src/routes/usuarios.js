import express from 'express';
import { listarUsuarios, actualizarRol } from '../controllers/usuariosController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(requireAuth);
router.use(requireRole(['ADMIN']));

// Listar usuarios
router.get('/', listarUsuarios);

// Actualizar rol
router.put('/:id/role', actualizarRol);

export default router;
