import prisma from '../utils/dbClient.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { Parser as Json2csvParser } from 'json2csv';

// Generar reporte PDF
export const generarReportePDF = async (req, res) => {
  try {
    const { categoria_id } = req.query;

    const where = {};
    if (categoria_id) where.categoria_id = categoria_id;

    const productos = await prisma.productos.findMany({
      where,
      include: { categorias: true },
      orderBy: { nombre: 'asc' }
    });

    // Crear PDF
    const doc = new PDFDocument();
    const fileName = `inventario_${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    doc.pipe(res);

    // Encabezado
    doc.fontSize(20).font('Helvetica-Bold').text('REPORTE DE INVENTARIO', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Fecha: ${new Date().toLocaleString('es-CO')}`, { align: 'center' });
    doc.moveDown();

    // Resumen
    doc.fontSize(12).font('Helvetica-Bold').text('RESUMEN');
    doc.fontSize(10).font('Helvetica')
      .text(`Total de Equipos: ${productos.length}`)
      .text(`Cantidad Total: ${productos.reduce((sum, p) => sum + p.cantidad_total, 0)}`)
      .text(`Cantidad Disponible: ${productos.reduce((sum, p) => sum + p.cantidad_disponible, 0)}`);
    doc.moveDown();

    // Tabla de productos
    doc.fontSize(12).font('Helvetica-Bold').text('DETALLE DE EQUIPOS');
    doc.moveDown(0.5);

    // Encabezados de tabla
    const startX = 50;
    const colWidths = [80, 100, 60, 50, 50, 70];
    const y = doc.y;

    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Nombre', startX, y);
    doc.text('Modelo', startX + colWidths[0], y);
    doc.text('Categoría', startX + colWidths[0] + colWidths[1], y);
    doc.text('Total', startX + colWidths[0] + colWidths[1] + colWidths[2], y);
    doc.text('Disponible', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y);
    doc.text('Ubicación', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], y);

    doc.moveTo(startX, y + 15).lineTo(550, y + 15).stroke();
    doc.moveDown();

    // Filas
    doc.fontSize(8).font('Helvetica');
    productos.forEach((producto) => {
      const currentY = doc.y;
      doc.text(producto.nombre || '', startX, currentY, { width: colWidths[0] - 5 });
      doc.text(producto.modelo || '', startX + colWidths[0], currentY, { width: colWidths[1] - 5 });
      doc.text(producto.categorias?.nombre || '', startX + colWidths[0] + colWidths[1], currentY, { width: colWidths[2] - 5 });
      doc.text(producto.cantidad_total.toString(), startX + colWidths[0] + colWidths[1] + colWidths[2], currentY);
      doc.text(producto.cantidad_disponible.toString(), startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], currentY);
      doc.text(producto.ubicacion || '', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], currentY, { width: colWidths[5] - 5 });
      doc.moveDown();
    });

    doc.end();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Generar reporte Excel
