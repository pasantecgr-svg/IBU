import prisma from '../utils/dbClient.js';

export const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await prisma.usuarios.findMany({
      select: {
        id: true,
        email: true,
        nombre: true,
        role: true,
        google_id: true,
        created_at: true,
        updated_at: true
      },
      orderBy: { created_at: 'desc' }
    });

    res.json({ success: true, usuarios });
  } catch (error) {
    console.error('Error listarUsuarios:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const actualizarRol = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body || {};

    if (!['ADMIN', 'USER'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Rol inválido' });
    }

    const usuario = await prisma.usuarios.findUnique({ where: { id } });
    if (!usuario) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    const actualizado = await prisma.usuarios.update({ where: { id }, data: { role } });
    res.json({ success: true, usuario: { id: actualizado.id, email: actualizado.email, role: actualizado.role } });
  } catch (error) {
    console.error('Error actualizarRol:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export default { listarUsuarios, actualizarRol };
