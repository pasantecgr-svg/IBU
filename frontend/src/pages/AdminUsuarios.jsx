import React, { useEffect, useState } from 'react';
import { usuariosAPI } from '../utils/api';
import '../styles/formulario.css';

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [funcionariosG3, setFuncionariosG3] = useState([]);
  const [dependencias, setDependencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [middlewareError, setMiddlewareError] = useState('');
  const [savingId, setSavingId] = useState(null);

  const cargar = async () => {
    try {
      setLoading(true);
      const resultados = await Promise.allSettled([
        usuariosAPI.listar(),
        usuariosAPI.g3(),
        usuariosAPI.dependencias()
      ]);
      const [usuariosResult, funcionariosResult, dependenciasResult] = resultados;
      if (usuariosResult.status === 'rejected') throw usuariosResult.reason;

      setUsuarios(usuariosResult.value.data.usuarios || []);
      setFuncionariosG3(funcionariosResult.status === 'fulfilled' ? funcionariosResult.value.data.funcionarios || [] : []);
      setDependencias(dependenciasResult.status === 'fulfilled' ? dependenciasResult.value.data.dependencias || [] : []);
      const advertenciaRespaldo = dependenciasResult.status === 'fulfilled' ? dependenciasResult.value.data.advertencia : '';
      const middlewareFallos = [funcionariosResult, dependenciasResult]
        .filter((resultado) => resultado.status === 'rejected')
        .map((resultado) => resultado.reason?.response?.data?.error || 'No se pudo consultar el middleware institucional');
      setMiddlewareError(middlewareFallos.length ? middlewareFallos.join(' ') : advertenciaRespaldo || '');
    } catch (err) {
      console.error('Error listar usuarios', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const handleChangeRole = (id, newRole) => {
    setUsuarios(usuarios.map(u => (u.id === id ? { ...u, role: newRole } : u)));
  };

  const guardarRol = async (id, role) => {
    try {
      setSavingId(id);
      await usuariosAPI.actualizarRol(id, role);
    } catch (err) {
      console.error('Error actualizando rol: ' + (err.response?.data?.error || err.message));
      cargar();
    } finally {
      setSavingId(null);
    }
  };

  const usuarioPorCorreo = (correo) => usuarios.find((usuario) => (
    usuario.email || '').trim().toLowerCase() === (correo || '').trim().toLowerCase());

  const personalConUsuariosLocales = [
    ...funcionariosG3,
    ...usuarios
      .filter((usuario) => !funcionariosG3.some((funcionario) => (
        funcionario.email || '').trim().toLowerCase() === (usuario.email || '').trim().toLowerCase()))
      .map((usuario) => ({
        id: `local-${usuario.id}`,
        nombre: usuario.nombre || usuario.email,
        email: usuario.email,
        dependencia: 'Sin dependencia institucional',
        cargo: 'Usuario del inventario',
        sede: '-',
        usuarioLocal: usuario
      }))
  ];

  if (loading) return <div style={{ padding: 24 }}>Cargando usuarios...</div>;
  if (error) return <div style={{ padding: 24 }}>Error: {error}</div>;

  return (
    <div className="admin-usuarios-page">
      <div className="admin-usuarios-header">
        <div><span className="eyebrow">Directorio institucional</span><h2>Usuarios y dependencias</h2><p>Consulta el personal autorizado y las áreas que administran el inventario.</p></div>
        <span className="g3-count">{funcionariosG3.length} funcionarios</span>
      </div>
      {middlewareError && <div className="organigrama-error">{middlewareError} Configura `FUNCTIONARIES_API_TOKEN` en `backend/.env` para cargar dependencias y funcionarios.</div>}
      <section className="usuarios-panel">
        <h3>Dependencias de inventario</h3>
        <div className="tabla-scroll">
          <table className="tabla usuarios-tabla">
            <thead><tr><th>Dependencia</th><th>Código institucional</th><th>Dependencia superior</th><th>Funcionarios cargados</th></tr></thead>
            <tbody>{dependencias.length ? dependencias.map((dependencia) => <tr key={dependencia.id}><td><strong>{dependencia.nombre}</strong></td><td>{dependencia.id}</td><td>{dependencia.padreNombre || 'Nivel superior no informado'}</td><td>{funcionariosG3.filter((funcionario) => funcionario.dependenciaId === dependencia.id).length}</td></tr>) : <tr><td colSpan="4">No hay dependencias cargadas desde el middleware.</td></tr>}</tbody>
          </table>
        </div>
      </section>
      <section className="usuarios-panel">
        <h3>Personal y roles del inventario</h3>
        <div className="tabla-scroll">
        <table className="tabla usuarios-tabla">
        <thead>
          <tr><th>Nombre</th><th>Correo</th><th>Dependencia</th><th>Cargo institucional</th><th>Rol de acceso</th><th>Sede</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          {personalConUsuariosLocales.length ? personalConUsuariosLocales.map((u) => {
            const usuario = u.usuarioLocal || usuarioPorCorreo(u.email);
            return <tr key={u.id}>
              <td><strong>{u.nombre || '-'}</strong></td>
              <td>{u.email || '-'}</td>
              <td>{u.dependencia || '-'}</td>
              <td><span className="cargo-badge">{u.cargo || '-'}</span></td>
              <td>{usuario ? <select value={usuario.role} onChange={(e) => handleChangeRole(usuario.id, e.target.value)}><option value="USER">USER</option><option value="ADMIN">ADMIN</option></select> : <span className="muted">Sin cuenta de acceso</span>}</td>
              <td>{u.sede || '-'}</td>
              <td>{usuario ? <button className="btn" onClick={() => guardarRol(usuario.id, usuario.role)} disabled={savingId === usuario.id}>{savingId === usuario.id ? 'Guardando...' : 'Guardar rol'}</button> : <span className="muted">-</span>}</td>
            </tr>;
          }) : <tr><td colSpan="7">No hay funcionarios del middleware cargados.</td></tr>}
        </tbody>
      </table>
      </div>
      </section>
    </div>
  );
}
