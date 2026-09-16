import prisma from '../utils/dbClient.js';
import axios from 'axios';

const FUNCTIONARIES_URL = process.env.FUNCTIONARIES_API_URL || 'http://integra.unibague.edu.co/functionariesChart/functionaries';
const DEPENDENCIES_URL = process.env.DEPENDENCIES_API_URL || 'http://integra.unibague.edu.co/functionariesChart/dependencies';
const ORGANIGRAMA_FILTRO = process.env.ORGANIGRAMA_FILTRO || 'Redes, Sistemas de Información y Mantenimiento';
const DEPENDENCIAS_INVENTARIO = [
  ['REDES E INFRAESTRUCTURA', 'REDES'],
  ['SISTEMAS DE INFORMACION', 'SISTEMAS DE LA INFORMACION'],
  ['MANTENIMIENTO']
];
const DEPENDENCIAS_RESPALDO = [
  { id: 'REDES_E_INFRAESTRUCTURA', nombre: 'Redes e Infraestructura', padreId: null, padreNombre: null },
  { id: 'SISTEMAS_DE_INFORMACION', nombre: 'Sistemas de Información', padreId: null, padreNombre: null },
  { id: 'MANTENIMIENTO', nombre: 'Mantenimiento', padreId: null, padreNombre: null }
];

