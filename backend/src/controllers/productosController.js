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

const notificarStockBajo = async (producto, destinatario) => {
  if (!esStockBajo(producto)) return null;

  console.warn(
    `ALERTA DE INVENTARIO: ${producto.nombre} queda con ${producto.cantidad_disponible} unidades y ${producto.metraje_restante ?? 'sin'} ${producto.unidad || ''}.`
  );

  try {
    await enviarAlertaStockBajo(producto, destinatario);
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
    const esErrorDeEsquema = ['P2022', 'P2021', 'P2010'].includes(error?.code)
      || String(error?.message || '').includes('does not exist')
      || String(error?.message || '').includes('no existe');

    if (esErrorDeEsquema) {
      console.error('Error de esquema de BD al consultar productos:', error.message || error);
      return res.status(200).json({
        success: true,
        total: 0,
        productos: [],
        warning: 'La base de datos está desalineada con el esquema actual. Sincroniza la estructura antes de continuar.'
      });
    }

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
  'activo_fijo', 'fecha_adquisicion', 'descripcion', 'area',
  'fecha_ultimo_mantenimiento', 'estado_mantenimiento', 'aporta_plan_mejoramiento'
];

const normalizarEncabezado = (valor) => String(valor || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_|_$/g, '')
  .replace(/\s+/g, '_');

const aliasEncabezados = {
  activo: 'activo_fijo',
  activo_fijo: 'activo_fijo',
  descripcion: 'descripcion',
  area: 'area',
  area_responsable: 'area',
  responsable_area: 'area',
  fecha_de_ultimo_mantenimiento: 'fecha_ultimo_mantenimiento',
  fecha_ultimo_mantenimiento: 'fecha_ultimo_mantenimiento',
  estado_mantenimiento: 'estado_mantenimiento',
  aporta_al_plan_de_mejoramiento: 'aporta_plan_mejoramiento',
  aporta_plan_mejoramiento: 'aporta_plan_mejoramiento',
  nombre_activo: 'nombre',
  nombre_del_activo: 'nombre',
  nombre_elemento: 'nombre',
  nombre_del_bien: 'nombre',
  nombre_del_elemento: 'nombre',
  descripcion_activo: 'nombre',
  descripcion_del_activo: 'nombre',
  elemento: 'nombre',
  equipo: 'nombre',
  tipo_de_activo: 'categoria',
  tipo_de_bien: 'categoria',
  tipo_activo: 'categoria',
  tipo_bien: 'categoria',
  clase_de_activo: 'categoria',
  clasificacion: 'categoria',
  categoria: 'categoria',
  categoria_activo: 'categoria',
  categoria_del_activo: 'categoria',
  categoria_del_bien: 'categoria',
  cantidad: 'cantidad_total',
  cantidad_total: 'cantidad_total',
  total_unidades: 'cantidad_total',
  unidades: 'cantidad_total',
  cantidad_disponible: 'cantidad_total',
  cantidad_de_activos: 'cantidad_total',
  cantidad_de_unidades: 'cantidad_total',
  cantidad_totala: 'cantidad_total',
  cantidad_total_de_activos: 'cantidad_total',
  cantidad_de_activos_fijos: 'cantidad_total',
  codigo_activo: 'activo_fijo',
  codigo: 'activo_fijo',
  codigo_interno: 'activo_fijo',
  codigo_de_activo: 'activo_fijo',
  codigo_activo_fijo: 'activo_fijo',
  codigo_de_activo_fijo: 'activo_fijo',
  numero_activo: 'activo_fijo',
  numero_de_activo: 'activo_fijo',
  numero_de_activo_fijo: 'activo_fijo',
  placa: 'activo_fijo',
  placa_activo: 'activo_fijo',
  serial: 'numero_serie',
  numero_de_serie: 'numero_serie',
  numero_serial: 'numero_serie',
  serial_del_equipo: 'numero_serie',
  marca_del_equipo: 'marca',
  modelo_del_equipo: 'modelo',
  dependencia: 'dependencia_nombre',
  nombre_dependencia: 'dependencia_nombre',
  codigo_dependencia: 'dependencia_codigo',
  sede: 'ubicacion',
  lugar: 'ubicacion',
  ubicacion: 'ubicacion',
  observaciones: 'descripcion',
  observacion: 'descripcion',
  estado_del_activo: 'estado',
  estado: 'estado',
  fecha_compra: 'fecha_adquisicion',
  fecha_adquisicion: 'fecha_adquisicion',
  fecha_adquisicion_del_activo: 'fecha_adquisicion',
  fecha_de_adquisicion: 'fecha_adquisicion'
};

const resolverEncabezado = (valor) => {
  const encabezado = normalizarEncabezado(valor);
  if (!encabezado) return null;
  return aliasEncabezados[encabezado] || encabezado;
};

const convertirFecha = (valor) => {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) return valor;
  const fecha = valor ? new Date(valor) : new Date();
  return Number.isNaN(fecha.getTime()) ? new Date() : fecha;
};