export const generarReporteExcel = async (req, res) => {
  try {
    const { categoria_id } = req.query;

    const where = {};
    if (categoria_id) where.categoria_id = categoria_id;

    const productos = await prisma.productos.findMany({
      where,
      include: { categorias: true },
      orderBy: { nombre: 'asc' }
    });

    // Crear workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventario');

    // Encabezados
    worksheet.columns = [
      { header: 'Nombre', key: 'nombre', width: 25 },
      { header: 'Categoría', key: 'categoria', width: 15 },
      { header: 'Marca', key: 'marca', width: 15 },
      { header: 'Modelo', key: 'modelo', width: 15 },
      { header: 'Número de Serie', key: 'numero_serie', width: 20 },
      { header: 'Cantidad Total', key: 'cantidad_total', width: 15 },
      { header: 'Cantidad Disponible', key: 'cantidad_disponible', width: 18 },
      { header: 'Ubicación', key: 'ubicacion', width: 15 },
      { header: 'Estado', key: 'estado', width: 12 },
      { header: 'Fecha Adquisición', key: 'fecha_adquisicion', width: 18 },
      { header: 'Descripción', key: 'descripcion', width: 30 }
    ];

    // Estilar encabezados
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };
    worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'center' };

    // Agregar datos
    productos.forEach((producto) => {
      worksheet.addRow({
        nombre: producto.nombre,
        categoria: producto.categorias?.nombre || '',
        marca: producto.marca || '',
        modelo: producto.modelo || '',
        numero_serie: producto.numero_serie || '',
        cantidad_total: producto.cantidad_total,
        cantidad_disponible: producto.cantidad_disponible,
        ubicacion: producto.ubicacion || '',
        estado: producto.estado || '',
        fecha_adquisicion: producto.fecha_adquisicion || '',
        descripcion: producto.descripcion || ''
      });
    });

    // Aplicar estilos
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.alignment = { horizontal: 'left', vertical: 'center' };
        row.border = {
          top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
        };
      }
    });

    // Enviar archivo
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const fileName = `inventario_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Obtener estadísticas
export const obtenerEstadisticas = async (req, res) => {
  try {
    // Productos totales
    const productos = await prisma.productos.findMany({
      select: {
        id: true,
        nombre: true,
        cantidad_total: true,
        cantidad_disponible: true,
        metraje_total: true,
        metraje_restante: true,
        unidad: true,
        categorias: { select: { id: true, nombre: true } }
      }
    });

    // Por categoría: reutilizamos los mismos productos y agrupamos en memoria
    const porCategoria = productos.map(p => ({ categorias: p.categorias || null, cantidad_total: p.cantidad_total }));

    // Calcular estadísticas
    const totalEquipos = productos?.length || 0;
    const totalCantidad = productos?.reduce((sum, p) => sum + (p.cantidad_total || 0), 0) || 0;
    const totalDisponible = productos?.reduce((sum, p) => sum + (p.cantidad_disponible || 0), 0) || 0;
    const totalUtilizado = totalCantidad - totalDisponible;

    // Metraje totals
    const totalMetraje = productos?.reduce((sum, p) => sum + (p.metraje_total || 0), 0) || 0;
    const totalMetrajeRestante = productos?.reduce((sum, p) => sum + (p.metraje_restante || 0), 0) || 0;
    const totalMetrajeUtilizado = totalMetraje - totalMetrajeRestante;

    const estadisticasPorCategoria = {};
    porCategoria?.forEach((item) => {
      const cat = item.categorias?.nombre;
      if (cat) {
        if (!estadisticasPorCategoria[cat]) {
          estadisticasPorCategoria[cat] = 0;
        }
        estadisticasPorCategoria[cat] += item.cantidad_total;
      }
    });

    const stockBajo = productos
      .filter((producto) => producto.cantidad_disponible > 0 && producto.cantidad_disponible <= 5)
      .map((producto) => ({
        id: producto.id,
        nombre: producto.nombre,
        producto: producto.nombre,
        cantidad_disponible: producto.cantidad_disponible,
        categoria: producto.categorias?.nombre || 'Sin categoría'
      }));

    // Metraje bajo: criterio por defecto <=10 metros o <=10% restante
    const metrajeBajo = productos
      .filter((producto) => typeof producto.metraje_restante === 'number' && producto.metraje_restante > 0)
      .filter((producto) => {
        const restante = producto.metraje_restante || 0;
        const total = producto.metraje_total || 0;
        const porcentaje = total > 0 ? (restante / total) * 100 : 100;
        return restante <= 10 || porcentaje <= 10;
      })
      .map((producto) => ({
        id: producto.id,
        nombre: producto.nombre,
        metraje_restante: producto.metraje_restante || 0,
        metraje_total: producto.metraje_total || 0,
        unidad: producto.unidad || '',
        porcentaje_restante: producto.metraje_total ? Number(((producto.metraje_restante / producto.metraje_total) * 100).toFixed(2)) : 0,
        categoria: producto.categorias?.nombre || 'Sin categoría'
      }));

    res.json({
      success: true,
      estadisticas: {
        totalEquipos,
        totalCantidad,
        totalDisponible,
        totalUtilizado,
        porcentajeDisponible: totalCantidad > 0 ? ((totalDisponible / totalCantidad) * 100).toFixed(2) : 0,
        porCategoria: estadisticasPorCategoria,
        stockBajo,
        totalMetraje,
        totalMetrajeRestante,
        totalMetrajeUtilizado,
        porcentajeMetrajeDisponible: totalMetraje > 0 ? ((totalMetrajeRestante / totalMetraje) * 100).toFixed(2) : 0,
        metrajeBajo
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Exportar órdenes de trabajo a Excel
export const exportOrdenesExcel = async (req, res) => {
  try {
    const ordenes = await prisma.ordenes_trabajo.findMany({
      include: { items: { include: { productos: true } }, usuario: true },
      orderBy: { created_at: 'desc' }
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('OrdenesTrabajo');

    sheet.columns = [
      { header: 'OT ID', key: 'id', width: 20 },
      { header: 'Título', key: 'titulo', width: 30 },
      { header: 'Descripción', key: 'descripcion', width: 40 },
      { header: 'Mantis Ticket', key: 'mantis_ticket', width: 20 },
      { header: 'Usuario', key: 'usuario', width: 25 },
      { header: 'Fecha', key: 'created_at', width: 22 },
      { header: 'Producto', key: 'producto', width: 30 },
      { header: 'Cantidad', key: 'cantidad', width: 12 },
      { header: 'Metraje usado', key: 'metraje_usado', width: 12 },
      { header: 'Cable', key: 'cable_descripcion', width: 30 }
    ];

    ordenes.forEach((orden) => {
      if (!orden.items || orden.items.length === 0) {
        sheet.addRow({ id: orden.id, titulo: orden.titulo, descripcion: orden.descripcion, mantis_ticket: orden.mantis_ticket, usuario: orden.usuario?.email || '', created_at: orden.created_at });
      } else {
        orden.items.forEach((it) => {
          sheet.addRow({
            id: orden.id,
            titulo: orden.titulo,
            descripcion: orden.descripcion,
            mantis_ticket: orden.mantis_ticket,
            usuario: orden.usuario?.email || '',
            created_at: orden.created_at,
            producto: it.productos?.nombre || '',
            cantidad: it.cantidad || 0,
            metraje_usado: it.metraje_usado || 0,
            cable_descripcion: it.cable_descripcion || ''
          });
        });
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="ordenes_trabajo_${new Date().toISOString().split('T')[0]}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exportOrdenesExcel:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Exportar órdenes de trabajo a CSV
export const exportOrdenesCSV = async (req, res) => {
  try {
    const ordenes = await prisma.ordenes_trabajo.findMany({
      include: { items: { include: { productos: true } }, usuario: true },
      orderBy: { created_at: 'desc' }
    });

    const rows = [];
    ordenes.forEach((orden) => {
      if (!orden.items || orden.items.length === 0) {
        rows.push({ id: orden.id, titulo: orden.titulo, descripcion: orden.descripcion, mantis_ticket: orden.mantis_ticket, usuario: orden.usuario?.email || '', created_at: orden.created_at });
      } else {
        orden.items.forEach((it) => {
          rows.push({
            id: orden.id,
            titulo: orden.titulo,
            descripcion: orden.descripcion,
            mantis_ticket: orden.mantis_ticket,
            usuario: orden.usuario?.email || '',
            created_at: orden.created_at,
            producto: it.productos?.nombre || '',
            cantidad: it.cantidad || 0,
            metraje_usado: it.metraje_usado || 0,
            cable_descripcion: it.cable_descripcion || ''
          });
        });
      }
    });

    const fields = ['id', 'titulo', 'descripcion', 'mantis_ticket', 'usuario', 'created_at', 'producto', 'cantidad', 'metraje_usado', 'cable_descripcion'];
    const parser = new Json2csvParser({ fields });
    const csv = parser.parse(rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="ordenes_trabajo_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exportOrdenesCSV:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
