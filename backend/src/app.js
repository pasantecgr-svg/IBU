import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import path from 'path';

// Routes
import productosRoutes from './routes/productos.js';
import categoriasRoutes from './routes/categorias.js';
import archivosRoutes from './routes/archivos.js';
import reportesRoutes from './routes/reportes.js';
import ordenesRoutes from './routes/ordenes.js';
import notificacionesRoutes from './routes/notificaciones.js';
import authRoutes from './routes/auth.js';
import usuariosRoutes from './routes/usuarios.js';

dotenv.config();

const app = express();
const normalizeOrigin = (origin) => {
  if (!origin) return '';
  const value = String(origin).trim();
  if (!value) return '';
  try {
    return new URL(value).origin;
  } catch {
    return value.replace(/\/+$/, '');
  }
};

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://0.0.0.0:5173',
  'http://0.0.0.0:5174',
  'http://localhost:3000',
  'http://localhost:3001',
  'https://ibu.unibague.edu.co'
];
const allowedOrigins = [...new Set([
  ...defaultAllowedOrigins,
  ...(process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '').split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean)
])];

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    const normalizedOrigin = normalizeOrigin(origin);
    const isLocalhostOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(normalizedOrigin);
    if (!origin || allowedOrigins.includes(normalizedOrigin) || isLocalhostOrigin) {
      return callback(null, true);
    }
    return callback(new Error('Origen no permitido por CORS'));
  },
  credentials: true
}));
app.use(helmet());

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

app.use((req, res, next) => {
  const json = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 500 && body && body.error) {
      return json({ ...body, error: 'Error interno del servidor' });
    }
    return json(body);
  };
  next();
});

// Test route
app.get('/api/health', async (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/archivos', archivosRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/ordenes', ordenesRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/usuarios', usuariosRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'El archivo supera el tamaño máximo permitido (10 MB)', status: 'file_too_large' });
  }

  if (err && err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Archivo no válido para esta operación', status: 'invalid_file' });
  }

  if (err && err.message === 'Origen no permitido por CORS') {
    return res.status(403).json({ error: 'Origen no autorizado', status: 'forbidden' });
  }

  if (err && err.message) {
    return res.status(400).json({ error: err.message, status: 'bad_request' });
  }

  res.status(500).json({
    error: 'Error interno del servidor',
    status: 'error'
  });
});

export default app;
