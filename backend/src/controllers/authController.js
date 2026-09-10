import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/dbClient.js';
import { verifyGoogleToken } from '../utils/googleOAuth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ibu-secret-change-me';
const DOMINIO_PERMITIDO = '@unibague.edu.co';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'pasantecgr@unibague.edu.co').toLowerCase();

const normalizarEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');
const obtenerRolUsuario = (email) => (normalizarEmail(email) === ADMIN_EMAIL ? 'ADMIN' : 'USER');

const serializarUsuario = (usuario) => ({
  id: usuario.id,
  email: usuario.email,
  nombre: usuario.nombre || usuario.email.split('@')[0],
  role: usuario.role || 'USER',
  google_id: usuario.google_id || null,
  created_at: usuario.created_at,
  updated_at: usuario.updated_at
});

const crearToken = (usuario) => jwt.sign(
  { sub: usuario.id, email: usuario.email, role: usuario.role || 'USER' },
  JWT_SECRET,
  { expiresIn: '8h' }
);

export const registerUsuario = async (req, res) => {
  try {
    const { email, password, nombre } = req.body || {};
    const correo = normalizarEmail(email);

    if (!correo || !correo.endsWith(DOMINIO_PERMITIDO)) {
      return res.status(400).json({
        success: false,
        error: `Solo se permiten correos con el dominio ${DOMINIO_PERMITIDO}`
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    const usuarioExistente = await prisma.usuarios.findUnique({ where: { email: correo } });
    if (usuarioExistente) {
      return res.status(409).json({
        success: false,
        error: 'Este correo ya está registrado'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const role = obtenerRolUsuario(correo);
    const usuario = await prisma.usuarios.create({
      data: {
        email: correo,
        nombre: nombre || correo.split('@')[0],
        password_hash: passwordHash,
        role
      }
    });

    const token = crearToken(usuario);

    res.status(201).json({
      success: true,
      token,
      user: serializarUsuario(usuario)
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body || {};
    console.log('[Google Login] Recibido body:', req.body ? { hasCredential: !!credential, email: req.body.email || null } : null);

    if (!credential) {
      console.error('[Google Login] No llega credential');
      return res.status(400).json({ success: false, error: 'Credential de Google requerido' });
    }

    console.log('[Google Login] Validando Google token...');
    const payload = await verifyGoogleToken(credential);
    const correo = normalizarEmail(payload.email);
    console.log('[Google Login] Email normalizado:', correo);

    if (!correo || !correo.endsWith(DOMINIO_PERMITIDO)) {
      console.error('[Google Login] Email rechazado por dominio:', correo);
      return res.status(403).json({
        success: false,
        error: `El inicio con Google solo está habilitado para correos ${DOMINIO_PERMITIDO}`
      });
    }

    const role = obtenerRolUsuario(correo);
    console.log('[Google Login] Intentando upsert usuario:', { email: correo, role, google_id: payload.sub });

    const usuario = await prisma.usuarios.upsert({
      where: { email: correo },
      update: {
        nombre: payload.name || correo.split('@')[0],
        google_id: payload.sub,
        role
      },
      create: {
        email: correo,
        nombre: payload.name || correo.split('@')[0],
        google_id: payload.sub,
        role,
        password_hash: null
      }
    });

    console.log('[Google Login] Usuario guardado:', { id: usuario.id, email: usuario.email });
    const token = crearToken(usuario);

    return res.json({ success: true, token, user: serializarUsuario(usuario) });
  } catch (error) {
    console.error('[Google Login] Error completo:', error);
    return res.status(401).json({
      success: false,
      error: error?.message || 'Token de Google inválido'
    });
  }
};

export const loginUsuario = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const correo = normalizarEmail(email);

    if (!correo || !correo.endsWith(DOMINIO_PERMITIDO)) {
      return res.status(400).json({
        success: false,
        error: `Solo se permiten correos con el dominio ${DOMINIO_PERMITIDO}`
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña es requerida'
      });
    }

    const usuario = await prisma.usuarios.findUnique({ where: { email: correo } });
    if (!usuario || !usuario.password_hash) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    const passwordCorrecta = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordCorrecta) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    const token = crearToken(usuario);

    res.json({
      success: true,
      token,
      user: serializarUsuario(usuario)
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const obtenerPerfil = async (req, res) => {
  try {
    const usuario = await prisma.usuarios.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        nombre: true,
        role: true,
        google_id: true,
        created_at: true,
        updated_at: true
      }
    });

    if (!usuario) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      user: serializarUsuario(usuario)
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const cambiarPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Debes enviar la contraseña actual y la nueva contraseña'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    const usuario = await prisma.usuarios.findUnique({ where: { id: req.user.id } });
    if (!usuario) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    if (!usuario.password_hash) {
      return res.status(400).json({
        success: false,
        error: 'Este usuario ingresó con Google y no tiene contraseña local.'
      });
    }

    const passwordCorrecta = await bcrypt.compare(currentPassword, usuario.password_hash);
    if (!passwordCorrecta) {
      return res.status(401).json({
        success: false,
        error: 'La contraseña actual es incorrecta'
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.usuarios.update({
      where: { id: usuario.id },
      data: { password_hash: passwordHash, updated_at: new Date() }
    });

    res.json({
      success: true,
      message: 'Contraseña actualizada correctamente'
    });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
