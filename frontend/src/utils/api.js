import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ibu-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  googleLogin: (data) => api.post('/auth/google', data),
  obtenerPerfil: () => api.get('/auth/me'),
  cambiarPassword: (data) => api.put('/auth/change-password', data)
};

// PRODUCTOS
export const productosAPI = {
  obtener: (params) => api.get('/productos', { params }),
  obtenerPorId: (id) => api.get(`/productos/${id}`),
  crear: (data) => api.post('/productos', data),
  actualizar: (id, data) => api.put(`/productos/${id}`, data),
  eliminar: (id) => api.delete(`/productos/${id}`),
  actualizarCantidad: (id, cantidad_disponible) => 
    api.patch(`/productos/${id}/cantidad`, { cantidad_disponible })
};

// CATEGORÍAS
export const categoriasAPI = {
  obtener: () => api.get('/categorias'),
  obtenerConProductos: (id) => api.get(`/categorias/${id}/productos`),
  crear: (data) => api.post('/categorias', data),
  actualizar: (id, data) => api.put(`/categorias/${id}`, data),
  eliminar: (id) => api.delete(`/categorias/${id}`)
};

// ARCHIVOS
export const archivosAPI = {
  obtenerPorProducto: (producto_id) => api.get(`/archivos/producto/${producto_id}`),
  subir: (producto_id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/archivos/producto/${producto_id}/subir`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  eliminar: (id) => api.delete(`/archivos/${id}`),
  obtenerEnlaceDescarga: (id) => api.get(`/archivos/${id}/descargar`)
};

// REPORTES
export const reportesAPI = {
  generarPDF: (categoria_id) => {
    const params = categoria_id ? `?categoria_id=${categoria_id}` : '';
    return api.get(`/reportes/pdf${params}`, { responseType: 'blob' }).then(async (response) => {
      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('application/pdf')) {
        // intentar leer texto de respuesta para mostrar error
        try {
          const text = await response.data.text();
          throw new Error(`Respuesta inesperada del servidor: ${text}`);
        } catch (e) {
          throw new Error(`Respuesta inesperada del servidor, tipo: ${contentType}`);
        }
      }
      return response.data;
    });
  },
  generarExcel: (categoria_id) => {
    const params = categoria_id ? `?categoria_id=${categoria_id}` : '';
    return api.get(`/reportes/excel${params}`, { responseType: 'blob' }).then(async (response) => {
      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('spreadsheet') && !contentType.includes('excel') && !contentType.includes('openxmlformats')) {
        try {
          const text = await response.data.text();
          throw new Error(`Respuesta inesperada del servidor: ${text}`);
        } catch (e) {
          throw new Error(`Respuesta inesperada del servidor, tipo: ${contentType}`);
        }
      }
      return response.data;
    });
  },
  obtenerEstadisticas: () => api.get('/reportes/estadisticas')
};

// ORDENES DE TRABAJO
export const ordenesAPI = {
  crear: (data) => api.post('/ordenes', data),
  obtener: () => api.get('/ordenes'),
  obtenerPorId: (id) => api.get(`/ordenes/${id}`)
};

// USUARIOS (ADMIN)
export const usuariosAPI = {
  listar: () => api.get('/usuarios'),
  actualizarRol: (id, role) => api.put(`/usuarios/${id}/role`, { role })
};

export default api;
