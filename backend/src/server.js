import app from './app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📱 Frontend en http://localhost:5173`);
  console.log(`🗄️  DB: ${process.env.DATABASE_URL || 'local'}`);
});

export default app;
