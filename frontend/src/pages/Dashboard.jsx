import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { reportesAPI } from '../utils/api';
import '../styles/dashboard.css';

export default function Dashboard() {
  const usuario = useSelector((state) => state.auth.user);
  const isAdmin = usuario && usuario.role === 'ADMIN';

  if (!isAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <h3>Acceso denegado</h3>
        <p>No tienes permisos para ver el dashboard. Contacta con un administrador.</p>
      </div>
    );
  }
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const stockBajo = stats?.stockBajo || [];
  const stockEstados = stats?.stockEstados || {};

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    try {
      setLoading(true);
      const { data } = await reportesAPI.obtenerEstadisticas();
      setStats(data.estadisticas);
    } catch (err) {
      setError(err.message);
      console.error('Error cargando estadísticas:', err);
    } finally {
      setLoading(false);
    }
  };

  const descargarPDF = async () => {
    try {
      const blob = await reportesAPI.generarPDF();
      const url = window.URL.createObjectURL(blob);
      const filename = `inventario_${new Date().toISOString().split('T')[0]}.pdf`;

      // En iOS/Safari a veces no funciona el atributo download; abrimos en nueva pestaña.
      const isiOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      if (isiOS) {
        const newTab = window.open(url);
        // Revoke después de un tiempo para no invalidar la descarga prematuramente
        setTimeout(() => window.URL.revokeObjectURL(url), 5000);
        if (!newTab) {
          alert('No se pudo abrir el PDF en nueva pestaña. Revisa bloqueadores o permisos.');
        }
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Dejar un margen para que el navegador inicie la descarga antes de revocar
        setTimeout(() => window.URL.revokeObjectURL(url), 2000);
      }
    } catch (err) {
      alert('Error al descargar PDF: ' + err.message);
    }
  };

  const descargarExcel = async () => {
    try {
      const blob = await reportesAPI.generarExcel();
      const url = window.URL.createObjectURL(blob);
      const filename = `inventario_${new Date().toISOString().split('T')[0]}.xlsx`;

      const isiOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      if (isiOS) {
        const newTab = window.open(url);
        setTimeout(() => window.URL.revokeObjectURL(url), 5000);
        if (!newTab) {
          alert('No se pudo abrir el archivo en nueva pestaña. Revisa bloqueadores o permisos.');
        }
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => window.URL.revokeObjectURL(url), 2000);
      }
    } catch (err) {
      alert('Error al descargar Excel: ' + err.message);
    }
  };

  if (loading) return <div className="loading">Cargando estadísticas...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="dashboard">
      <h2>📊 Dashboard</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <h3>Total de Equipos</h3>
            <p className="stat-number">{stats?.totalEquipos || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Cantidad Total</h3>
            <p className="stat-number">{stats?.totalCantidad || 0}</p>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Disponible</h3>
            <p className="stat-number">{stats?.totalDisponible || 0}</p>
            <small>{stats?.porcentajeDisponible}%</small>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">🧵</div>
          <div className="stat-content">
            <h3>Metraje restante</h3>
            <p className="stat-number">{stats?.totalMetrajeRestante ?? 0} {stats?.metrajeUnidad || ''}</p>
            <small>{stats?.porcentajeMetrajeDisponible}% disponible</small>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <h3>Utilizado</h3>
            <p className="stat-number">{stats?.totalUtilizado || 0}</p>
          </div>
        </div>
      </div>

      {stockBajo.length > 0 && (
        <section className="stats-section alert-section">
          <h3>⚠️ Productos con stock bajo</h3>
          <div className="stock-alert-list">
            {stockBajo.map((producto) => (
              <div key={producto.id} className="stock-alert-item">
                <div>
                  <strong>{producto.producto}</strong>
                  <small>{producto.categoria}</small>
                </div>
                <span>{producto.cantidad_disponible} unidades</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {stats?.metrajeBajo && stats.metrajeBajo.length > 0 && (
        <section className="stats-section alert-section">
          <h3>⚠️ Productos con metraje bajo</h3>
          <div className="stock-alert-list">
            {stats.metrajeBajo.map((p) => (
              <div key={p.id} className="stock-alert-item">
                <div>
                  <strong>{p.nombre}</strong>
                  <small>{p.categoria}</small>
                </div>
                <span>{p.metraje_restante} {p.unidad} ({p.porcentaje_restante}%)</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="stats-section">
        <h3>📦 Estado del stock</h3>
        <div className="categories-list">
          {Object.entries(stockEstados).map(([estado, cantidad]) => (
            <div key={estado} className="category-item">
              <span className="category-name">{estado}</span>
              <span className="category-count">{cantidad} productos</span>
            </div>
          ))}
        </div>
      </section>

      <section className="stats-section">
        <h3>📈 Por Categoría</h3>
        <div className="categories-list">
          {Object.entries(stats?.porCategoria || {}).map(([categoria, cantidad]) => (
            <div key={categoria} className="category-item">
              <span className="category-name">{categoria}</span>
              <span className="category-count">{cantidad} equipos</span>
            </div>
          ))}
        </div>
      </section>

      <section className="actions-section">
        <h3>📥 Descargar Reportes</h3>
        <div className="buttons-group">
          <button className="btn btn-primary" onClick={descargarPDF}>
            📄 Descargar PDF
          </button>
          <button className="btn btn-success" onClick={descargarExcel}>
            📊 Descargar Excel
          </button>
          <button className="btn btn-secondary" onClick={cargarEstadisticas}>
            🔄 Actualizar
          </button>
        </div>
      </section>
    </div>
  );
}
