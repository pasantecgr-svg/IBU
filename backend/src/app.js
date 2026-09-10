import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Routes
import productosRoutes from './routes/productos.js';
import categoriasRoutes from './routes/categorias.js';
import archivosRoutes from './routes/archivos.js';
import reportesRoutes from './routes/reportes.js';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();

// Middleware
// Permitir orígenes dinámicos (útil para pruebas en LAN). Mantener `credentials: true`
// requiere no usar origin: '*'. origin: true reflecta el origen de la petición.
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

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

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: err.message,
    status: 'error'
  });
});

export default app;
