import React, { useState, useEffect } from 'react';
import { productosAPI, categoriasAPI, archivosAPI, usuariosAPI } from '../utils/api';
import { Check, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import '../styles/formulario.css';

export default function FormularioProducto({ producto, onGuardar }) {
  const [formData, setFormData] = useState({
    nombre: '',
    categoria_id: '',
    marca: '',
    modelo: '',
    numero_serie: '',
    cantidad_total: 1,
    unidad: '',
    metraje_total: '',
    metraje_restante: '',
    ubicacion: 'Almacén',
    dependencia_codigo: '',
    dependencia_nombre: '',
    estado: 'nuevo',
    fecha_adquisicion: new Date().toISOString().split('T')[0],
    foto_url: '',
    descripcion: '',
    activo_fijo: ''
  });

  const [categorias, setCategorias] = useState([]);
  const [dependencias, setDependencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const [previewFoto, setPreviewFoto] = useState(null);
  const [cargaRollos, setCargaRollos] = useState({ nombre: '', categoria_id: '', ubicacion: 'Almacén', metrajes: [''] });
  const [guardandoRollos, setGuardandoRollos] = useState(false);

  useEffect(() => {
    cargarCategorias();
    cargarDependencias();
    if (producto) {
      setFormData(producto);
    }
  }, [producto]);

  const cargarCategorias = async () => {
    try {
      const { data } = await categoriasAPI.obtener();
      setCategorias(data.categorias || []);
    } catch (err) {
      console.error('Error cargando categorías:', err);
    }
  };

  const cargarDependencias = async () => {
    try {
      const { data } = await usuariosAPI.dependencias();
      setDependencias(data.dependencias || []);
    } catch (err) {
      console.error('Error cargando dependencias:', err);
    }
  };

  const seleccionarDependencia = (e) => {
    const dependencia = dependencias.find((item) => item.id === e.target.value);
    setFormData({
      ...formData,
      dependencia_codigo: dependencia?.id || '',
      dependencia_nombre: dependencia?.nombre || ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const isNumeric = name.includes('cantidad') || name.includes('metraje') || name === 'id';
    const parsed = type === 'checkbox' ? checked : (isNumeric && value !== '' ? parseInt(value, 10) : value);
    setFormData({ ...formData, [name]: parsed });
  };

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewFoto(event.target.result);
        setFormData({ ...formData, foto_url: event.target.result });
      };
      reader.readAsDataURL(file);
      setArchivo(file);
    }
  };

  const actualizarMetrajeRollo = (index, value) => {
    const metrajes = [...cargaRollos.metrajes];
    metrajes[index] = value;
    setCargaRollos({ ...cargaRollos, metrajes });
  };

  const agregarMetraje = () => setCargaRollos({ ...cargaRollos, metrajes: [...cargaRollos.metrajes, ''] });

  const quitarMetraje = (index) => {
    if (cargaRollos.metrajes.length === 1) return;
    setCargaRollos({ ...cargaRollos, metrajes: cargaRollos.metrajes.filter((_, itemIndex) => itemIndex !== index) });
  };

  const crearRollos = async (event) => {
    event.preventDefault();
    const metrajes = cargaRollos.metrajes.map((metraje) => Number(metraje)).filter((metraje) => Number.isInteger(metraje) && metraje > 0);
    if (!cargaRollos.nombre.trim() || !cargaRollos.categoria_id || metrajes.length !== cargaRollos.metrajes.length) {
      setError('Completa el nombre, la categoría y un metraje válido para cada rollo.');
      return;
    }

    try {
      setGuardandoRollos(true);
      setError(null);
      await Promise.all(metrajes.map((metraje, index) => productosAPI.crear({
        nombre: `${cargaRollos.nombre.trim()} - Rollo ${index + 1}`,
        categoria_id: cargaRollos.categoria_id,
        cantidad_total: 1,
        unidad: 'metros',
        metraje_total: metraje,
        metraje_restante: metraje,
        ubicacion: cargaRollos.ubicacion || 'Almacén',
        estado: 'nuevo'
      })));
      setCargaRollos({ nombre: '', categoria_id: '', ubicacion: 'Almacén', metrajes: [''] });
      onGuardar();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron crear los rollos');
      console.error(err.response?.data?.error || 'No se pudieron crear los rollos');
    } finally {
      setGuardandoRollos(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nombre || !formData.categoria_id) {
      setError('El nombre y la categoría son obligatorios');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Sanitizar números: asegurarnos que sean enteros y dentro del rango INT4
      const MAX_INT4 = 2147483647;
      const payload = {
        ...formData,
        cantidad_total: Math.max(1, Math.min(MAX_INT4, Number(formData.cantidad_total) || 1)),
        cantidad_disponible: formData.cantidad_disponible !== undefined ? Math.max(0, Math.min(MAX_INT4, Number(formData.cantidad_disponible) || 0)) : undefined
      };

      let productoGuardado;
      if (producto) {
        // Actualizar
        await productosAPI.actualizar(producto.id, payload);
        productoGuardado = { ...producto, ...payload };
      } else {
        // Crear
        const { data } = await productosAPI.crear(payload);
        productoGuardado = data.producto;
      }

      // Subir archivo si existe
      if (archivo && productoGuardado) {
        try {
          await archivosAPI.subir(productoGuardado.id, archivo);
        } catch (err) {
          console.warn('Advertencia: No se pudo subir la foto:', err.message);
        }
      }

      onGuardar();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      console.error('Error guardando producto:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="formulario-container">
      <h2>{producto ? <><Pencil size={22} aria-hidden="true" /> Editar Producto</> : <><Plus size={22} aria-hidden="true" /> Nuevo Producto</>}</h2>

      {error && <div className="error-message">{error}</div>}

      {!producto && (
        <section className="carga-rollos formulario-carga-rollos">
          <div className="carga-rollos-heading">
            <div>
              <h3>Carga rápida de rollos</h3>
              <p>Registra una sola vez el cable y asigna el metraje de cada rollo.</p>
            </div>
          </div>
          <form onSubmit={crearRollos} className="carga-rollos-form">
            <label>Nombre del cable
              <input value={cargaRollos.nombre} onChange={(e) => setCargaRollos({ ...cargaRollos, nombre: e.target.value })} placeholder="Cable UTP Cat 6" required />
            </label>
            <label>Categoría
              <select value={cargaRollos.categoria_id} onChange={(e) => setCargaRollos({ ...cargaRollos, categoria_id: e.target.value })} required>
                <option value="">Selecciona una categoría</option>
                {categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
              </select>
            </label>
            <label>Ubicación
              <input value={cargaRollos.ubicacion} onChange={(e) => setCargaRollos({ ...cargaRollos, ubicacion: e.target.value })} />
            </label>
            <div className="metrajes-rollos">
              <div className="metrajes-heading"><strong>Metraje por rollo</strong><span>{cargaRollos.metrajes.length} rollos</span></div>
              {cargaRollos.metrajes.map((metraje, index) => (
                <div className="metraje-row" key={index}>
                  <span>Rollo {index + 1}</span>
                  <input type="number" min="1" value={metraje} onChange={(e) => actualizarMetrajeRollo(index, e.target.value)} placeholder="Metros" required />
                  <button type="button" className="btn-icon" onClick={() => quitarMetraje(index)} disabled={cargaRollos.metrajes.length === 1} title="Quitar rollo" aria-label={`Quitar rollo ${index + 1}`}><Trash2 size={16} aria-hidden="true" /></button>
                </div>
              ))}
              <button type="button" className="btn btn-outline" onClick={agregarMetraje}><Plus size={15} aria-hidden="true" /> Agregar otro rollo</button>
            </div>
            <button type="submit" className="btn btn-primary" disabled={guardandoRollos}>{guardandoRollos ? 'Creando rollos...' : 'Crear rollos'}</button>
          </form>
        </section>
      )}

      <form onSubmit={handleSubmit} className="formulario-producto">
        <div className="form-section">
          <h3>Información Básica</h3>

          <div className="form-group">
            <label>Nombre del Equipo *</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleInputChange}
              required
              placeholder="ej: Router Cisco"
              className="form-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Categoría *</label>
              <select
                name="categoria_id"
                value={formData.categoria_id}
                onChange={handleInputChange}
                required
                className="form-input"
              >
                <option value="">Selecciona una categoría</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Marca</label>
              <input
                type="text"
                name="marca"
                value={formData.marca}
                onChange={handleInputChange}
                placeholder="ej: Cisco"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Número de Activo Fijo</label>
              <input
                type="text"
                name="activo_fijo"
                value={formData.activo_fijo || ''}
                onChange={handleInputChange}
                placeholder="ej: 12345 (opcional)"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Modelo</label>
              <input
                type="text"
                name="modelo"
                value={formData.modelo}
                onChange={handleInputChange}
                placeholder="ej: Catalyst 3850"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Número de Serie</label>
              <input
                type="text"
                name="numero_serie"
                value={formData.numero_serie}
                onChange={handleInputChange}
                placeholder="ej: SN12345678"
                className="form-input"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Cantidad y Ubicación</h3>

          <div className="form-row">
            <div className="form-group">
              <label>Cantidad Total *</label>
              <input
                type="number"
                name="cantidad_total"
                value={formData.cantidad_total}
                onChange={handleInputChange}
                min="1"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Ubicación</label>
              <input
                type="text"
                name="ubicacion"
                value={formData.ubicacion}
                onChange={handleInputChange}
                placeholder="ej: Almacén A, Rack 3"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Unidad</label>
              <select name="unidad" value={formData.unidad || ''} onChange={handleInputChange} className="form-input">
                <option value="">Unidades</option>
                <option value="metros">Metros</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Metraje total</label>
              <input type="number" name="metraje_total" value={formData.metraje_total ?? ''} onChange={handleInputChange} min="0" placeholder="Solo para cables" className="form-input" />
            </div>
            <div className="form-group">
              <label>Metraje restante</label>
              <input type="number" name="metraje_restante" value={formData.metraje_restante ?? ''} onChange={handleInputChange} min="0" placeholder="Por defecto, igual al total" className="form-input" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Dependencia responsable</label>
              <select name="dependencia_codigo" value={formData.dependencia_codigo || ''} onChange={seleccionarDependencia} className="form-input">
                <option value="">Sin dependencia asignada</option>
                {dependencias.map((dependencia) => <option key={dependencia.id} value={dependencia.id}>{dependencia.nombre}</option>)}
              </select>
              <small>Redes, Sistemas de Información o Mantenimiento.</small>
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select
                name="estado"
                value={formData.estado}
                onChange={handleInputChange}
                className="form-input"
              >
                <option value="nuevo">Nuevo</option>
                <option value="usado">Usado</option>
                <option value="dañado">Dañado</option>
                <option value="reparacion">Reparación</option>
              </select>
            </div>

            <div className="form-group">
              <label>Fecha de Adquisición</label>
              <input
                type="date"
                name="fecha_adquisicion"
                value={formData.fecha_adquisicion}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Foto y Descripción</h3>

          <div className="form-group">
            <label>Foto del Equipo</label>
            <div className="file-input-wrapper">
              <input
                type="file"
                id="foto-input"
                accept="image/*"
                onChange={handleFotoChange}
                className="file-input"
              />
              <label htmlFor="foto-input" className="file-label">
                📷 Seleccionar Foto
              </label>
            </div>
            {previewFoto && (
              <div className="foto-preview">
                <img src={previewFoto} alt="Preview" />
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <textarea
              name="descripcion"
              value={formData.descripcion}
              onChange={handleInputChange}
              placeholder="Notas adicionales sobre el equipo..."
              className="form-textarea"
              rows="4"
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-large"
          >
            {loading ? 'Guardando...' : (producto ? <><Save size={17} aria-hidden="true" /> Actualizar</> : <><Check size={17} aria-hidden="true" /> Crear Producto</>)}
          </button>
        </div>
      </form>
    </div>
  );
}
