import express from 'express';
import { listarUsuarios, actualizarRol, obtenerFuncionariosG3, obtenerOrganigrama, obtenerDependenciasInventario } from '../controllers/usuariosController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(requireAuth);
router.use(requireRole(['ADMIN']));

// Listar usuarios
router.get('/', listarUsuarios);
router.get('/g3', obtenerFuncionariosG3);
router.get('/dependencias', obtenerDependenciasInventario);
router.get('/organigrama', obtenerOrganigrama);

// Actualizar rol
router.put('/:id/role', actualizarRol);

export default router;
