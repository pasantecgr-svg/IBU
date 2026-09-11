import React, { useEffect, useState } from 'react';
import { usuariosAPI } from '../utils/api';
import '../styles/formulario.css';

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);

  const cargar = async () => {
    try {
      setLoading(true);
      const { data } = await usuariosAPI.listar();
      setUsuarios(data.usuarios || []);
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
      alert('Rol actualizado');
    } catch (err) {
      alert('Error actualizando rol: ' + (err.response?.data?.error || err.message));
      cargar();
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Cargando usuarios...</div>;
  if (error) return <div style={{ padding: 24 }}>Error: {error}</div>;

  return (
    <div style={{ padding: 24 }}>
      <h2>Administrar Usuarios</h2>
      <table className="tabla" style={{ width: '100%', marginTop: 12 }}>
        <thead>
          <tr><th>Correo</th><th>Nombre</th><th>Rol</th><th>Creado</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          {usuarios.map(u => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.nombre || '-'}</td>
              <td>
                <select value={u.role} onChange={(e) => handleChangeRole(u.id, e.target.value)}>
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </td>
              <td>{new Date(u.created_at).toLocaleString()}</td>
              <td>
                <button className="btn" onClick={() => guardarRol(u.id, u.role)} disabled={savingId === u.id}>
                  {savingId === u.id ? 'Guardando...' : 'Guardar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