const convertirFechaOpcional = (valor) => {
  if (valor === null || valor === undefined || String(valor).trim() === '') return null;
  const fecha = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

const convertirNumero = (valor, valorPredeterminado = null) => {
  if (valor === null || valor === undefined || String(valor).trim() === '') return valorPredeterminado;
  const numero = Number(String(valor).replace(',', '.').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numero) ? numero : valorPredeterminado;
};

const valorCelda = (celda) => {
  if (celda && typeof celda === 'object' && Object.prototype.hasOwnProperty.call(celda, 'result')) {
    return celda.result;
  }
  return celda;
};

const normalizarNombreCategoria = (valor) => String(valor || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, ' ');

const obtenerColumnasProductos = async () => {
  try {
    const columnas = await prisma.$queryRaw`SELECT column_name::text AS column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'productos';`;
    return new Set((columnas || []).map((columna) => String(columna.column_name || '')) .filter(Boolean));
  } catch (error) {
    console.warn('No se pudo detectar esquema de productos, usando columnas por defecto:', error.message);
    return new Set([
      'id', 'nombre', 'categoria_id', 'marca', 'modelo', 'numero_serie', 'cantidad_total',
      'cantidad_disponible', 'unidad', 'metraje_total', 'metraje_restante', 'ubicacion', 'estado',
      'activo_fijo', 'dependencia_codigo', 'dependencia_nombre', 'stock_estado', 'fecha_adquisicion',
      'foto_url', 'descripcion', 'created_at', 'updated_at', 'area', 'fecha_ultimo_mantenimiento',
      'estado_mantenimiento', 'aporta_plan_mejoramiento'
    ]);
  }
};

const filtrarCamposProducto = (payload = {}, columnasDisponibles = new Set()) => {
  const resultado = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (key === 'created_at' || key === 'updated_at') {
      if (value !== undefined && columnasDisponibles.has(key)) resultado[key] = value;
      return;
    }
    if (value !== undefined && columnasDisponibles.has(key)) resultado[key] = value;
  });
  return resultado;
};

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
  instrucciones.addRow({ campo: 'Encabezados alternativos', descripcion: 'También se aceptan formatos de activos con nombres como Código de activo fijo, Placa, Serial, Tipo de activo, Dependencia, Sede, Cantidad y Observaciones.' });
  instrucciones.getRow(1).font = { bold: true };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla_productos.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
};