const normalizarTexto = (valor) => String(valor || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toUpperCase();

const esDependenciaInventario = (valor) => {
  const nombre = normalizarTexto(valor);
  return DEPENDENCIAS_INVENTARIO.some((variantes) => variantes.some((dependencia) => nombre === dependencia || nombre.includes(dependencia)));
};

const cargarMiddleware = async (url) => {
  const token = process.env.FUNCTIONARIES_API_TOKEN;
  if (!token) throw new Error('FUNCTIONARIES_API_TOKEN no está configurado');
  const { data } = await axios.get(url, { params: { api_token: token }, timeout: 30000 });
  return Array.isArray(data) ? data : (data?.data || data?.results || []);
};

const cargarFuncionariosG3 = async () => {
  if (!process.env.FUNCTIONARIES_API_TOKEN) return [];
  const funcionarios = await cargarMiddleware(FUNCTIONARIES_URL);
  return funcionarios.filter((funcionario) => {
    const dependencias = [funcionario.faculty, funcionario.program]
      .filter(Boolean)
      .map(normalizarTexto);
    return dependencias.some(esDependenciaInventario);
  }).map((funcionario) => ({
    id: funcionario.identification || funcionario.code_user,
    nombre: funcionario.full_name || `${funcionario.name || ''} ${funcionario.last_name || ''}`.trim(),
    email: funcionario.email || '',
    dependenciaId: String(funcionario.dep_code || '').trim(),
    dependencia: funcionario.faculty || funcionario.program || 'Sin dependencia asignada',
    cargo: funcionario.position || 'Sin cargo',
    codigo: funcionario.code_user || '',
    sede: funcionario.sede || '',
    categoria: funcionario.category || ''
  }));
};

const cargarDependenciasInventario = async () => {
  if (!process.env.FUNCTIONARIES_API_TOKEN) return DEPENDENCIAS_RESPALDO;
  const dependencias = await cargarMiddleware(DEPENDENCIES_URL);
  return dependencias
    .filter((dependencia) => esDependenciaInventario(dependencia.dep_name))
    .map((dependencia) => ({
      id: String(dependencia.dep_code || '').trim(),
      nombre: dependencia.dep_name || 'Dependencia sin nombre',
      padreId: String(dependencia.dep_father || '').trim() || null,
      padreNombre: dependencia.dep_nom_father || null
    }))
    .filter((dependencia) => dependencia.id);
};

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

export const obtenerFuncionariosG3 = async (req, res) => {
  try {
    const funcionarios = await cargarFuncionariosG3();
    res.json({ success: true, fuente: process.env.FUNCTIONARIES_API_TOKEN ? 'middleware' : 'respaldo-local', filtro: ORGANIGRAMA_FILTRO, funcionarios });
  } catch (error) {
    console.error('Error obtenerFuncionariosG3:', error.message);
    res.status(502).json({ success: false, error: 'No se pudo cargar el personal G3 desde el middleware institucional' });
  }
};

export const obtenerDependenciasInventario = async (req, res) => {
  try {
    const dependencias = await cargarDependenciasInventario();
    res.json({ success: true, fuente: process.env.FUNCTIONARIES_API_TOKEN ? 'middleware' : 'respaldo-local', advertencia: process.env.FUNCTIONARIES_API_TOKEN ? null : 'Configura FUNCTIONARIES_API_TOKEN para sincronizar nombres, códigos y funcionarios institucionales.', filtro: ORGANIGRAMA_FILTRO, dependencias });
  } catch (error) {
    console.error('Error obtenerDependenciasInventario:', error.message);
    res.status(502).json({ success: false, error: 'No se pudieron cargar las dependencias del middleware institucional' });
  }
};

export const obtenerOrganigrama = async (req, res) => {
  try {
    const [funcionariosG3, dependencias] = await Promise.all([
      cargarFuncionariosG3(),
      cargarDependenciasInventario()
    ]);

    const nodes = new Map();
    dependencias.forEach((dependencia) => {
      const id = String(dependencia.dep_code || '').trim();
      if (!id) return;
      nodes.set(id, {
        id,
        nombre: dependencia.dep_name || 'Dependencia sin nombre',
        padreId: String(dependencia.dep_father || '').trim() || null,
        padreNombre: dependencia.dep_nom_father || null,
        funcionarios: [],
        hijos: []
      });
    });

    funcionariosG3.forEach((funcionario) => {
      const dependenciaId = funcionario.dependenciaId;
      if (!nodes.has(dependenciaId)) {
        nodes.set(dependenciaId, {
          id: dependenciaId || `sin-dependencia-${funcionario.identification || funcionario.code_user}`,
          nombre: funcionario.faculty || 'Sin dependencia asignada',
          padreId: null,
          padreNombre: null,
          funcionarios: [],
          hijos: []
        });
      }
      nodes.get(dependenciaId).funcionarios.push({ ...funcionario, dependencia: undefined });
    });

    const idsNecesarios = new Set(nodes.values()
      .filter((node) => node.funcionarios.length > 0)
      .map((node) => node.id));
    let cambio = true;
    while (cambio) {
      cambio = false;
      nodes.forEach((node) => {
        if (idsNecesarios.has(node.id) && node.padreId && !idsNecesarios.has(node.padreId)) {
          idsNecesarios.add(node.padreId);
          cambio = true;
        }
      });
    }
    nodes.forEach((node, id) => {
      if (!idsNecesarios.has(id)) nodes.delete(id);
    });

    const roots = [];
    nodes.forEach((node) => {
      const padre = node.padreId && nodes.get(node.padreId);
      if (padre && padre.id !== node.id) padre.hijos.push(node);
      else roots.push(node);
    });
    const ordenar = (lista) => lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).forEach((node) => {
      ordenar(node.hijos);
      node.funcionarios.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    });
    ordenar(roots);

    res.json({ success: true, fuente: process.env.FUNCTIONARIES_API_TOKEN ? 'middleware' : 'respaldo-local', filtro: ORGANIGRAMA_FILTRO, totalFuncionarios: funcionariosG3.length, totalDependencias: nodes.size, arbol: roots });
  } catch (error) {
    console.error('Error obtenerOrganigrama:', error.message);
    res.status(502).json({ success: false, error: 'No se pudo cargar el organigrama desde el middleware institucional' });
  }
};

export default { listarUsuarios, actualizarRol, obtenerFuncionariosG3, obtenerOrganigrama };
