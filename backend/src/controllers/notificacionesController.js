import prisma from '../utils/dbClient.js';
import { enviarAlertaStockBajo } from '../utils/emailService.js';

export const obtenerNotificaciones = async (req, res) => {
  try {
    const productos = await prisma.productos.findMany({
      include: { categorias: true },
      orderBy: { updated_at: 'desc' }
    });
    const notificaciones = [];
    for (const producto of productos) {
      const bajoCantidad = producto.cantidad_disponible > 0 && producto.cantidad_disponible <= 5;
      const bajoMetraje = typeof producto.metraje_restante === 'number'
        && typeof producto.metraje_total === 'number'
        && producto.metraje_total > 0
        && (producto.metraje_restante <= 10 || producto.metraje_restante / producto.metraje_total <= 0.1);
      if (bajoCantidad || bajoMetraje) {
        const detalles = [];
        if (bajoCantidad) detalles.push(`${producto.cantidad_disponible} unidades disponibles`);
        if (bajoMetraje) detalles.push(`${producto.metraje_restante} ${producto.unidad || 'metros'} restantes`);
        notificaciones.push({
          id: `stock-${producto.id}`,
          tipo: producto.cantidad_disponible === 0 || producto.metraje_restante === 0 ? 'agotado' : 'stock_bajo',
          titulo: producto.cantidad_disponible === 0 || producto.metraje_restante === 0 ? 'Producto agotado' : 'Stock bajo',
          mensaje: `${producto.nombre}: ${detalles.join(' y ')}.`,
          producto_id: producto.id,
          categoria: producto.categorias?.nombre || 'Sin categoría',
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
