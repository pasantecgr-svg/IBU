import jwt from 'jsonwebtoken';
import prisma from '../utils/dbClient.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ibu-secret-change-me';

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticación requerido'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = jwt.verify(token, JWT_SECRET);

    const usuario = await prisma.usuarios.findUnique({
      where: { id: payload.sub }
    });

    if (!usuario) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autorizado'
      });
    }

    req.user = usuario;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Sesión inválida o expirada'
    });
  }
};

export const requireRole = (roles = []) => async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'No autenticado' });
  }

  if (!roles.length || roles.includes(req.user.role)) {
    return next();
  }

  return res.status(403).json({ success: false, error: 'No tienes permisos suficientes' });
};
