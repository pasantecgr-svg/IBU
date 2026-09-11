import prisma from '../utils/dbClient.js';
import { enviarAlertaStockBajo } from '../utils/emailService.js';

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

export default { enviarNotificacionOrden };
