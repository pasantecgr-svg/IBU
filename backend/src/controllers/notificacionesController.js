import prisma from '../utils/dbClient.js';
import { enviarAlertaStockBajo } from '../utils/emailService.js';

export const obtenerNotificaciones = async (req, res) => {
  try {
    const productos = await prisma.$queryRaw`
      SELECT
        p.id,
        p.nombre,
        p.cantidad_disponible,
        p.metraje_restante,
        p.metraje_total,
        p.unidad,
        p.updated_at,
        c.nombre AS categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      ORDER BY p.updated_at DESC
    `;

    const notificaciones = [];
    for (const producto of productos) {
      const cantidadDisponible = Number(producto.cantidad_disponible ?? 0);
      const metrajeRestante = Number(producto.metraje_restante ?? 0);
      const metrajeTotal = Number(producto.metraje_total ?? 0);
      const bajoCantidad = cantidadDisponible > 0 && cantidadDisponible <= 5;
      const bajoMetraje = metrajeTotal > 0 && (metrajeRestante <= 10 || metrajeRestante / metrajeTotal <= 0.1);

      if (bajoCantidad || bajoMetraje) {
        const detalles = [];
        if (bajoCantidad) detalles.push(`${cantidadDisponible} unidades disponibles`);
        if (bajoMetraje) detalles.push(`${metrajeRestante} ${producto.unidad || 'metros'} restantes`);

        notificaciones.push({
          id: `stock-${producto.id}`,
          tipo: cantidadDisponible === 0 || metrajeRestante === 0 ? 'agotado' : 'stock_bajo',
          titulo: cantidadDisponible === 0 || metrajeRestante === 0 ? 'Producto agotado' : 'Stock bajo',
          mensaje: `${producto.nombre}: ${detalles.join(' y ')}.`,
          producto_id: producto.id,
          categoria: producto.categoria_nombre || 'Sin categoría',
          updated_at: producto.updated_at
        });
      }
    }

    res.json({ success: true, notificaciones });
  } catch (error) {
    console.error('Error obtenerNotificaciones:', error);
    res.json({ success: true, notificaciones: [], warning: 'No se pudieron cargar notificaciones; se devolvió la lista vacía.' });
  }
};

export const enviarNotificacionOrden = async (req, res) => {
  try {
    const { id } = req.params;
    const orden = await prisma.ordenes_trabajo.findUnique({
      where: { id },
      include: { items: { include: { productos: true } }, usuario: true }
    });

    if (!orden) return res.status(404).json({ success: false, error: 'Orden no encontrada' });

    const results = [];
    for (const item of orden.items || []) {
      const p = item.productos;
      if (!p) continue;
      // enviar alerta (emailService maneja ausencia de SMTP)
      // eslint-disable-next-line no-await-in-loop
      const r = await enviarAlertaStockBajo(p);
      results.push({ producto_id: p.id, nombre: p.nombre, resultado: r });
    }

    res.json({ success: true, ordenId: id, emailed: results.length, results });
  } catch (error) {
    console.error('Error enviarNotificacionOrden:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export default { enviarNotificacionOrden, obtenerNotificaciones };
