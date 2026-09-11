import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { productosAPI, categoriasAPI, archivosAPI } from '../utils/api';
import '../styles/formulario.css';

export default function FormularioProducto({ producto, onGuardar }) {
  const usuario = useSelector((state) => state.auth.user);
  const isAdmin = usuario && usuario.role === 'ADMIN';

  if (!isAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <h3>Acceso denegado</h3>
        <p>No tienes permisos para crear o editar productos. Contacta con un administrador.</p>
      </div>
    );
  }
  const [formData, setFormData] = useState({
    nombre: '',
    categoria_id: '',
    marca: '',
    modelo: '',
    numero_serie: '',
    cantidad_total: 1,
    ubicacion: 'Almacén',
    estado: 'nuevo',
    fecha_adquisicion: new Date().toISOString().split('T')[0],
    foto_url: '',
    descripcion: '',
    activo_fijo: ''
  });

  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const [previewFoto, setPreviewFoto] = useState(null);

  useEffect(() => {
    cargarCategorias();
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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const parsed = type === 'checkbox' ? checked : (name.includes('cantidad') || name === 'id' ? parseInt(value) : value);
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
        alert('✅ Producto actualizado exitosamente');
      } else {
        // Crear
        const { data } = await productosAPI.crear(payload);
        productoGuardado = data.producto;
        alert('✅ Producto creado exitosamente');
      }

      // Subir archivo si existe
      if (archivo && productoGuardado) {
        try {
          await archivosAPI.subir(productoGuardado.id, archivo);
          alert('✅ Foto subida a Google Drive');
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
      <h2>{producto ? '✏️ Editar Producto' : '➕ Nuevo Producto'}</h2>

      {error && <div className="error-message">{error}</div>}

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
          </div>

          <div className="form-row">
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
            {loading ? '⏳ Guardando...' : (producto ? '💾 Actualizar' : '✅ Crear Producto')}
          </button>
        </div>
      </form>
    </div>
  );
}
