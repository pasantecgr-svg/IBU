import React, { useEffect, useState } from 'react';
import { ordenesAPI, productosAPI, reportesAPI } from '../utils/api';
import { ClipboardList, Download, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import '../styles/ordenes.css';

export default function OrdenesTrabajo() {
  const [ordenes, setOrdenes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ordenEditando, setOrdenEditando] = useState(null);
  const [form, setForm] = useState({ titulo: '', descripcion: '', mantis_ticket: '', items: [{ producto_id: '', cantidad: 0, metraje_usado: 0, cable_descripcion: '' }] });
  const [error, setError] = useState('');

  const cargarOrdenes = async () => {
    try {
      setLoading(true);
      const { data } = await ordenesAPI.obtener();
      if (data?.ordenes) setOrdenes(data.ordenes);
    } catch (e) {
      console.error('Error cargar ordenes', e);
    } finally {
      setLoading(false);
    }
  };

  const cargarProductos = async () => {
    try {
      const { data } = await productosAPI.obtener();
      if (data?.productos) setProductos(data.productos);
    } catch (e) {
      console.error('Error cargar productos', e);
    }
  };

  useEffect(() => {
    cargarOrdenes();
    cargarProductos();
  }, []);

  const handleItemChange = (index, field, value) => {
    const items = [...form.items];
    items[index][field] = value;
    setForm({ ...form, items });
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { producto_id: '', cantidad: 0, metraje_usado: 0, cable_descripcion: '' }] });
  const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });

  const editarOrden = (orden) => {
    setOrdenEditando(orden.id);
    setError('');
    setForm({
      titulo: orden.titulo || '',
      descripcion: orden.descripcion || '',
      mantis_ticket: orden.mantis_ticket || '',
      items: (orden.items || []).map((item) => ({
        producto_id: item.producto_id,
        cantidad: Number(item.cantidad || 0),
        metraje_usado: Number(item.metraje_usado || 0),
        cable_descripcion: item.cable_descripcion || ''
      }))
    });
  };

  const cancelarEdicion = () => {
    setOrdenEditando(null);
    setError('');
    setForm({ titulo: '', descripcion: '', mantis_ticket: '', items: [{ producto_id: '', cantidad: 0, metraje_usado: 0, cable_descripcion: '' }] });
  };

  const eliminarOrden = async (orden) => {
    const numero = orden.numero || orden.secuencia || 'seleccionada';
    if (!window.confirm(`¿Eliminar la orden ${numero}? El consumo será devuelto al inventario.`)) return;

    try {
      setError('');
      await ordenesAPI.eliminar(orden.id);
      if (ordenEditando === orden.id) cancelarEdicion();
      await cargarOrdenes();
      await cargarProductos();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'No se pudo eliminar la orden');
    }
  };

  const descargarPDF = async (orden) => {
    try {
      const { data } = await reportesAPI.generarOrdenPDF(orden.id);
      const url = window.URL.createObjectURL(data);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `orden_trabajo_${orden.numero || orden.secuencia}.pdf`;
      enlace.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo descargar el PDF');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { titulo: form.titulo, descripcion: form.descripcion, mantis_ticket: form.mantis_ticket, items: form.items.map(it => ({ ...it, producto_id: it.producto_id || null })) };
      const { data } = ordenEditando
        ? await ordenesAPI.actualizar(ordenEditando, payload)
        : await ordenesAPI.crear(payload);
      if (data?.success) {
        setOrdenEditando(null);
        setForm({ titulo: '', descripcion: '', mantis_ticket: '', items: [{ producto_id: '', cantidad: 0, metraje_usado: 0, cable_descripcion: '' }] });
        cargarOrdenes();
        cargarProductos();
      } else {
        setError(data?.error || 'Error creando orden');
      }
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Error creando orden');
    }
  };

  return (
    <div className="ordenes-page">
      <h2><ClipboardList size={23} aria-hidden="true" /> Órdenes de Trabajo</h2>
      <div className="ordenes-grid">
        <section className="orden-form">
          <div className="section-heading">
            <div>
              <h3>{ordenEditando ? 'Editar Orden de Trabajo' : 'Crear Orden de Trabajo'}</h3>
              <p>{ordenEditando ? 'Puedes agregar productos o ajustar el consumo de esta orden.' : 'El número de OT se asigna automáticamente al guardar.'}</p>
            </div>
          </div>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={submit}>
            <label>Título</label>
            <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required />
            <label>Descripción</label>
            <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            <label>Mantis ticket (opcional)</label>
            <input value={form.mantis_ticket} onChange={(e) => setForm({ ...form, mantis_ticket: e.target.value })} />

            <div className="items-list">
              <div className="items-heading">
                <h4>Productos de la orden</h4>
                <span>{form.items.length} {form.items.length === 1 ? 'producto' : 'productos'}</span>
              </div>
              {form.items.map((it, idx) => (
                <div className="item-card" key={idx}>
                  <div className="item-card-header">
                    <strong>Producto {idx + 1}</strong>
                    {form.items.length > 1 && (
                      <button type="button" className="btn-icon btn-remove" onClick={() => removeItem(idx)} title="Eliminar producto" aria-label={`Eliminar producto ${idx + 1}`}>
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  <div className="item-fields">
                    <label>
                      Producto
                      <select value={it.producto_id} onChange={(e) => handleItemChange(idx, 'producto_id', e.target.value)} required>
                        <option value="">Seleccione un producto</option>
                        {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre} (disponible: {p.cantidad_disponible})</option>)}
                      </select>
                    </label>
                    <label>
                      Cantidad
                      <input type="number" min="0" placeholder="0" value={it.cantidad} onChange={(e) => handleItemChange(idx, 'cantidad', Number(e.target.value))} />
                    </label>
                    <label>
                      Metraje usado
                      <input type="number" min="0" placeholder="0" value={it.metraje_usado} onChange={(e) => handleItemChange(idx, 'metraje_usado', Number(e.target.value))} />
                    </label>
                    <label>
                      Descripción del cable
                      <input placeholder="Opcional" value={it.cable_descripcion} onChange={(e) => handleItemChange(idx, 'cable_descripcion', e.target.value)} />
                    </label>
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-outline" onClick={addItem}><Plus size={16} aria-hidden="true" /> Añadir producto</button>
            </div>

            <div className="form-buttons">
              <button type="submit" className="btn btn-primary btn-submit"><Save size={17} aria-hidden="true" /> {ordenEditando ? 'Guardar cambios' : 'Crear orden'}</button>
              {ordenEditando && (
                <button type="button" className="btn btn-cancel" onClick={cancelarEdicion}><X size={17} aria-hidden="true" /> Cancelar</button>
              )}
            </div>
          </form>
        </section>

        <section className="orden-list">
          <h3>Lista de Órdenes</h3>
          {loading ? <p>Cargando...</p> : (
            <table className="tabla">
              <thead>
                <tr><th>N.º OT</th><th>Producto</th><th>Utilizado</th><th aria-label="Acciones" /></tr>
              </thead>
              <tbody>
                {ordenes.map((o) => (
                  <tr key={o.id}>
                    <td><strong className="numero-orden">{o.numero || o.secuencia || 'Pendiente'}</strong></td>
                    <td>{o.items?.map((item) => item.productos?.nombre || 'Producto no disponible').join(', ') || '-'}</td>
                    <td>{o.items?.map((item) => {
                      const partes = [];
                      if (item.cantidad > 0) partes.push(`${item.cantidad} unidades`);
                      if (item.metraje_usado > 0) partes.push(`${item.metraje_usado} m`);
                      return partes.join(' + ') || 'Sin consumo';
                    }).join(', ') || 'Sin consumo'}</td>
                    <td className="orden-actions">
                      <button type="button" className="btn-icon btn-edit-order" onClick={() => editarOrden(o)} title="Editar orden" aria-label={`Editar orden ${o.numero || o.secuencia || ''}`}>
                        <Pencil size={16} aria-hidden="true" />
                      </button>
                      <button type="button" className="btn-icon btn-delete-order" onClick={() => eliminarOrden(o)} title="Eliminar orden" aria-label={`Eliminar orden ${o.numero || o.secuencia || ''}`}>
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                      <button type="button" className="btn-icon btn-pdf-order" onClick={() => descargarPDF(o)} title="Descargar PDF" aria-label={`Descargar PDF de orden ${o.numero || o.secuencia || ''}`}>
                        <Download size={16} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
