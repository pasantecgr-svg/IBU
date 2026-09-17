-- Corrige desalineación de la tabla productos en ambientes con esquema antiguo.
-- Ejecuta esto en la base de datos de producción si la columna area o otros campos faltan.

ALTER TABLE IF EXISTS productos
  ADD COLUMN IF NOT EXISTS area VARCHAR(255),
  ADD COLUMN IF NOT EXISTS fecha_ultimo_mantenimiento DATE,
  ADD COLUMN IF NOT EXISTS estado_mantenimiento VARCHAR(100),
  ADD COLUMN IF NOT EXISTS aporta_plan_mejoramiento TEXT;

-- Asegura que la columna de dependencia esté presente.
ALTER TABLE IF EXISTS productos
  ADD COLUMN IF NOT EXISTS dependencia_codigo VARCHAR(100),
  ADD COLUMN IF NOT EXISTS dependencia_nombre VARCHAR(255);
