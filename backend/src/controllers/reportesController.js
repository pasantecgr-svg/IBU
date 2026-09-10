import prisma from '../utils/dbClient.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

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
        categorias: { select: { id: true, nombre: true } }
      }
    });

    // Por categoría: reutilizamos los mismos productos y agrupamos en memoria
    const porCategoria = productos.map(p => ({ categorias: p.categorias || null, cantidad_total: p.cantidad_total }));

    // Calcular estadísticas
    const totalEquipos = productos?.length || 0;
    const totalCantidad = productos?.reduce((sum, p) => sum + p.cantidad_total, 0) || 0;
    const totalDisponible = productos?.reduce((sum, p) => sum + p.cantidad_disponible, 0) || 0;
    const totalUtilizado = totalCantidad - totalDisponible;

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

    res.json({
      success: true,
      estadisticas: {
        totalEquipos,
        totalCantidad,
        totalDisponible,
        totalUtilizado,
        porcentajeDisponible: totalCantidad > 0 ? ((totalDisponible / totalCantidad) * 100).toFixed(2) : 0,
        porCategoria: estadisticasPorCategoria,
        stockBajo
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