export const importarProductos = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Debes seleccionar un archivo Excel' });

    const ext = String(req.file.originalname || '').toLowerCase();
    const esExcelValido = ext.endsWith('.xlsx') || ext.endsWith('.xls') || ext.endsWith('.csv');
    if (!esExcelValido) return res.status(400).json({ success: false, error: 'El archivo debe ser un Excel .xlsx o .xls' });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const hoja = workbook.getWorksheet('Productos') || workbook.getWorksheet('Matriz') || workbook.worksheets[0];
    if (!hoja) return res.status(400).json({ success: false, error: 'El archivo no contiene una hoja de productos' });

    let filaEncabezados = 1;
    let encabezados = {};
    let mejorCoincidencia = 0;
    hoja.eachRow((row, numeroFila) => {
      if (numeroFila > 15) return;
      const encontrados = {};
      row.eachCell((cell, index) => {
        const encabezado = resolverEncabezado(cell.value);
        if (encabezado && columnasPlantilla.includes(encabezado)) {
          encontrados[encabezado] = index;
        }
      });
      const coincidencias = Object.keys(encontrados).filter((campo) => columnasPlantilla.includes(campo)).length;
      if (coincidencias > mejorCoincidencia) {
        mejorCoincidencia = coincidencias;
        filaEncabezados = numeroFila;
        encabezados = encontrados;
      }
    });

    if (!Object.keys(encabezados).length) {
      return res.status(400).json({ success: false, error: 'No se detectaron columnas válidas en el archivo. Verifica los encabezados del Excel.' });
    }

    const categorias = await prisma.categorias.findMany();
    const categoriasPorNombre = new Map(categorias.map((categoria) => [normalizarNombreCategoria(categoria.nombre), categoria.id]));
    const categoriaPredeterminada = categorias.find((categoria) => normalizarNombreCategoria(categoria.nombre) === 'activo fijo')
      || await prisma.categorias.create({ data: { nombre: 'Activo fijo' } });
    categoriasPorNombre.set('activo fijo', categoriaPredeterminada.id);
    const columnasDisponibles = await obtenerColumnasProductos();
    const esMatrizActivos = !encabezados.categoria || !encabezados.cantidad_total;
    const filas = [];
    const errores = [];
    const crearCategoriaSiFalta = async (categoriaNombre) => {
      const nombreLimpio = String(categoriaNombre || '').trim();
      if (!nombreLimpio) return categoriaPredeterminada.id;
      const clave = normalizarNombreCategoria(nombreLimpio);
      if (!clave) return categoriaPredeterminada.id;
      if (categoriasPorNombre.has(clave)) return categoriasPorNombre.get(clave);
      const categoriaNueva = await prisma.categorias.create({ data: { nombre: nombreLimpio } });
      categoriasPorNombre.set(clave, categoriaNueva.id);
      return categoriaNueva.id;
    };

    const filasAProcesar = [];
    hoja.eachRow((row, numeroFila) => {
      if (numeroFila <= filaEncabezados) return;
      const valor = (campo) => (encabezados[campo] ? valorCelda(row.getCell(encabezados[campo]).value) : null);
      const texto = (campo) => String(valor(campo) ?? '').trim();
      const camposIdentificacion = [
        'nombre', 'activo_fijo', 'descripcion', 'categoria', 'cantidad_total',
        'marca', 'modelo', 'numero_serie', 'area', 'dependencia_nombre',
        'fecha_ultimo_mantenimiento', 'aporta_plan_mejoramiento'
      ];
      const tieneDatos = camposIdentificacion.some((campo) => texto(campo) !== '');
      if (!tieneDatos) return;
      filasAProcesar.push({ row, numeroFila, valor, texto });
    });

    for (const { row, numeroFila, valor, texto } of filasAProcesar) {
      const nombre = texto('nombre') || texto('descripcion') || texto('activo_fijo') || 'Activo sin nombre';
      const categoriaTexto = texto('categoria');
      let categoria = categoriasPorNombre.get(normalizarNombreCategoria(categoriaTexto))
        || (esMatrizActivos ? categoriaPredeterminada.id : null);
      const cantidad = convertirNumero(valor('cantidad_total'), 1);
      const metrajeTotal = texto('metraje_total') ? convertirNumero(valor('metraje_total')) : null;
      const metrajeRestante = texto('metraje_restante') ? convertirNumero(valor('metraje_restante')) : metrajeTotal;

      if (!categoria && categoriaTexto) {
        categoria = await crearCategoriaSiFalta(categoriaTexto);
      }

      if (!nombre || !categoria || !Number.isInteger(cantidad) || cantidad < 1) {
        const detalleCategoria = categoriaTexto && !categoria ? ` categoría "${categoriaTexto}" no existe` : '';
        errores.push(`Fila ${numeroFila}: nombre,${detalleCategoria || ' categoría'} o cantidad_total inválidos`);
        continue;
      }
      if (metrajeTotal !== null && (!Number.isInteger(metrajeTotal) || metrajeTotal < 0 || metrajeRestante < 0 || metrajeRestante > metrajeTotal)) {
        errores.push(`Fila ${numeroFila}: metraje inválido`);
        continue;
      }
      filas.push(filtrarCamposProducto({
        id: uuidv4(), nombre, categoria_id: categoria,
        marca: texto('marca') || null, modelo: texto('modelo') || null,
        numero_serie: texto('numero_serie') || null, cantidad_total: cantidad,
        cantidad_disponible: cantidad, unidad: texto('unidad') || null,
        metraje_total: metrajeTotal, metraje_restante: metrajeRestante,
        ubicacion: texto('ubicacion') || 'Almacén', estado: texto('estado') || 'nuevo',
        dependencia_codigo: texto('dependencia_codigo') || null,
        dependencia_nombre: texto('dependencia_nombre') || null,
        activo_fijo: texto('activo_fijo') || null,
        area: texto('area') || null,
        fecha_ultimo_mantenimiento: convertirFechaOpcional(valor('fecha_ultimo_mantenimiento')),
        estado_mantenimiento: texto('estado_mantenimiento') || null,
        aporta_plan_mejoramiento: texto('aporta_plan_mejoramiento') || null,
        fecha_adquisicion: convertirFecha(valor('fecha_adquisicion')),
        descripcion: texto('descripcion') || null, created_at: new Date(), updated_at: new Date()
      }, columnasDisponibles));
    }

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
      dependencia_nombre,
      area,
      fecha_ultimo_mantenimiento,
      estado_mantenimiento,
      aporta_plan_mejoramiento
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

    const columnasDisponibles = await obtenerColumnasProductos();
    const producto = await prisma.productos.create({
      data: filtrarCamposProducto({
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
        area: area || null,
        fecha_ultimo_mantenimiento: convertirFechaOpcional(fecha_ultimo_mantenimiento),
        estado_mantenimiento: estado_mantenimiento || null,
        aporta_plan_mejoramiento: aporta_plan_mejoramiento || null,
        created_at: new Date(),
        updated_at: new Date()
      }, columnasDisponibles)
    });

    const alerta = await notificarStockBajo(producto, req.user?.email);

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
      'dependencia_nombre',
      'area',
      'fecha_ultimo_mantenimiento',
      'estado_mantenimiento',
      'aporta_plan_mejoramiento'
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
    const columnasDisponibles = await obtenerColumnasProductos();
    const producto = await prisma.productos.update({ where: { id }, data: filtrarCamposProducto(updates, columnasDisponibles) });
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

    const alerta = await notificarStockBajo(producto, req.user?.email);

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

    const productoActual = await prisma.productos.findUnique({
      where: { id },
      select: { id: true, cantidad_total: true }
    });

    if (!productoActual) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }

    const cantidad = Number(cantidad_disponible);
    if (!Number.isInteger(cantidad) || cantidad < 0 || cantidad > productoActual.cantidad_total) {
      return res.status(400).json({
        success: false,
        error: `La cantidad disponible debe ser un entero entre 0 y ${productoActual.cantidad_total}`
      });
    }

    const producto = await prisma.productos.update({
      where: { id },
      data: {
        cantidad_disponible: cantidad,
        updated_at: new Date()
      }
    });

    const alerta = await notificarStockBajo(producto, req.user?.email);

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
