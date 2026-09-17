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

const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    const normalizedOrigin = normalizeOrigin(origin);
    if (!origin || allowedOrigins.includes(normalizedOrigin)) return callback(null, true);
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
  if (err.message === 'Origen no permitido por CORS') {
    return res.status(403).json({ error: 'Origen no autorizado', status: 'forbidden' });
  }
  res.status(500).json({
    error: 'Error interno del servidor',
    status: 'error'
  });
});

export default app;
