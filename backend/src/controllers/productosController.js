import prisma from '../utils/dbClient.js';
import { v4 as uuidv4 } from 'uuid';
import { enviarAlertaStockBajo } from '../utils/emailService.js';

const STOCK_MINIMO_ALERTA = Number(process.env.STOCK_MINIMO_ALERTA || 5);

const calcularStockEstado = (cantidadDisponible) => {
  const cantidad = Number(cantidadDisponible || 0);

  if (cantidad === 0) return 'sin_stock';
  if (cantidad <= STOCK_MINIMO_ALERTA) return 'critico';
  if (cantidad <= STOCK_MINIMO_ALERTA * 2) return 'bajo';
  if (cantidad <= 25) return 'normal';
  return 'suficiente';
};

const esStockBajo = (producto) => {
  if (!producto || typeof producto.cantidad_disponible !== 'number') return false;
  return producto.cantidad_disponible > 0 && producto.cantidad_disponible <= STOCK_MINIMO_ALERTA;
};

const notificarStockBajo = async (producto) => {
  if (!esStockBajo(producto)) return null;

  console.warn(
    `⚠️ ALERTA DE STOCK BAJO: ${producto.nombre} queda con ${producto.cantidad_disponible} unidades disponibles.`
  );

  try {
    await enviarAlertaStockBajo(producto);
  } catch (error) {
    console.error('No se pudo enviar la notificación por email:', error);
  }

  return {
    stock_bajo: true,
    alerta_stock: `Quedan pocas unidades de ${producto.nombre}`
  };
};

// Obtener todos los productos
export const obtenerProductos = async (req, res) => {
  try {
    const { categoria, busqueda } = req.query;
    const where = {};
    if (categoria) where.categoria_id = categoria;
    if (busqueda) {
      where.OR = [
        { nombre: { contains: busqueda, mode: 'insensitive' } },
        { modelo: { contains: busqueda, mode: 'insensitive' } },
        { numero_serie: { contains: busqueda, mode: 'insensitive' } }
      ];
    }

    const productos = await prisma.productos.findMany({
      where,
      include: { categorias: true },
      orderBy: { created_at: 'desc' }
    });

    const productosConAlerta = (productos || []).map((producto) => ({
      ...producto,
      stock_bajo: esStockBajo(producto),
      stock_estado: calcularStockEstado(producto.cantidad_disponible),
      stock_label: {
        sin_stock: 'Sin stock',
        critico: 'Crítico',
        bajo: 'Bajo',
        normal: 'Normal',
        suficiente: 'Suficiente'
      }[calcularStockEstado(producto.cantidad_disponible)]
    }));

    const total = await prisma.productos.count({ where });

    res.json({ success: true, total, productos: productosConAlerta });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Obtener producto por ID
export const obtenerProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const producto = await prisma.productos.findUnique({
      where: { id },
      include: { categorias: true, archivos: true }
    });

    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

    res.json({ success: true, producto });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Crear nuevo producto
export const crearProducto = async (req, res) => {
  try {
    const {
      nombre,
      categoria_id,
      marca,
      modelo,
      numero_serie,
      cantidad_total,
      ubicacion,
      estado,
      fecha_adquisicion,
      foto_url,
      descripcion
    } = req.body;
    // Validación básica
    if (!nombre || !categoria_id || cantidad_total === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Nombre, categoría y cantidad son requeridos'
      });
    }

    // Coerción y validación de enteros (INT4)
    const MAX_INT4 = 2147483647;
    const cantidadTotalNum = Number(cantidad_total);
    if (!Number.isInteger(cantidadTotalNum) || cantidadTotalNum < 1 || cantidadTotalNum > MAX_INT4) {
      return res.status(400).json({ success: false, error: `cantidad_total debe ser un entero entre 1 y ${MAX_INT4}` });
    }

    const producto = await prisma.productos.create({
      data: {
        id: uuidv4(),
        nombre,
        categoria_id,
        marca: marca || null,
        modelo: modelo || null,
        numero_serie: numero_serie || null,
        cantidad_total: cantidadTotalNum,
        cantidad_disponible: cantidadTotalNum,
        ubicacion: ubicacion || 'Almacén',
        estado: estado || 'nuevo',
        stock_estado: calcularStockEstado(cantidadTotalNum),
        fecha_adquisicion: fecha_adquisicion ? new Date(fecha_adquisicion) : new Date(),
        foto_url: foto_url || null,
        descripcion: descripcion || null,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    const alerta = await notificarStockBajo(producto);

    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      producto: {
        ...producto,
        ...(alerta || { stock_bajo: false, alerta_stock: null })
      }
    });
  } catch (error) {
      console.error(error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Actualizar producto
export const actualizarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    // Filtrar solo campos permitidos para evitar enviar objetos relacionados (categorias, archivos)
    const allowedFields = [
      'nombre',
      'categoria_id',
      'marca',
      'modelo',
      'numero_serie',
      'cantidad_total',
      'cantidad_disponible',
      'ubicacion',
      'estado',
      'fecha_adquisicion',
      'foto_url',
      'descripcion'
    ];

    const updates = {};
    allowedFields.forEach((f) => {
      if (Object.prototype.hasOwnProperty.call(body, f)) updates[f] = body[f];
    });

    updates.updated_at = new Date();

    // Si se actualiza cantidad_total y no hay cantidad_disponible, calcularla
    if (updates.cantidad_total && updates.cantidad_disponible === undefined) {
      const productoActual = await prisma.productos.findUnique({ where: { id }, select: { cantidad_disponible: true } });
      if (productoActual) {
        updates.cantidad_disponible = updates.cantidad_total;
      }
    }

    if (updates.cantidad_disponible !== undefined) {
      updates.stock_estado = calcularStockEstado(updates.cantidad_disponible);
    }

    const producto = await prisma.productos.update({ where: { id }, data: updates });
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

    const alerta = await notificarStockBajo(producto);

    res.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      producto: {
        ...producto,
        ...(alerta || { stock_bajo: false, alerta_stock: null })
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Eliminar producto
export const eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;

    // Primero eliminar archivos asociados
    await prisma.archivos.deleteMany({ where: { producto_id: id } });

    // Luego eliminar producto
    await prisma.productos.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Producto eliminado exitosamente'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Actualizar cantidad disponible (para cuando se usa un equipo)
export const actualizarCantidadDisponible = async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad_disponible } = req.body;

    if (cantidad_disponible === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad disponible es requerida'
      });
    }

    const producto = await prisma.productos.update({
      where: { id },
      data: {
        cantidad_disponible,
        stock_estado: calcularStockEstado(cantidad_disponible),
        updated_at: new Date()
      }
    });

    const alerta = await notificarStockBajo(producto);

    res.json({
      success: true,
      message: 'Cantidad actualizada',
      producto: {
        ...producto,
        ...(alerta || { stock_bajo: false, alerta_stock: null })
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
