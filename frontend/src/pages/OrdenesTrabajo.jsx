import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { ordenesAPI, productosAPI } from '../utils/api';
import '../styles/ordenes.css';

export default function OrdenesTrabajo() {
  const usuario = useSelector((state) => state.auth.user);
  const isAdmin = usuario && usuario.role === 'ADMIN';

  if (!isAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <h3>Acceso denegado</h3>
        <p>No tienes permisos para ver las órdenes de trabajo. Contacta con un administrador.</p>
      </div>
    );
  }
  const [ordenes, setOrdenes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
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

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { titulo: form.titulo, descripcion: form.descripcion, mantis_ticket: form.mantis_ticket, items: form.items.map(it => ({ ...it, producto_id: it.producto_id || null })) };
      const { data } = await ordenesAPI.crear(payload);
      if (data?.success) {
        setForm({ titulo: '', descripcion: '', mantis_ticket: '', items: [{ producto_id: '', cantidad: 0, metraje_usado: 0, cable_descripcion: '' }] });
        cargarOrdenes();
      } else {
        setError(data?.error || 'Error creando orden');
      }
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Error creando orden');
    }
  };

  return (
    <div className="ordenes-page">
      <h2>Órdenes de Trabajo</h2>
      <div className="ordenes-grid">
        <section className="orden-form">
          <h3>Crear Orden de Trabajo</h3>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={submit}>
            <label>Título</label>
            <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required />
            <label>Descripción</label>
            <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            <label>Mantis ticket (opcional)</label>
            <input value={form.mantis_ticket} onChange={(e) => setForm({ ...form, mantis_ticket: e.target.value })} />

            <div className="items-list">
              <h4>Items</h4>
              {form.items.map((it, idx) => (
                <div className="item-row" key={idx}>
                  <select value={it.producto_id} onChange={(e) => handleItemChange(idx, 'producto_id', e.target.value)} required>
                    <option value="">-- Seleccione producto --</option>
                    {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre} (disp: {p.cantidad_disponible})</option>)}
                  </select>
                  <input type="number" min="0" placeholder="cantidad" value={it.cantidad} onChange={(e) => handleItemChange(idx, 'cantidad', Number(e.target.value))} />
                  <input type="number" min="0" placeholder="metraje usado" value={it.metraje_usado} onChange={(e) => handleItemChange(idx, 'metraje_usado', Number(e.target.value))} />
                  <input placeholder="cable descripción" value={it.cable_descripcion} onChange={(e) => handleItemChange(idx, 'cable_descripcion', e.target.value)} />
                  <button type="button" className="btn-small" onClick={() => removeItem(idx)}>Eliminar</button>
                </div>
              ))}
              <button type="button" className="btn" onClick={addItem}>Añadir item</button>
            </div>

            <button type="submit" className="btn btn-primary">Crear Orden</button>
          </form>
        </section>

        <section className="orden-list">
          <h3>Lista de Órdenes</h3>
          {loading ? <p>Cargando...</p> : (
            <table className="tabla">
              <thead>
                <tr><th>ID</th><th>Título</th><th>Mantis</th><th>Items</th><th>Fecha</th></tr>
              </thead>
              <tbody>
                {ordenes.map((o) => (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>{o.titulo}</td>
                    <td>{o.mantis_ticket || '-'}</td>
                    <td>{o.items?.length || 0}</td>
                    <td>{new Date(o.created_at).toLocaleString()}</td>
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
