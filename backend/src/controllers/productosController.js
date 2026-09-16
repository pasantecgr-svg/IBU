import prisma from '../utils/dbClient.js';
import { v4 as uuidv4 } from 'uuid';
import { enviarAlertaStockBajo } from '../utils/emailService.js';
import ExcelJS from 'exceljs';

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
  if (!producto) return false;
  const bajoCantidad = typeof producto.cantidad_disponible === 'number'
    && producto.cantidad_disponible > 0
    && producto.cantidad_disponible <= STOCK_MINIMO_ALERTA;
  const bajoMetraje = typeof producto.metraje_restante === 'number'
    && producto.metraje_restante <= 10
    && (typeof producto.metraje_total !== 'number'
      || producto.metraje_total <= 0
      || producto.metraje_restante / producto.metraje_total <= 0.1);
  return bajoCantidad || bajoMetraje;
};

const notificarStockBajo = async (producto) => {
  if (!esStockBajo(producto)) return null;

  console.warn(
    `ALERTA DE INVENTARIO: ${producto.nombre} queda con ${producto.cantidad_disponible} unidades y ${producto.metraje_restante ?? 'sin'} ${producto.unidad || ''}.`
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
    const { categoria, dependencia, busqueda } = req.query;
    const where = {};
    if (categoria) where.categoria_id = categoria;
    if (dependencia) where.dependencia_codigo = dependencia;
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

const columnasPlantilla = [
  'nombre', 'categoria', 'marca', 'modelo', 'numero_serie', 'cantidad_total',
  'unidad', 'metraje_total', 'metraje_restante', 'ubicacion', 'estado',
  'dependencia_codigo', 'dependencia_nombre',
  'activo_fijo', 'fecha_adquisicion', 'descripcion'
];

const normalizarEncabezado = (valor) => String(valor || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '_');

const normalizarNombreCategoria = (valor) => String(valor || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, ' ');

export const descargarPlantillaProductos = async (req, res) => {
  const categorias = await prisma.categorias.findMany({ orderBy: { nombre: 'asc' } });
  const workbook = new ExcelJS.Workbook();
  const hoja = workbook.addWorksheet('Productos');
  const hojaCategorias = workbook.addWorksheet('Categorias');
  hojaCategorias.getCell('A1').value = 'Categorías disponibles';
  categorias.forEach((categoria, index) => {
    hojaCategorias.getCell(`A${index + 2}`).value = categoria.nombre;
  });
  hojaCategorias.state = 'hidden';
  hoja.columns = columnasPlantilla.map((key) => ({ header: key, key, width: key.length < 14 ? 18 : 24 }));
  hoja.addRow({
    nombre: 'Cable UTP Cat 6',
    categoria: categorias[0]?.nombre || '',
    marca: 'Ejemplo',
    modelo: 'Cat 6',
    numero_serie: '',
    cantidad_total: 1,
    unidad: 'metros',
    metraje_total: 305,
    metraje_restante: 305,
    ubicacion: 'Almacén',
    estado: 'nuevo',
    activo_fijo: '',
    fecha_adquisicion: '2026-09-14',
    descripcion: 'Fila de ejemplo; reemplázala con tus datos'
  });
  hoja.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  hoja.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF174A7E' } };
  hoja.views = [{ state: 'frozen', ySplit: 1 }];
  const categoriaColumn = columnasPlantilla.indexOf('categoria') + 1;
  if (categorias.length) {
    for (let rowNumber = 2; rowNumber <= 1000; rowNumber += 1) {
      hoja.getCell(rowNumber, categoriaColumn).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: [`'Categorias'!$A$2:$A$${categorias.length + 1}`]
      };
    }
  }

  const instrucciones = workbook.addWorksheet('Instrucciones');
  instrucciones.columns = [{ header: 'Campo', key: 'campo', width: 24 }, { header: 'Descripción', key: 'descripcion', width: 80 }];
  instrucciones.addRows([
    { campo: 'nombre', descripcion: 'Obligatorio. Nombre del producto.' },
    { campo: 'categoria', descripcion: 'Obligatorio. Selecciona una categoría de la lista desplegable. No se crean categorías automáticamente.' },
    { campo: 'cantidad_total', descripcion: 'Obligatorio. Número entero mayor que cero.' },
    { campo: 'unidad', descripcion: 'Use metros para cables o unidades para equipos.' },
    { campo: 'metraje_total', descripcion: 'Opcional. Metros totales del cable.' },
    { campo: 'metraje_restante', descripcion: 'Opcional. Si se omite, se usa el metraje total.' },
    { campo: 'dependencia_codigo', descripcion: 'Opcional. Código de Redes, Sistemas de Información o Mantenimiento obtenido del middleware.' },
    { campo: 'dependencia_nombre', descripcion: 'Opcional. Nombre legible de la dependencia.' },
    { campo: 'estado', descripcion: 'Opcional: nuevo, usado, dañado o reparacion.' },
    { campo: 'fecha_adquisicion', descripcion: 'Opcional. Formato recomendado: AAAA-MM-DD.' }
  ]);
  instrucciones.getRow(1).font = { bold: true };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla_productos.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
};

export const importarProductos = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Debes seleccionar un archivo Excel' });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const hoja = workbook.getWorksheet('Productos') || workbook.worksheets[0];
    if (!hoja) return res.status(400).json({ success: false, error: 'El archivo no contiene una hoja de productos' });

    const encabezados = {};
    hoja.getRow(1).eachCell((cell, index) => { encabezados[normalizarEncabezado(cell.value)] = index; });
    const faltantes = ['nombre', 'categoria', 'cantidad_total'].filter((campo) => !encabezados[campo]);
    if (faltantes.length) return res.status(400).json({ success: false, error: `Faltan columnas obligatorias: ${faltantes.join(', ')}` });

    const categorias = await prisma.categorias.findMany();
    const categoriasPorNombre = new Map(categorias.map((categoria) => [normalizarNombreCategoria(categoria.nombre), categoria.id]));
    const filas = [];
    const errores = [];
    hoja.eachRow((row, numeroFila) => {
      if (numeroFila === 1) return;
      const valor = (campo) => row.getCell(encabezados[campo] || 0).value;
      const texto = (campo) => String(valor(campo) ?? '').trim();
      if (!texto('nombre') && !texto('categoria') && !texto('cantidad_total')) return;
      const nombre = texto('nombre');
      const categoriaTexto = texto('categoria');
      const categoria = categoriasPorNombre.get(normalizarNombreCategoria(categoriaTexto));
      const cantidad = Number(valor('cantidad_total'));
      const metrajeTotal = texto('metraje_total') ? Number(valor('metraje_total')) : null;
      const metrajeRestante = texto('metraje_restante') ? Number(valor('metraje_restante')) : metrajeTotal;
      if (!nombre || !categoria || !Number.isInteger(cantidad) || cantidad < 1) {
        const detalleCategoria = categoriaTexto && !categoria ? ` categoría "${categoriaTexto}" no existe` : '';
        errores.push(`Fila ${numeroFila}: nombre,${detalleCategoria || ' categoría'} o cantidad_total inválidos`);
        return;
      }
      if (metrajeTotal !== null && (!Number.isInteger(metrajeTotal) || metrajeTotal < 0 || metrajeRestante < 0 || metrajeRestante > metrajeTotal)) {
        errores.push(`Fila ${numeroFila}: metraje inválido`);
        return;
      }
      filas.push({
        id: uuidv4(), nombre, categoria_id: categoria,
        marca: texto('marca') || null, modelo: texto('modelo') || null,
        numero_serie: texto('numero_serie') || null, cantidad_total: cantidad,
        cantidad_disponible: cantidad, unidad: texto('unidad') || null,
        metraje_total: metrajeTotal, metraje_restante: metrajeRestante,
        ubicacion: texto('ubicacion') || 'Almacén', estado: texto('estado') || 'nuevo',
        dependencia_codigo: texto('dependencia_codigo') || null,
        dependencia_nombre: texto('dependencia_nombre') || null,
        activo_fijo: texto('activo_fijo') || null,
        fecha_adquisicion: texto('fecha_adquisicion') ? new Date(valor('fecha_adquisicion')) : new Date(),
        descripcion: texto('descripcion') || null, created_at: new Date(), updated_at: new Date()
      });
    });

    if (!filas.length) return res.status(400).json({ success: false, error: 'No hay filas válidas para importar', errores });
    await prisma.productos.createMany({ data: filas });
    res.status(201).json({ success: true, creados: filas.length, errores });
  } catch (error) {
    console.error('Error importarProductos:', error);
    res.status(500).json({ success: false, error: 'No se pudo procesar el archivo Excel' });
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
      unidad,
      metraje_total,
      metraje_restante,
      ubicacion,
      estado,
      fecha_adquisicion,
      foto_url,
      descripcion,
      dependencia_codigo,
      dependencia_nombre
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

    const metrajeTotalNum = metraje_total === undefined || metraje_total === '' ? null : Number(metraje_total);
    const metrajeRestanteNum = metraje_restante === undefined || metraje_restante === ''
      ? metrajeTotalNum
      : Number(metraje_restante);
    if (metrajeTotalNum !== null && (!Number.isInteger(metrajeTotalNum) || metrajeTotalNum < 0 || metrajeRestanteNum < 0 || metrajeRestanteNum > metrajeTotalNum)) {
      return res.status(400).json({ success: false, error: 'El metraje debe ser un entero válido y el restante no puede superar el total' });
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
        unidad: unidad || null,
        metraje_total: metrajeTotalNum,
        metraje_restante: metrajeRestanteNum,
        ubicacion: ubicacion || 'Almacén',
        estado: estado || 'nuevo',
        fecha_adquisicion: fecha_adquisicion ? new Date(fecha_adquisicion) : new Date(),
        foto_url: foto_url || null,
            descripcion: descripcion || null,
            dependencia_codigo: dependencia_codigo || null,
            dependencia_nombre: dependencia_nombre || null,
            activo_fijo: req.body.activo_fijo || null,
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
      'unidad',
      'metraje_total',
      'metraje_restante',
      'ubicacion',
      'estado',
      'fecha_adquisicion',
      'foto_url',
      'activo_fijo',
      'descripcion',
      'dependencia_codigo',
      'dependencia_nombre'
    ];

    const updates = {};
    allowedFields.forEach((f) => {
      if (Object.prototype.hasOwnProperty.call(body, f)) updates[f] = body[f];
    });

    updates.updated_at = new Date();

    ['metraje_total', 'metraje_restante'].forEach((field) => {
      if (updates[field] === '') {
        updates[field] = null;
        return;
      }
      if (updates[field] === null || updates[field] === undefined) return;
      updates[field] = Number(updates[field]);
    });
    if (updates.metraje_total !== undefined && updates.metraje_restante === undefined) {
      updates.metraje_restante = updates.metraje_total;
    }
    if (updates.metraje_total !== undefined && (!Number.isInteger(updates.metraje_total) || updates.metraje_total < 0)) {
      return res.status(400).json({ success: false, error: 'El metraje total debe ser un entero no negativo' });
    }
    if (updates.metraje_restante !== undefined && (!Number.isInteger(updates.metraje_restante) || updates.metraje_restante < 0 || (updates.metraje_total !== undefined && updates.metraje_restante > updates.metraje_total))) {
      return res.status(400).json({ success: false, error: 'El metraje restante no es válido' });
    }

    // Si se actualiza cantidad_total y no hay cantidad_disponible, calcularla
    if (updates.cantidad_total && updates.cantidad_disponible === undefined) {
      const productoActual = await prisma.productos.findUnique({ where: { id }, select: { cantidad_disponible: true } });
      if (productoActual) {
        updates.cantidad_disponible = updates.cantidad_total;
      }
    }

    // Do not persist `stock_estado` to avoid schema mismatch; compute it in responses

    const producto = await prisma.productos.update({ where: { id }, data: updates });
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

    const alerta = await notificarStockBajo(producto);

    res.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      producto: {
        ...producto,
        stock_estado: calcularStockEstado(producto.cantidad_disponible),
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

    const producto = await prisma.productos.findUnique({
      where: { id },
      select: { id: true, nombre: true }
    });
    if (!producto) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }

    const usosEnOrdenes = await prisma.ot_items.count({ where: { producto_id: id } });
    if (usosEnOrdenes > 0) {
      return res.status(409).json({
        success: false,
        error: `No se puede eliminar "${producto.nombre}" porque aparece en ${usosEnOrdenes} orden${usosEnOrdenes === 1 ? '' : 'es'} de trabajo. Puedes dejarlo con cantidad 0 para conservar el historial.`
      });
    }

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
    if (error?.code === 'P2003') {
      return res.status(409).json({
        success: false,
        error: 'No se puede eliminar este producto porque está relacionado con información histórica.'
      });
    }
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
