import React, { useState, useEffect } from 'react';
import { reportesAPI } from '../utils/api';
import { AlertTriangle, BarChart3, CheckCircle2, Download, FileBarChart, FileText, Package, RefreshCw, Ruler } from 'lucide-react';
import '../styles/dashboard.css';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const stockEstados = stats?.stockEstados || {};

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    try {
      setLoading(true);
      const { data } = await reportesAPI.obtenerEstadisticas();
      const estadisticas = data?.estadisticas || {
        totalEquipos: 0,
        totalCantidad: 0,
        totalDisponible: 0,
        totalUtilizado: 0,
        porcentajeDisponible: 0,
        porCategoria: {},
        stockBajo: [],
        totalMetraje: 0,
        totalMetrajeRestante: 0,
        totalMetrajeUtilizado: 0,
        porcentajeMetrajeDisponible: 0,
        metrajeBajo: []
      };
      setStats(estadisticas);
      setError(null);
      if (data?.warning) {
        console.warn(data.warning);
      }
    } catch (err) {
      setStats({
        totalEquipos: 0,
        totalCantidad: 0,
        totalDisponible: 0,
        totalUtilizado: 0,
        porcentajeDisponible: 0,
        porCategoria: {},
        stockBajo: [],
        totalMetraje: 0,
        totalMetrajeRestante: 0,
        totalMetrajeUtilizado: 0,
        porcentajeMetrajeDisponible: 0,
        metrajeBajo: []
      });
      setError(null);
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
          console.warn('No se pudo abrir el PDF en nueva pestaña. Revisa bloqueadores o permisos.');
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
      console.error('Error al descargar PDF: ' + err.message);
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
          console.warn('No se pudo abrir el archivo en nueva pestaña. Revisa bloqueadores o permisos.');
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
      console.error('Error al descargar Excel: ' + err.message);
    }
  };

  if (loading) return <div className="loading">Cargando estadísticas...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="dashboard">
      <h2><BarChart3 size={22} aria-hidden="true" /> Dashboard</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><Package size={32} aria-hidden="true" /></div>
          <div className="stat-content">
            <h3>Total de Equipos</h3>
            <p className="stat-number">{stats?.totalEquipos || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><BarChart3 size={32} aria-hidden="true" /></div>
          <div className="stat-content">
            <h3>Cantidad Total</h3>
            <p className="stat-number">{stats?.totalCantidad || 0}</p>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon"><CheckCircle2 size={32} aria-hidden="true" /></div>
          <div className="stat-content">
            <h3>Disponible</h3>
            <p className="stat-number">{stats?.totalDisponible || 0}</p>
            <small>{stats?.porcentajeDisponible}%</small>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon"><Ruler size={32} aria-hidden="true" /></div>
          <div className="stat-content">
            <h3>Metraje restante</h3>
            <p className="stat-number">{stats?.totalMetrajeRestante ?? 0} {stats?.metrajeUnidad || ''}</p>
            <small>{stats?.porcentajeMetrajeDisponible}% disponible</small>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon"><AlertTriangle size={32} aria-hidden="true" /></div>
          <div className="stat-content">
            <h3>Utilizado</h3>
            <p className="stat-number">{stats?.totalUtilizado || 0}</p>
          </div>
        </div>
      </div>

      <section className="stats-section">
        <h3><FileBarChart size={18} aria-hidden="true" /> Por Categoría</h3>
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
        <h3><Download size={18} aria-hidden="true" /> Descargar Reportes</h3>
        <div className="buttons-group">
          <button className="btn btn-primary" onClick={descargarPDF}>
            <FileText size={17} aria-hidden="true" /> Descargar PDF
          </button>
          <button className="btn btn-success" onClick={descargarExcel}>
            <FileBarChart size={17} aria-hidden="true" /> Descargar Excel
          </button>
          <button className="btn btn-secondary" onClick={cargarEstadisticas}>
            <RefreshCw size={17} aria-hidden="true" /> Actualizar
          </button>
        </div>
      </section>
    </div>
  );
}
