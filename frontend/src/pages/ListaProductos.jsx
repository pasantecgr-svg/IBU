import React, { useState, useEffect } from 'react';
import { productosAPI, categoriasAPI } from '../utils/api';
import '../styles/lista-productos.css';

const STOCK_MINIMO_ALERTA = 5;

const obtenerProductosBajos = (lista) => {
  return (lista || []).filter((producto) => {
    const cantidad = Number(producto.cantidad_disponible ?? 0);
    return cantidad > 0 && cantidad <= STOCK_MINIMO_ALERTA;
  });
};

export default function ListaProductos({ onEditar }) {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alertaStock, setAlertaStock] = useState([]);
  const [filtros, setFiltros] = useState({
    categoria: '',
    busqueda: ''
  });
  const [mostrarEdicion, setMostrarEdicion] = useState(null);
  const [edicion, setEdicion] = useState({});

  useEffect(() => {
    cargarDatos();
  }, [filtros]);

  const notificarStockBajo = (productosActuales) => {
    const bajos = obtenerProductosBajos(productosActuales);
    if (bajos.length === 0) return;

    const mensaje = bajos
      .map((producto) => `${producto.nombre} (${producto.cantidad_disponible} uds.)`)
      .join(', ');

    try {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('⚠️ Stock bajo', {
            body: `Quedan pocas unidades: ${mensaje}`
          });
        } else if (Notification.permission === 'default') {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              new Notification('⚠️ Stock bajo', {
                body: `Quedan pocas unidades: ${mensaje}`
              });
            }
          });
        }
      }
    } catch (error) {
      console.error('No se pudo enviar la notificación del stock bajo:', error);
    }

    alert(`⚠️ Stock bajo: ${mensaje}`);
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [productosRes, categoriasRes] = await Promise.all([
        productosAPI.obtener(filtros),
        categoriasAPI.obtener()
      ]);
      const listaProductos = productosRes.data.productos || [];
      setProductos(listaProductos);
      setAlertaStock(obtenerProductosBajos(listaProductos));
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
        alert('Producto eliminado exitosamente');
        cargarDatos();
      } catch (err) {
        alert('Error al eliminar: ' + err.message);
      }
    }
  };

  const handleEditarClick = (producto) => {
    setMostrarEdicion(producto.id);
    setEdicion({ ...producto });
  };

  const handleGuardarEdicion = async (id) => {
    try {
      const response = await productosAPI.actualizar(id, edicion);
      const productoActualizado = response.data.producto;
      if (productoActualizado && Number(productoActualizado.cantidad_disponible ?? 0) <= STOCK_MINIMO_ALERTA) {
        notificarStockBajo([productoActualizado]);
      }
      alert('Producto actualizado exitosamente');
      setMostrarEdicion(null);
      cargarDatos();
    } catch (err) {
      alert('Error al actualizar: ' + err.message);
    }
  };

  const handleCancelEdicion = () => {
    setMostrarEdicion(null);
    setEdicion({});
  };

  const handleCambiarCantidad = async (id, cantidadDisponible) => {
    try {
      const response = await productosAPI.actualizarCantidad(id, cantidadDisponible);
      const productoActualizado = response.data.producto;
      if (productoActualizado && Number(productoActualizado.cantidad_disponible ?? 0) <= STOCK_MINIMO_ALERTA) {
        notificarStockBajo([productoActualizado]);
      }
      cargarDatos();
    } catch (err) {
      alert('Error al actualizar cantidad: ' + err.message);
    }
  };

  if (loading) return <div className="loading">Cargando productos...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="lista-productos">
      <h2>📋 Lista de Productos</h2>

      {alertaStock.length > 0 && (
        <div className="alerta-stock">
          <strong>⚠️ Stock bajo:</strong>
          <ul>
            {alertaStock.map((producto) => (
              <li key={producto.id}>
                {producto.nombre}: {producto.cantidad_disponible} unidades disponibles
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="filtros-container">
        <input
          type="text"
          placeholder="🔍 Buscar por nombre, modelo o serie..."
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
      </div>

      <div className="tabla-responsiva">
        <table className="tabla-productos">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Marca/Modelo</th>
              <th>Total</th>
              <th>Disponible</th>
              <th>Ubicación</th>
              <th>Estado</th>
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
                      <td className="acciones-edicion">
                        <button
                          className="btn-guardar"
                          onClick={() => handleGuardarEdicion(producto.id)}
                        >
                          ✅ Guardar
                        </button>
                        <button
                          className="btn-cancelar"
                          onClick={handleCancelEdicion}
                        >
                          ❌ Cancelar
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
                      <td>{producto.marca || '-'} / {producto.modelo || '-'}</td>
                      <td className="cantidad-total">{producto.cantidad_total}</td>
                      <td>
                        <div className="cantidad-disponible">
                          <button
                            onClick={() => handleCambiarCantidad(producto.id, Math.max(0, producto.cantidad_disponible - 1))}
                            className="btn-cantidad"
                          >
                            −
                          </button>
                          <span className={producto.cantidad_disponible === 0 ? 'sin-stock' : ''}>
                            {producto.cantidad_disponible}
                          </span>
                          <button
                            onClick={() => handleCambiarCantidad(producto.id, Math.min(producto.cantidad_total, producto.cantidad_disponible + 1))}
                            className="btn-cantidad"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td>{producto.ubicacion || 'Almacén'}</td>
                      <td>
                        <span className={`badge estado-${producto.estado}`}>
                          {producto.estado}
                        </span>
                      </td>
                      <td className="acciones">
                        <button
                          className="btn-accion edit"
                          onClick={() => handleEditarClick(producto)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-accion delete"
                          onClick={() => handleEliminar(producto.id)}
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="sin-resultados">
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
