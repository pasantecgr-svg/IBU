import React, { useState, useEffect } from 'react';
import { productosAPI, categoriasAPI, usuariosAPI } from '../utils/api';
import { Check, Download, FileSpreadsheet, Minus, Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import '../styles/lista-productos.css';

export default function ListaProductos({ onEditar }) {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({
    categoria: '',
    dependencia: '',
    busqueda: ''
  });
  const [dependencias, setDependencias] = useState([]);
  const [busquedaInput, setBusquedaInput] = useState('');
  const [dependenciaBusqueda, setDependenciaBusqueda] = useState('');
  const [mostrarEdicion, setMostrarEdicion] = useState(null);
  const [edicion, setEdicion] = useState({});
  const [importando, setImportando] = useState(false);
  const [mensajeImportacion, setMensajeImportacion] = useState('');

  useEffect(() => {
    cargarDatos();
  }, [filtros]);

  useEffect(() => {
    usuariosAPI.dependencias().then(({ data }) => setDependencias(data.dependencias || [])).catch((err) => console.error('Error cargando dependencias:', err));
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [productosRes, categoriasRes] = await Promise.all([
        productosAPI.obtener(filtros),
        categoriasAPI.obtener()
      ]);
      const listaProductos = productosRes.data.productos || [];
      setProductos(listaProductos);
      setCategorias(categoriasRes.data.categorias || []);
    } catch (err) {
      setError(err.message);
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este producto?')) {
      try {
        await productosAPI.eliminar(id);
        cargarDatos();
      } catch (err) {
        console.error(err.response?.data?.error || 'Error al eliminar el producto');
      }
    }
  };

  const handleEditarClick = (producto) => {
    setMostrarEdicion(producto.id);
    setEdicion({ ...producto });
  };

  const handleGuardarEdicion = async (id) => {
    try {
      const payload = {
        ...edicion,
        categoria_id: edicion.categoria_id ? Number(edicion.categoria_id) : null,
        cantidad_total: Number(edicion.cantidad_total ?? 0),
        cantidad_disponible: Number(edicion.cantidad_disponible ?? 0),
        dependencia_codigo: edicion.dependencia_codigo || null,
        dependencia_nombre: edicion.dependencia_nombre || null,
        activo_fijo: edicion.activo_fijo || null,
        area: edicion.area || null,
        estado_mantenimiento: edicion.estado_mantenimiento || null,
        aporta_plan_mejoramiento: edicion.aporta_plan_mejoramiento || null,
        ubicacion: edicion.ubicacion || null,
        modelo: edicion.modelo || null,
        descripcion: edicion.descripcion || null,
        marca: edicion.marca || null,
        numero_serie: edicion.numero_serie || null,
        foto_url: edicion.foto_url || null,
        fecha_adquisicion: edicion.fecha_adquisicion || null,
        fecha_ultimo_mantenimiento: edicion.fecha_ultimo_mantenimiento || null,
        estado: edicion.estado || 'nuevo'
      };

      delete payload.categorias;
      delete payload.archivos;
      delete payload.created_at;
      delete payload.updated_at;
      delete payload.stock_bajo;
      delete payload.stock_estado;
      delete payload.stock_label;
      delete payload.id;

      await productosAPI.actualizar(id, payload);
      setMostrarEdicion(null);
      cargarDatos();
    } catch (err) {
      console.error('Error al actualizar: ' + (err.response?.data?.error || err.message));
      window.alert(err.response?.data?.error || 'No se pudo guardar el producto. Revisa los datos e intenta nuevamente.');
    }
  };

  const handleCancelEdicion = () => {
    setMostrarEdicion(null);
    setEdicion({});
  };

  const handleCambiarCantidad = async (id, cantidadDisponible) => {
    try {
      await productosAPI.actualizarCantidad(id, cantidadDisponible);
      cargarDatos();
    } catch (err) {
      console.error('Error al actualizar cantidad: ' + err.message);
    }
  };

  const manejarBusqueda = () => {
    setFiltros((prev) => ({ ...prev, busqueda: busquedaInput.trim() }));
  };

  const manejarBusquedaDependencia = () => {
    const texto = dependenciaBusqueda.trim();
    if (!texto) {
      setFiltros((prev) => ({ ...prev, dependencia: '' }));
      return;
    }

    const dependenciaCoincidente = dependencias.find((dependencia) =>
      dependencia.nombre.toLowerCase().includes(texto.toLowerCase())
      || dependencia.id.toLowerCase().includes(texto.toLowerCase())
    );

    setFiltros((prev) => ({
      ...prev,
      dependencia: dependenciaCoincidente ? dependenciaCoincidente.id : texto
    }));
  };

  const descargarPlantilla = async () => {
    try {
      const data = await productosAPI.descargarPlantilla();
      const blob = data instanceof Blob ? data : new Blob([data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = 'plantilla_productos.xlsx';
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      setTimeout(() => window.URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.error('No se pudo descargar la plantilla: ' + (err?.message || err));
      setMensajeImportacion('No se pudo descargar la plantilla. Verifica tu sesión e intenta nuevamente.');
    }
  };

  const importarArchivo = async (event) => {
    const archivo = event.target.files?.[0];
    event.target.value = '';
    if (!archivo) return;
    try {
      setImportando(true);
      setMensajeImportacion('');
      const { data } = await productosAPI.importar(archivo);
      const detalle = data.errores?.length ? ` Filas omitidas: ${data.errores.length}.` : '';
      setMensajeImportacion(`Se importaron ${data.creados} activos correctamente.${detalle}`);
      await cargarDatos();
    } catch (err) {
      const respuesta = err.response?.data;
      const detalle = respuesta?.errores?.length ? ` ${respuesta.errores.join(' ')}` : '';
      setMensajeImportacion(`${respuesta?.error || 'No se pudo importar el archivo.'}${detalle}`);
    } finally {
      setImportando(false);
    }
  };

  if (loading) return <div className="loading">Cargando productos...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="lista-productos">
      <h2><Search size={22} aria-hidden="true" /> Lista de Productos</h2>

      <section className="importador-productos">
        <div className="importador-copy">
          <FileSpreadsheet size={21} aria-hidden="true" />
          <div>
            <strong>Carga masiva de productos</strong>
            <span>Usa la plantilla para registrar varios productos de una vez.</span>
          </div>
        </div>
        <div className="importador-actions">
          <button type="button" className="btn btn-outline" onClick={descargarPlantilla}>
            <Download size={16} aria-hidden="true" /> Descargar plantilla
          </button>
          <label className="btn btn-primary import-file-label">
            <Upload size={16} aria-hidden="true" /> {importando ? 'Importando...' : 'Subir plantilla'}
            <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={importarArchivo} disabled={importando} />
          </label>
        </div>
      </section>

      {mensajeImportacion && <div className="importador-mensaje" role="status">{mensajeImportacion}</div>}

      <div className="filtros-container">
        <div className="campo-busqueda">
          <input
            type="text"
            placeholder="Buscar por nombre, modelo, serie o área..."
            value={busquedaInput}
            onChange={(e) => setBusquedaInput(e.target.value)}
            className="input-busqueda"
          />
          <button type="button" className="btn-busqueda" onClick={manejarBusqueda} aria-label="Buscar productos">
            <Search size={16} aria-hidden="true" />
            <span>Buscar</span>
          </button>
        </div>

        <select
          value={filtros.categoria}
          onChange={(e) => setFiltros({ ...filtros, categoria: e.target.value })}
          className="select-categoria"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.nombre}
            </option>
          ))}
        </select>

        <div className="campo-busqueda campo-dependencia">
          <input
            type="text"
            list="dependencias-list"
            placeholder="Buscar dependencia..."
            value={dependenciaBusqueda}
            onChange={(e) => setDependenciaBusqueda(e.target.value)}
            className="input-busqueda input-dependencia"
          />
          <button type="button" className="btn-busqueda" onClick={manejarBusquedaDependencia} aria-label="Buscar por dependencia">
            <Search size={16} aria-hidden="true" />
            <span>Buscar</span>
          </button>
          <datalist id="dependencias-list">
            {dependencias.map((dependencia) => (
              <option key={dependencia.id} value={dependencia.nombre} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="tabla-responsiva">
        <table className="tabla-productos">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Dependencia</th>
              <th>Stock</th>
              <th>Ubicación</th>
              <th>Estado</th>
              <th>Activo fijo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.length > 0 ? (
              productos.map((producto) => (
                <tr key={producto.id} className={`producto-row estado-${producto.estado} ${mostrarEdicion === producto.id ? 'fila-edicion' : ''}`}>
                  {mostrarEdicion === producto.id ? (
                    <>
                      <td className="edicion-celda">
                        <label className="edicion-label">
                          <span>Nombre</span>
                          <input
                            type="text"
                            value={edicion.nombre || ''}
                            onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })}
                            className="input-edicion"
                          />
                        </label>
                      </td>
                      <td className="edicion-celda">
                        <label className="edicion-label">
                          <span>Categoría</span>
                          <select
                            value={edicion.categoria_id || ''}
                            onChange={(e) => setEdicion({ ...edicion, categoria_id: e.target.value })}
                            className="input-edicion"
                          >
                            <option value="">Sin categoría</option>
                            {categorias.map((cat) => (
                              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                            ))}
                          </select>
                        </label>
                      </td>
                      <td className="edicion-celda">
                        <label className="edicion-label">
                          <span>Dependencia</span>
                          <select
                            value={edicion.dependencia_codigo || ''}
                            onChange={(e) => {
                              const selected = dependencias.find((item) => item.id === e.target.value);
                              setEdicion({
                                ...edicion,
                                dependencia_codigo: selected?.id || '',
                                dependencia_nombre: selected?.nombre || ''
                              });
                            }}
                            className="input-edicion"
                          >
                            <option value="">Sin dependencia</option>
                            {dependencias.map((dep) => (
                              <option key={dep.id} value={dep.id}>{dep.nombre}</option>
                            ))}
                          </select>
                        </label>
                      </td>
                      <td className="edicion-celda">
                        <label className="edicion-label">
                          <span>Stock</span>
                          <div className="edicion-stock">
                            <input
                              type="number"
                              value={edicion.cantidad_disponible ?? 0}
                              onChange={(e) => setEdicion({ ...edicion, cantidad_disponible: parseInt(e.target.value) || 0 })}
                              className="input-edicion"
                            />
                            <span>/</span>
                            <input
                              type="number"
                              value={edicion.cantidad_total ?? 0}
                              onChange={(e) => setEdicion({ ...edicion, cantidad_total: parseInt(e.target.value) || 0 })}
                              className="input-edicion"
                            />
                          </div>
                        </label>
                      </td>
                      <td className="edicion-celda">
                        <label className="edicion-label">
                          <span>Ubicación</span>
                          <input
                            type="text"
                            value={edicion.ubicacion || ''}
                            onChange={(e) => setEdicion({ ...edicion, ubicacion: e.target.value })}
                            className="input-edicion"
                          />
                        </label>
                      </td>
                      <td className="edicion-celda">
                        <label className="edicion-label">
                          <span>Estado</span>
                          <select
                            value={edicion.estado || 'nuevo'}
                            onChange={(e) => setEdicion({ ...edicion, estado: e.target.value })}
                            className="input-edicion"
                          >
                            <option value="nuevo">Nuevo</option>
                            <option value="usado">Usado</option>
                            <option value="dañado">Dañado</option>
                            <option value="reparacion">Reparación</option>
                          </select>
                        </label>
                      </td>
                      <td className="edicion-celda">
                        <label className="edicion-label">
                          <span>Activo fijo</span>
                          <input
                            type="text"
                            value={edicion.activo_fijo || ''}
                            onChange={(e) => setEdicion({ ...edicion, activo_fijo: e.target.value })}
                            className="input-edicion"
                          />
                        </label>
                      </td>
                      <td className="acciones-edicion">
                        <button
                          className="btn-guardar"
                          onClick={() => handleGuardarEdicion(producto.id)}
                        >
                          <Check size={16} aria-hidden="true" /> Guardar
                        </button>
                        <button
                          className="btn-cancelar"
                          onClick={handleCancelEdicion}
                        >
                          <X size={16} aria-hidden="true" /> Cancelar
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="producto-nombre">
                        {producto.foto_url ? (
                          <img src={producto.foto_url} alt={producto.nombre} className="producto-thumb" />
                        ) : (
                          <div className="producto-thumb placeholder" />
                        )}
                        <div className="producto-meta">
                          <strong>{producto.nombre || 'Sin nombre'}</strong>
                          <small>{producto.marca || 'Sin marca'} {producto.modelo ? `· ${producto.modelo}` : ''}</small>
                        </div>
                      </td>
                      <td>{producto.categorias?.nombre || 'N/A'}</td>
                      <td>
                        <span className="chip dependencia-chip">
                          {producto.dependencia_nombre || 'Sin asignar'}
                        </span>
                      </td>
                      <td>
                        <div className="stock-bloque">
                          <strong>{producto.cantidad_disponible}</strong>
                          <span>/{producto.cantidad_total}</span>
                        </div>
                      </td>
                      <td>{producto.ubicacion || 'Almacén'}</td>
                      <td>
                        <span className={`badge estado-${producto.estado || 'nuevo'}`}>
                          {producto.estado || 'nuevo'}
                        </span>
                      </td>
                      <td>{producto.activo_fijo || '-'}</td>
                      <td className="acciones">
                        <button
                          className="btn-accion edit"
                          onClick={() => handleEditarClick(producto)}
                          title="Editar"
                        >
                          <Pencil size={16} aria-hidden="true" />
                        </button>
                        <button
                          className="btn-accion delete"
                          onClick={() => handleEliminar(producto.id)}
                          title="Eliminar"
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="sin-resultados">
                  No hay productos que mostrar
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="tabla-info">
        <p>Total de productos: <strong>{productos.length}</strong></p>
      </div>
    </div>
  );
}
