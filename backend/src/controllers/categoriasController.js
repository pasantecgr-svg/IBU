import prisma from '../utils/dbClient.js';
import { v4 as uuidv4 } from 'uuid';

// Obtener todas las categorías
export const obtenerCategorias = async (req, res) => {
  try {
    const categorias = await prisma.categorias.findMany({ orderBy: { nombre: 'asc' } });
    res.json({ success: true, categorias: categorias || [] });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Obtener categoría con productos
export const obtenerCategoriaConProductos = async (req, res) => {
  try {
    const { id } = req.params;
    const categoria = await prisma.categorias.findUnique({
      where: { id },
      include: { productos: true }
    });

    if (!categoria) return res.status(404).json({ error: 'Categoría no encontrada' });

    res.json({ success: true, categoria });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Crear categoría
export const crearCategoria = async (req, res) => {
  try {
    const { nombre } = req.body;

    if (!nombre) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de la categoría es requerido'
      });
    }

    const categoria = await prisma.categorias.create({
      data: { id: uuidv4(), nombre, created_at: new Date() }
    });

    res.status(201).json({ success: true, message: 'Categoría creada exitosamente', categoria });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Actualizar categoría
export const actualizarCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre } = req.body;

    if (!nombre) {
      return res.status(400).json({
        success: false,
        error: 'El nombre es requerido'
      });
    }

    const categoria = await prisma.categorias.update({ where: { id }, data: { nombre } });
    res.json({ success: true, message: 'Categoría actualizada', categoria });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Eliminar categoría
export const eliminarCategoria = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si hay productos en la categoría
    const productos = await prisma.productos.findMany({ where: { categoria_id: id }, select: { id: true } });

    if (productos && productos.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar una categoría que contiene productos'
      });
    }

    await prisma.categorias.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Categoría eliminada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
