CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT,
  nombre VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'USER',
  google_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla de categorías
CREATE TABLE IF NOT EXISTS categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla de productos
CREATE TABLE IF NOT EXISTS productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  categoria_id UUID NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
  marca VARCHAR(255),
  modelo VARCHAR(255),
  numero_serie VARCHAR(255),
  cantidad_total INTEGER NOT NULL,
  cantidad_disponible INTEGER NOT NULL,
  ubicacion VARCHAR(255),
  estado VARCHAR(50) DEFAULT 'nuevo',
  fecha_adquisicion DATE,
  foto_url TEXT,
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla de archivos
CREATE TABLE IF NOT EXISTS archivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100),
  drive_file_id VARCHAR(255) NOT NULL,
  web_view_link TEXT,
  web_content_link TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Crear índices para mejorar rendimiento
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_nombre ON productos(nombre);
CREATE INDEX idx_productos_estado ON productos(estado);
CREATE INDEX idx_archivos_producto ON archivos(producto_id);

-- Crear algunas categorías iniciales
INSERT INTO categorias (nombre) VALUES
  ('Servidores'),
  ('Switches de Red'),
  ('Routers'),
  ('Cables de Red'),
  ('Monitores'),
  ('Teclados y Ratones'),
  ('Fuentes de Poder'),
  ('Placas Madre'),
  ('Memorias RAM'),
  ('Discos Duros'),
  ('SSD'),
  ('Procesadores'),
  ('Tarjetas Gráficas'),
  ('Módems'),
  ('Access Points WiFi'),
  ('Firewall'),
  ('UPS'),
  ('Licencias Software'),
  ('Accesorios Varios'),
  ('Herramientas Técnicas')
ON CONFLICT DO NOTHING;
