import React, { useState, useEffect } from 'react';
import { categoriasAPI } from '../utils/api';
import '../styles/categorias.css';

export default function GestionCategorias() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [editando, setEditando] = useState(null);
  const [textEdicion, setTextEdicion] = useState('');

  useEffect(() => {
    cargarCategorias();
  }, []);

  const cargarCategorias = async () => {
    try {
      setLoading(true);
      const { data } = await categoriasAPI.obtener();
      setCategorias(data.categorias || []);
    } catch (err) {
      setError(err.message);
      console.error('Error cargando categorías:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCrear = async (e) => {
    e.preventDefault();

    if (!nuevaCategoria.trim()) {
      alert('El nombre de la categoría es requerido');
      return;
    }

    try {
      await categoriasAPI.crear({ nombre: nuevaCategoria });
      alert('✅ Categoría creada exitosamente');
      setNuevaCategoria('');
      cargarCategorias();
    } catch (err) {
      alert('Error al crear categoría: ' + err.message);
    }
  };

  const handleEditar = (categoria) => {
    setEditando(categoria.id);
    setTextEdicion(categoria.nombre);
  };

  const handleGuardarEdicion = async (id) => {
    if (!textEdicion.trim()) {
      alert('El nombre es requerido');
      return;
    }

    try {
      await categoriasAPI.actualizar(id, { nombre: textEdicion });
      alert('✅ Categoría actualizada');
      setEditando(null);
      cargarCategorias();
    } catch (err) {
      alert('Error al actualizar: ' + err.message);
    }
  };

  const handleEliminar = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta categoría?')) {
      try {
        await categoriasAPI.eliminar(id);
        alert('✅ Categoría eliminada');
        cargarCategorias();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }
  };

  if (loading) return <div className="loading">Cargando categorías...</div>;

  return (
    <div className="gestion-categorias">
      <h2>🏷️ Gestión de Categorías</h2>

      <div className="crear-categoria">
        <h3>Crear Nueva Categoría</h3>
        <form onSubmit={handleCrear} className="form-categoria">
          <div className="form-group">
            <input
              type="text"
              value={nuevaCategoria}
              onChange={(e) => setNuevaCategoria(e.target.value)}
              placeholder="ej: Switches, Routers, Cables..."
              className="form-input"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            ➕ Crear Categoría
          </button>
        </form>
      </div>

      <div className="categorias-list">
        <h3>Categorías Existentes</h3>
        {error && <div className="error">{error}</div>}

        {categorias.length > 0 ? (
          <div className="categorias-grid">
            {categorias.map((categoria) => (
              <div key={categoria.id} className="categoria-card">
                {editando === categoria.id ? (
                  <div className="edicion-content">
                    <input
                      type="text"
                      value={textEdicion}
                      onChange={(e) => setTextEdicion(e.target.value)}
                      className="input-edicion"
                    />
                    <div className="buttons">
                      <button
                        onClick={() => handleGuardarEdicion(categoria.id)}
                        className="btn-save"
                      >
                        ✅ Guardar
                      </button>
                      <button
                        onClick={() => setEditando(null)}
                        className="btn-cancel"
                      >
                        ❌ Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="categoria-content">
                    <h4>{categoria.nombre}</h4>
                    <div className="categoria-actions">
                      <button
                        onClick={() => handleEditar(categoria)}
                        className="btn-edit"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleEliminar(categoria.id)}
                        className="btn-delete"
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="sin-categorias">No hay categorías creadas aún</p>
        )}
      </div>
    </div>
  );
}
