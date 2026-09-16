import React, { useEffect, useMemo, useState } from 'react';
import { Building2, ChevronDown, ChevronRight, Mail, RefreshCw, Search, Users } from 'lucide-react';
import { usuariosAPI } from '../utils/api';
import '../styles/organigrama.css';

const flattenNodes = (nodes, level = 0, result = []) => {
  (nodes || []).forEach((node) => {
    result.push({ ...node, level });
    flattenNodes(node.hijos, level + 1, result);
  });
  return result;
};

function DependenciaNode({ node, expanded, onToggle }) {
  const isExpanded = expanded.has(node.id);
  return (
    <div className="org-node">
      <div className="org-node-heading">
        <button type="button" className="org-expand" onClick={() => onToggle(node.id)} aria-label={`${isExpanded ? 'Contraer' : 'Expandir'} ${node.nombre}`}>
          {isExpanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
        </button>
        <Building2 size={19} aria-hidden="true" />
        <div>
          <strong>{node.nombre}</strong>
          <span>{node.funcionarios.length} funcionarios · {node.hijos.length} dependencias</span>
        </div>
      </div>
      {isExpanded && (
        <div className="org-node-content">
          {node.funcionarios.length > 0 && (
            <div className="org-people">
              {node.funcionarios.map((persona) => (
                <div className="org-person" key={`${node.id}-${persona.id}`}>
                  <div className="org-person-avatar">{persona.nombre.slice(0, 1) || '?'}</div>
                  <div><strong>{persona.nombre}</strong><span>{persona.cargo}</span>{persona.email && <small><Mail size={12} /> {persona.email}</small>}</div>
                </div>
              ))}
            </div>
          )}
          {node.hijos.length > 0 && <div className="org-children">{node.hijos.map((child) => <DependenciaNode key={child.id} node={child} expanded={expanded} onToggle={onToggle} />)}</div>}
        </div>
      )}
    </div>
  );
}

export default function Organigrama() {
  const [arbol, setArbol] = useState([]);
  const [totalFuncionarios, setTotalFuncionarios] = useState(0);
  const [totalDependencias, setTotalDependencias] = useState(0);
  const [busqueda, setBusqueda] = useState('');
  const [expanded, setExpanded] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargar = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await usuariosAPI.organigrama();
      setArbol(data.arbol || []);
      setTotalFuncionarios(data.totalFuncionarios || 0);
      setTotalDependencias(data.totalDependencias || 0);
      setExpanded(new Set((data.arbol || []).map((node) => node.id)));
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cargar el organigrama');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const lista = useMemo(() => flattenNodes(arbol), [arbol]);
  const resultados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return [];
    return lista.flatMap((node) => node.funcionarios.filter((persona) => `${persona.nombre} ${persona.email} ${persona.cargo} ${node.nombre}`.toLowerCase().includes(termino)).map((persona) => ({ ...persona, dependencia: node.nombre })));
  }, [busqueda, lista]);

  const toggleNode = (id) => setExpanded((actual) => {
    const siguiente = new Set(actual);
    if (siguiente.has(id)) siguiente.delete(id); else siguiente.add(id);
    return siguiente;
  });

  return (
    <div className="organigrama-page">
      <div className="organigrama-header">
        <div><span className="eyebrow">Estructura institucional</span><h2><Building2 size={24} /> Organigrama de inventario</h2><p>Redes, Sistemas de Información y Mantenimiento, cargados desde el middleware institucional.</p></div>
        <button type="button" className="btn btn-outline" onClick={cargar} disabled={loading}><RefreshCw size={16} /> {loading ? 'Actualizando...' : 'Actualizar'}</button>
      </div>
      {error && <div className="organigrama-error">{error}</div>}
      <div className="organigrama-summary"><div><Building2 size={19} /><strong>{totalDependencias}</strong><span>Dependencias</span></div><div><Users size={19} /><strong>{totalFuncionarios}</strong><span>Funcionarios</span></div><label className="organigrama-search"><Search size={17} /><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar funcionario, cargo o dependencia" /></label></div>
      {busqueda && <div className="organigrama-results"><h3>Resultados de búsqueda</h3>{resultados.length ? resultados.map((persona) => <div className="result-row" key={`${persona.id}-${persona.dependencia}`}><strong>{persona.nombre}</strong><span>{persona.cargo}</span><small>{persona.dependencia} · {persona.email || 'Sin correo'}</small></div>) : <p>No se encontraron funcionarios.</p>}</div>}
      {!busqueda && !loading && <div className="org-tree">{arbol.map((node) => <DependenciaNode key={node.id} node={node} expanded={expanded} onToggle={toggleNode} />)}</div>}
      {loading && <div className="organigrama-loading">Cargando estructura institucional...</div>}
    </div>
  );
}
