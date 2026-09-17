import jwt from 'jsonwebtoken';
import prisma from '../utils/dbClient.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET debe existir y tener al menos 32 caracteres');
}

const normalizarRol = (rol) => (typeof rol === 'string' ? rol.trim().toUpperCase() : '');

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

    req.user = {
      ...usuario,
      role: normalizarRol(usuario.role) || 'PERSONAL'
    };
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

  const rolesPermitidos = roles.map(normalizarRol);
  const rolUsuario = normalizarRol(req.user.role);
  const esPersonalCompat = (rolUsuario === 'USER' || rolUsuario === 'PERSONAL') && rolesPermitidos.includes('PERSONAL');

  if (!rolesPermitidos.length || rolesPermitidos.includes(rolUsuario) || esPersonalCompat) {
    return next();
  }

  return res.status(403).json({ success: false, error: 'No tienes permisos suficientes' });
};

export const requireEmailSender = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'No autenticado' });
  }

  const EMAIL_SENDERS = (process.env.EMAIL_SENDERS || 'IBU@unibague.edu.co')
    .split(',')
    .map((e) => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
    .filter(Boolean);

  const userEmail = (req.user.email || '').toString().trim().toLowerCase();
  if (!EMAIL_SENDERS.includes(userEmail)) {
    return res.status(403).json({ success: false, error: 'No tienes permiso para enviar correos' });
  }

  return next();
};
