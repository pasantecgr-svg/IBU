# 📦 Sistema de Inventario de Bodega

Un sistema completo de gestión de inventario de bodega con backend Express, frontend React y sincronización a Google Drive.

## 🚀 Características

✅ **Gestión Completa de Productos**
- Crear, editar y eliminar productos
- Filtrado por categoría y búsqueda por nombre/modelo
- Control de cantidad disponible
- Estado de equipos (nuevo, usado, dañado, reparación)

✅ **Dashboard Estadístico**
- Visualización de equipos por categoría
- Total de cantidad disponible y utilizada
- Descarga de reportes en PDF y Excel

✅ **Sincronización con Google Drive**
- Subida automática de fotos de equipos
- Almacenamiento en carpeta específica
- Links de descarga para cada archivo

✅ **Gestión de Categorías**
- CRUD completo de categorías
- Validación para evitar conflictos
- Categorías predefinidas

✅ **Reportes Exportables**
- PDF con formato profesional
- Excel con todos los datos
- Filtrado por categoría

## 📋 Requisitos Previos

- Node.js v16+ 
- npm o yarn
 - Cuenta en Google Cloud Console

## ⚙️ Configuración Inicial

### 1. Clonar o descargar el proyecto
```bash
cd inventario-bodega
```

### 2. Configurar la base de datos (Postgres)

1. Si usas Docker Compose: el servicio `db` aplicará automáticamente `db/init.sql` al iniciar.
2. Si no usas Docker: ejecuta el SQL contenido en `db/init.sql` en tu instancia de Postgres.

### 3. Configurar Google Drive API

1. Ve a https://console.cloud.google.com
2. Crea nuevo proyecto: "Inventario Bodega"
3. Habilita **Google Drive API**
4. Ve a **Credentials → Create Credentials**
5. Selecciona **OAuth 2.0 (Desktop)**
6. Descarga el JSON
7. Copia `client_id` y `client_secret`
8. Crea carpeta en Google Drive para los documentos
9. Copia el ID de la carpeta de la URL

### 4. Configurar Variables de Entorno

```bash
# En la carpeta backend/
cp ../.env.example ../.env
```

Edita `backend/.env`:
```env
DATABASE_URL=postgresql://usuario:password@host:5432/inventario
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret
GOOGLE_DRIVE_FOLDER_ID=tu-folder-id
PORT=3000
FRONTEND_URL=http://localhost:5173
```

## 🎯 Instalación

### Opción 1: Instalación Completa (Recomendado)

```bash
# Desde la carpeta raíz
npm install:all

# Inicia ambos servidores
npm run dev
```

### Opción 2: Instalación Manual

```bash
# Backend
cd backend
npm install
npm run dev

# En otra terminal - Frontend
cd frontend
npm install
npm run dev
```

## 📱 Uso de la Aplicación

### Acceder a la Aplicación

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api

### Funcionalidades Principales

#### 📊 Dashboard
- Vista general del inventario
- Estadísticas por categoría
- Botones para descargar reportes

#### 📋 Productos
- Listar todos los productos
- Buscar por nombre/modelo
- Filtrar por categoría
- Ajustar cantidad disponible (+ / -)
- Editar productos inline
- Eliminar productos

#### ➕ Nuevo Producto
- Formulario completo con todos los campos
- Subida de foto (se guarda en Google Drive)
- Validaciones de campos requeridos
- Feedback de éxito/error

#### 🏷️ Categorías
- Ver todas las categorías
- Crear nuevas categorías
- Editar categorías existentes
- Eliminar categorías (si no tienen productos)

## 🔌 Endpoints de API

### Productos
```
GET    /api/productos              - Listar todos
GET    /api/productos?categoria=id - Filtrar por categoría
GET    /api/productos?busqueda=xxx - Buscar
GET    /api/productos/:id          - Obtener por ID
POST   /api/productos              - Crear nuevo
PUT    /api/productos/:id          - Actualizar
DELETE /api/productos/:id          - Eliminar
PATCH  /api/productos/:id/cantidad - Actualizar cantidad disponible
```

### Categorías
```
GET    /api/categorias             - Listar todas
GET    /api/categorias/:id/productos - Categoría con productos
POST   /api/categorias             - Crear nueva
PUT    /api/categorias/:id         - Actualizar
DELETE /api/categorias/:id         - Eliminar
```

### Archivos
```
GET    /api/archivos/producto/:id  - Obtener archivos
POST   /api/archivos/producto/:id/subir - Subir archivo
DELETE /api/archivos/:id           - Eliminar archivo
```

### Reportes
```
GET    /api/reportes/pdf           - Descargar PDF
GET    /api/reportes/excel         - Descargar Excel
GET    /api/reportes/estadisticas  - Obtener estadísticas
```

## 🛠️ Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Inicia backend y frontend
npm run backend:dev      # Solo backend
npm run frontend:dev     # Solo frontend

# Instalación
npm install:all          # Instala todas las dependencias
npm run backend:install  # Instala dependencias backend
npm run frontend:install # Instala dependencias frontend

# Producción
npm run build            # Build frontend
npm run start            # Inicia backend en producción
```

## 📁 Estructura del Proyecto

```
inventario-bodega/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Lógica de negocio
│   │   ├── routes/           # Definición de rutas
│   │   ├── utils/            # Utilidades
│   │   └── server.js         # Entrada principal
│   ├── .env                  # Variables de entorno
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/            # Componentes de páginas
│   │   ├── styles/           # Estilos CSS
│   │   ├── utils/            # Utilidades (API)
│   │   ├── App.jsx           # Componente principal
│   │   └── main.jsx          # Entrada
│   ├── index.html
│   └── package.json
├── db/
│   └── init.sql              # Script de inicialización para Postgres
├── .env.example              # Variables de ejemplo
├── .gitignore
└── package.json              # Root package.json
```

## 🔐 Seguridad

- Las credenciales están en `.env` (no versionar)
- Google Drive API usa OAuth 2.0
-- La base de datos usa `DATABASE_URL` y credenciales locales
- Validación en servidor de todos los datos

## 📱 Responsive Design

La aplicación es fully responsive:
- ✅ Desktop (1400px+)
- ✅ Tablet (768px - 1024px)
- ✅ Mobile (320px - 767px)

## 🐛 Troubleshooting

### "Error conectando a la base de datos"
- Verifica que `DATABASE_URL` esté configurado correctamente
- Verifica que Postgres esté corriendo (docker-compose up db)
- Confirma que el script `db/init.sql` se ejecutó correctamente

### "Error subiendo a Google Drive"
- Verifica que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` sean correctos
- Confirma que Google Drive API está habilitado
- Verifica que la carpeta de Drive existe y es accesible

### "Puerto 3000 ya está en uso"
```bash
# Cambiar puerto en backend/.env
PORT=3000
```

### "Los cambios no se reflejan"
- Limpia caché del navegador
- Reinicia los servidores
- Verifica Network tab en DevTools

## 📞 Soporte

Para reportar problemas, verifica:
1. Conexión a internet
2. Variables de entorno correctas
3. Bases de datos y APIs disponibles
4. Console del navegador para errores

## 📄 Licencia

Proyecto personal - Uso libre para inventario de bodega

## 📝 Notas

- Las categorías iniciales se crean automáticamente al ejecutar `init.sql`
- Los reportes se descargan con fecha actual en el nombre
- Google Drive mantiene historial de archivos subidos
-- Los datos se almacenan en Postgres (local o remoto) usando `DATABASE_URL`

---

**Última actualización**: 2024
**Versión**: 1.0.0
