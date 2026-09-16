import prisma from '../utils/dbClient.js';
import { enviarAlertaStockBajo } from '../utils/emailService.js';
import { puedeEnviarCorreos } from './authController.js';

// Helper para convertir BigInt en strings antes de serializar a JSON
const convertBigIntToString = (value) => {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(convertBigIntToString);
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = convertBigIntToString(v);
    }
    return out;
  }
  return value;
};

// Crear una orden de trabajo con items y actualizar metraje/cantidad de productos
export const crearOrden = async (req, res) => {
  try {
    const { titulo, descripcion, mantis_ticket, items } = req.body || {};
    if (!titulo || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Título e items son requeridos' });
    }
    // Usar transacción para consistencia. Primero validamos que todos los productos existan
    const productIds = Array.from(new Set(items.map((it) => it.producto_id).filter(Boolean)));
    const lowStockProducts = [];

    console.log('crearOrden payload items:', items);
    const result = await prisma.$transaction(async (tx) => {
      // Cargar productos involucrados dentro de la transacción para evitar race conditions
      const productos = await tx.productos.findMany({ where: { id: { in: productIds } } });
      const productosMap = new Map(productos.map((p) => [p.id, p]));

      // Verificar que existan todos los productos solicitados
      const faltantes = productIds.filter((id) => !productosMap.has(id));
      if (faltantes.length) {
        throw new Error(`Productos no encontrados: ${faltantes.join(', ')}`);
      }

      // Verificar stock y metraje disponible antes de crear la orden
      for (const it of items) {
        const { producto_id, cantidad = 0, metraje_usado = 0 } = it;
        const producto = productosMap.get(producto_id);
        if (!producto) continue; // ya verificado, pero defensivo

        if (cantidad < 0 || metraje_usado < 0) {
          throw new Error('La cantidad y el metraje utilizado no pueden ser negativos');
        }

        if (typeof cantidad === 'number' && cantidad > 0) {
          const disponible = Number(producto.cantidad_disponible || 0);
          if (cantidad > disponible) {
            throw new Error(`Stock insuficiente para ${producto.nombre} (id=${producto.id}): solicitado ${cantidad}, disponible ${disponible}`);
          }
        }

        if (typeof metraje_usado === 'number' && metraje_usado > 0 && typeof producto.metraje_restante === 'number') {
          const restante = Number(producto.metraje_restante || 0);
          if (metraje_usado > restante) {
            throw new Error(`Metraje insuficiente para ${producto.nombre} (id=${producto.id}): solicitado ${metraje_usado}, restante ${restante}`);
          }
        }
      }

      // Crear orden
      const orden = await tx.ordenes_trabajo.create({
        data: {
          titulo,
          descripcion,
          mantis_ticket,
          usuario_id: req.user.id
        }
      });

      // Crear items y actualizar productos
      for (const it of items) {
        console.log('Procesando item:', it);
        const { producto_id, cantidad = 0, metraje_usado = 0, cable_descripcion = null } = it;

        await tx.ot_items.create({
          data: {
            orden_id: orden.id,
            producto_id,
            cantidad,
            metraje_usado,
            cable_descripcion
          }
        });

        // Actualizar producto: restar cantidad_disponible y metraje_restante si aplica
        const producto = await tx.productos.findUnique({ where: { id: producto_id } });
        if (!producto) continue;

        const updates = {};
        if (typeof cantidad === 'number' && cantidad > 0) {
          updates.cantidad_disponible = Math.max(0, (producto.cantidad_disponible || 0) - cantidad);
        }
        if (typeof metraje_usado === 'number' && metraje_usado > 0 && typeof producto.metraje_restante === 'number') {
          updates.metraje_restante = Math.max(0, (producto.metraje_restante || 0) - metraje_usado);
        }

        if (Object.keys(updates).length) {
          console.log('Actualizando producto', producto_id, 'con', updates);
          const updated = await tx.productos.update({ where: { id: producto_id }, data: updates });
          console.log('Producto actualizado:', updated.id, updated.cantidad_disponible, updated.metraje_restante);

          // Determinar si está bajo umbral por unidades o por metraje.
          const bajoCantidad = typeof updated.cantidad_disponible === 'number' && updated.cantidad_disponible > 0 && updated.cantidad_disponible <= 5;
          let bajoMetraje = false;
          if (typeof updated.metraje_restante === 'number') {
            if (updated.metraje_restante <= 10) bajoMetraje = true;
            if (typeof updated.metraje_total === 'number' && updated.metraje_total > 0) {
              const porcentaje = updated.metraje_restante / updated.metraje_total;
              if (porcentaje <= 0.1) bajoMetraje = true;
            }
          }

          if (bajoCantidad || bajoMetraje) {
            lowStockProducts.push(updated);
          }
        }
      }

      // Formatear y guardar el número legible de la orden (ej: '01'..'9' -> '09', '10' -> '10')
      // `secuencia` es autoincremental BigInt; la creación arriba devuelve `secuencia`.
      try {
        const seq = orden.secuencia;
        let numero;
        if (typeof seq === 'bigint') {
          numero = seq < 10n ? `0${seq.toString()}` : seq.toString();
        } else if (typeof seq === 'number') {
          numero = seq < 10 ? `0${seq.toString()}` : seq.toString();
        } else {
          numero = String(seq);
        }
        await tx.ordenes_trabajo.update({ where: { id: orden.id }, data: { numero } });
        const ordenConNumero = await tx.ordenes_trabajo.findUnique({ where: { id: orden.id }, include: { items: true } });
        return ordenConNumero;
      } catch (e) {
        return orden;
      }

      // Crear items y actualizar productos
      for (const it of items) {
        const { producto_id, cantidad = 0, metraje_usado = 0, cable_descripcion = null } = it;

        await tx.ot_items.create({
          data: {
            orden_id: orden.id,
            producto_id,
            cantidad,
            metraje_usado,
            cable_descripcion
          }
        });

        // Actualizar producto: restar cantidad_disponible y metraje_restante si aplica
        const producto = await tx.productos.findUnique({ where: { id: producto_id } });
        if (!producto) continue;

        const updates = {};
        if (typeof cantidad === 'number' && cantidad > 0) {
          updates.cantidad_disponible = Math.max(0, (producto.cantidad_disponible || 0) - cantidad);
        }
        if (typeof metraje_usado === 'number' && metraje_usado > 0 && typeof producto.metraje_restante === 'number') {
          updates.metraje_restante = Math.max(0, (producto.metraje_restante || 0) - metraje_usado);
        }

        if (Object.keys(updates).length) {
          const updated = await tx.productos.update({ where: { id: producto_id }, data: updates });

          // Determinar si está bajo umbral: cantidad_disponible <=5 OR metraje_restante <=10 o <=10% del total
          const bajoCantidad = typeof updated.cantidad_disponible === 'number' && updated.cantidad_disponible > 0 && updated.cantidad_disponible <= 5;
          let bajoMetraje = false;
          if (typeof updated.metraje_restante === 'number') {
            if (updated.metraje_restante <= 10) bajoMetraje = true;
            if (typeof updated.metraje_total === 'number' && updated.metraje_total > 0) {
              const porcentaje = updated.metraje_restante / updated.metraje_total;
              if (porcentaje <= 0.1) bajoMetraje = true;
            }
          }

          if (bajoCantidad || bajoMetraje) {
            lowStockProducts.push(updated);
          }
        }
      }

      return orden;
    });

    // Enviar alertas por producto bajo si está permitido
    const allowAuto = process.env.ALLOW_AUTOMATIC_EMAILS === 'true';
    const puedeEnviar = puedeEnviarCorreos(req.user.email);
    const emailResults = [];
    if ((puedeEnviar || allowAuto) && lowStockProducts.length) {
      for (const p of lowStockProducts) {
        // enviarAlertaStockBajo maneja la ausencia de SMTP
        // no bloqueamos la respuesta si falla el envío
        // guardar resultados para la respuesta
        // eslint-disable-next-line no-await-in-loop
        const r = await enviarAlertaStockBajo(p);
        emailResults.push({ producto_id: p.id, nombre: p.nombre, resultado: r });
      }
    }

    res.status(201).json({ success: true, orden: convertBigIntToString(result), lowStock: lowStockProducts.length, emailResults });
  } catch (error) {
    console.error('Error crear orden:', error);
    const msg = String(error?.message || '');
    if (msg.startsWith('Productos no encontrados') || msg.includes('Stock insuficiente') || msg.includes('Metraje insuficiente') || msg.includes('no pueden ser negativos')) {
      return res.status(400).json({ success: false, error: msg });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

export const listarOrdenes = async (req, res) => {
  try {
    const ordenes = await prisma.ordenes_trabajo.findMany({
      include: { items: { include: { productos: true } }, usuario: true },
      orderBy: { created_at: 'desc' }
    });
    res.json({ success: true, ordenes: convertBigIntToString(ordenes) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const obtenerOrden = async (req, res) => {
  try {
    const { id } = req.params;
    const orden = await prisma.ordenes_trabajo.findUnique({
      where: { id },
      include: { items: { include: { productos: true } }, usuario: true }
    });
    if (!orden) return res.status(404).json({ success: false, error: 'Orden no encontrada' });
    res.json({ success: true, orden: convertBigIntToString(orden) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Editar una orden: permite modificar título, descripción, mantis_ticket y items.
// Al editar items, se restaura el stock/metraje de los items previos y se aplican los nuevos decrementos atómicamente.
export const editarOrden = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, mantis_ticket, items } = req.body || {};

    if (!id || !titulo || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'ID, título e items son requeridos' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const orden = await tx.ordenes_trabajo.findUnique({ where: { id }, include: { items: true } });
      if (!orden) throw new Error('Orden no encontrada');

      // Permisos: permitir editar si es administrador o creador
      if (req.user.role !== 'ADMIN' && orden.usuario_id !== req.user.id) {
        throw new Error('No autorizado para editar esta orden');
      }

      const prevItems = orden.items || [];
      const affectedProductIds = Array.from(new Set([...prevItems.map((i) => i.producto_id), ...items.map((i) => i.producto_id).filter(Boolean)]));
      const productos = await tx.productos.findMany({ where: { id: { in: affectedProductIds } } });
      const productosMap = new Map(productos.map(p => [p.id, p]));

      const anteriores = new Map();
      for (const it of prevItems) {
        const current = anteriores.get(it.producto_id) || { cantidad: 0, metraje: 0 };
        current.cantidad += Number(it.cantidad || 0);
        current.metraje += Number(it.metraje_usado || 0);
        anteriores.set(it.producto_id, current);
      }

      const nuevos = new Map();
      for (const it of items) {
        const cantidad = Number(it.cantidad || 0);
        const metraje = Number(it.metraje_usado || 0);
        if (!it.producto_id || !Number.isInteger(cantidad) || !Number.isInteger(metraje) || cantidad < 0 || metraje < 0) {
          throw new Error('Cada item debe tener producto, cantidad y metraje válidos');
        }
        const current = nuevos.get(it.producto_id) || { cantidad: 0, metraje: 0 };
        current.cantidad += cantidad;
        current.metraje += metraje;
        nuevos.set(it.producto_id, current);
      }

      const disponibilidad = new Map();
      for (const [productoId, consumo] of nuevos) {
        const producto = productosMap.get(productoId);
        if (!producto) throw new Error(`Producto no encontrado: ${productoId}`);
        const anterior = anteriores.get(productoId) || { cantidad: 0, metraje: 0 };
        const cantidadDisponible = Number(producto.cantidad_disponible || 0) + anterior.cantidad;
        if (consumo.cantidad > cantidadDisponible) {
          throw new Error(`Stock insuficiente para ${producto.nombre}: disponible ${cantidadDisponible}`);
        }
        if (consumo.metraje > 0 && typeof producto.metraje_restante !== 'number') {
          throw new Error(`El producto ${producto.nombre} no tiene metraje configurado`);
        }
        const metrajeDisponible = Number(producto.metraje_restante || 0) + anterior.metraje;
        if (consumo.metraje > metrajeDisponible) {
          throw new Error(`Metraje insuficiente para ${producto.nombre}: disponible ${metrajeDisponible}`);
        }
        disponibilidad.set(productoId, { cantidadDisponible, metrajeDisponible });
      }

      await tx.ordenes_trabajo.update({ where: { id }, data: { titulo, descripcion, mantis_ticket } });
      await tx.ot_items.deleteMany({ where: { orden_id: id } });

      const lowStockProducts = [];
      for (const it of items) {
        await tx.ot_items.create({
          data: {
            orden_id: id,
            producto_id: it.producto_id,
            cantidad: Number(it.cantidad || 0),
            metraje_usado: Number(it.metraje_usado || 0),
            cable_descripcion: it.cable_descripcion || null
          }
        });
      }

      for (const producto of productos) {
        const anterior = anteriores.get(producto.id) || { cantidad: 0, metraje: 0 };
        const nuevo = nuevos.get(producto.id) || { cantidad: 0, metraje: 0 };
        const updates = {
          cantidad_disponible: Math.max(0, Number(producto.cantidad_disponible || 0) + anterior.cantidad - nuevo.cantidad)
        };
        if (typeof producto.metraje_restante === 'number') {
          updates.metraje_restante = Math.max(0, Number(producto.metraje_restante || 0) + anterior.metraje - nuevo.metraje);
        }
        const updated = await tx.productos.update({ where: { id: producto.id }, data: updates });
        const bajoCantidad = updated.cantidad_disponible > 0 && updated.cantidad_disponible <= 5;
        const bajoMetraje = typeof updated.metraje_restante === 'number' && (updated.metraje_restante <= 10 || (updated.metraje_total > 0 && updated.metraje_restante / updated.metraje_total <= 0.1));
        if (bajoCantidad || bajoMetraje) lowStockProducts.push(updated);
      }

      const actualizada = await tx.ordenes_trabajo.findUnique({ where: { id }, include: { items: { include: { productos: true } } } });
      return { orden: actualizada, lowStockProducts };
    });

    // Enviar alertas si aplica
    if (result.lowStockProducts && result.lowStockProducts.length) {
      const allowAuto = process.env.ALLOW_AUTOMATIC_EMAILS === 'true';
      const puedeEnviar = puedeEnviarCorreos(req.user.email);
      if ((puedeEnviar || allowAuto)) {
        for (const p of result.lowStockProducts) {
          // eslint-disable-next-line no-await-in-loop
          await enviarAlertaStockBajo(p);
        }
      }
    }

    res.json({ success: true, message: 'Orden actualizada', orden: convertBigIntToString(result.orden) });
  } catch (error) {
    console.error('Error editar orden:', error);
    const msg = String(error?.message || '');
    if (msg === 'Orden no encontrada' || msg.startsWith('Producto no encontrado') || msg.includes('insuficiente') || msg.includes('No autorizado') || msg.includes('no tiene metraje') || msg.includes('Cada item')) {
      return res.status(400).json({ success: false, error: msg });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

export const eliminarOrden = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'ID de orden requerido' });

    await prisma.$transaction(async (tx) => {
      const orden = await tx.ordenes_trabajo.findUnique({ where: { id }, include: { items: true } });
      if (!orden) throw new Error('Orden no encontrada');

      if (req.user.role !== 'ADMIN' && orden.usuario_id !== req.user.id) {
        throw new Error('No autorizado para eliminar esta orden');
      }

      const consumos = new Map();
      for (const item of orden.items || []) {
        const consumo = consumos.get(item.producto_id) || { cantidad: 0, metraje: 0 };
        consumo.cantidad += Number(item.cantidad || 0);
        consumo.metraje += Number(item.metraje_usado || 0);
        consumos.set(item.producto_id, consumo);
      }

      for (const [productoId, consumo] of consumos) {
        const producto = await tx.productos.findUnique({ where: { id: productoId } });
        if (!producto) continue;

        const updates = {
          cantidad_disponible: Math.min(
            Number(producto.cantidad_total || 0),
            Number(producto.cantidad_disponible || 0) + consumo.cantidad
          )
        };
        if (typeof producto.metraje_restante === 'number') {
          const limiteMetraje = typeof producto.metraje_total === 'number'
            ? producto.metraje_total
            : Number.MAX_SAFE_INTEGER;
          updates.metraje_restante = Math.min(
            limiteMetraje,
            Number(producto.metraje_restante || 0) + consumo.metraje
          );
        }
        await tx.productos.update({ where: { id: productoId }, data: updates });
      }

      await tx.ot_items.deleteMany({ where: { orden_id: id } });
      await tx.ordenes_trabajo.delete({ where: { id } });
    });

    res.json({ success: true, message: 'Orden eliminada y consumo devuelto al inventario' });
  } catch (error) {
    console.error('Error eliminar orden:', error);
    const msg = String(error?.message || '');
    if (msg === 'Orden no encontrada' || msg.includes('No autorizado')) {
      return res.status(msg === 'Orden no encontrada' ? 404 : 403).json({ success: false, error: msg });
    }
    res.status(500).json({ success: false, error: msg || 'No se pudo eliminar la orden' });
  }
};

export default { crearOrden, listarOrdenes, obtenerOrden, editarOrden, eliminarOrden };
