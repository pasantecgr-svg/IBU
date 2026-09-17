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
      await productosAPI.actualizar(id, edicion);
      setMostrarEdicion(null);
      cargarDatos();
    } catch (err) {
      console.error('Error al actualizar: ' + err.message);
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

  const descargarPlantilla = async () => {
    try {
      const { data } = await productosAPI.descargarPlantilla();
      const url = window.URL.createObjectURL(data);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = 'plantilla_productos.xlsx';
      enlace.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('No se pudo descargar la plantilla: ' + err.message);
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
        <input
          type="text"
          placeholder="Buscar por nombre, modelo o serie..."
          value={filtros.busqueda}
          onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
          className="input-busqueda"
        />

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

        <select
          value={filtros.dependencia}
          onChange={(e) => setFiltros({ ...filtros, dependencia: e.target.value })}
          className="select-categoria"
        >
          <option value="">Todas las dependencias</option>
          {dependencias.map((dependencia) => <option key={dependencia.id} value={dependencia.id}>{dependencia.nombre}</option>)}
        </select>
      </div>

      <div className="tabla-responsiva">
        <table className="tabla-productos">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Área</th>
              <th>Dependencia</th>
              <th>Mantenimiento</th>
              <th>Plan de mejoramiento</th>
              <th>Marca/Modelo</th>
              <th>Total</th>
              <th>Disponible</th>
              <th>Ubicación</th>
                <th>Estado</th>
                <th>Activo Fijo</th>
                <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.length > 0 ? (
              productos.map((producto) => (
                <tr key={producto.id} className={`producto-row estado-${producto.estado}`}>
                  {mostrarEdicion === producto.id ? (
                    <>
                      <td>
                        <input
                          type="text"
                          value={edicion.nombre || ''}
                          onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })}
                          className="input-edicion"
                        />
                      </td>
                      <td>{producto.categorias?.nombre}</td>
                      <td>
                        <input
                          type="text"
                          value={edicion.area || ''}
                          onChange={(e) => setEdicion({ ...edicion, area: e.target.value })}
                          className="input-edicion"
                          placeholder="Área"
                        />
                      </td>
                      <td>{producto.dependencia_nombre || '-'}</td>
                      <td>
                        <input
                          type="text"
                          value={edicion.estado_mantenimiento || ''}
                          onChange={(e) => setEdicion({ ...edicion, estado_mantenimiento: e.target.value })}
                          className="input-edicion"
                          placeholder="Estado mantenimiento"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={edicion.aporta_plan_mejoramiento || ''}
                          onChange={(e) => setEdicion({ ...edicion, aporta_plan_mejoramiento: e.target.value })}
                          className="input-edicion"
                          placeholder="Aporta al plan"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={edicion.modelo || ''}
                          onChange={(e) => setEdicion({ ...edicion, modelo: e.target.value })}
                          className="input-edicion"
                          placeholder="Modelo"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={edicion.cantidad_total || 0}
                          onChange={(e) => setEdicion({ ...edicion, cantidad_total: parseInt(e.target.value) })}
                          className="input-edicion"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={edicion.cantidad_disponible || 0}
                          onChange={(e) => setEdicion({ ...edicion, cantidad_disponible: parseInt(e.target.value) })}
                          className="input-edicion"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={edicion.ubicacion || ''}
                          onChange={(e) => setEdicion({ ...edicion, ubicacion: e.target.value })}
                          className="input-edicion"
                        />
                      </td>
                      <td>
                        <select
                          value={edicion.estado || ''}
                          onChange={(e) => setEdicion({ ...edicion, estado: e.target.value })}
                          className="input-edicion"
                        >
                          <option value="nuevo">Nuevo</option>
                          <option value="usado">Usado</option>
                          <option value="dañado">Dañado</option>
                          <option value="reparacion">Reparación</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={edicion.activo_fijo || ''}
                          onChange={(e) => setEdicion({ ...edicion, activo_fijo: e.target.value })}
                          className="input-edicion"
                          placeholder="Activo Fijo"
                        />
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
                        <strong>{producto.nombre}</strong>
                      </td>
                      <td>{producto.categorias?.nombre || 'N/A'}</td>
                      <td>{producto.area || '-'}</td>
                      <td>{producto.dependencia_nombre || 'Sin asignar'}</td>
                      <td>{producto.estado_mantenimiento || '-'}</td>
                      <td>{producto.aporta_plan_mejoramiento || '-'}</td>
                      <td>{producto.marca || '-'} / {producto.modelo || '-'}</td>
                      <td className="cantidad-total">{producto.cantidad_total}</td>
                      <td>
                        <div className="cantidad-disponible">
                          <button
                            onClick={() => handleCambiarCantidad(producto.id, Math.max(0, producto.cantidad_disponible - 1))}
                            className="btn-cantidad"
                          >
                            <Minus size={15} aria-hidden="true" />
                          </button>
                          <span className={producto.cantidad_disponible === 0 ? 'sin-stock' : ''}>
                            {producto.cantidad_disponible}
                          </span>
                          <button
                            onClick={() => handleCambiarCantidad(producto.id, Math.min(producto.cantidad_total, producto.cantidad_disponible + 1))}
                            className="btn-cantidad"
                          >
                            <Plus size={15} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                      <td>{producto.ubicacion || 'Almacén'}</td>
                      <td>
                        <span className={`badge estado-${producto.estado}`}>
                          {producto.estado}
                        </span>
                      </td>
                      <td>
                        {producto.activo_fijo ? (
                          <span>{producto.activo_fijo}</span>
                        ) : (
                          <span className="muted">-</span>
                        )}
                      </td>
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
