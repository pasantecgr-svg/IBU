# Esquema Prisma y conexión a base de datos

## Problema detectado

Había dos esquemas Prisma en el repositorio:

- backend/prisma/schema.prisma
- prisma/schema.prisma

Ambos definían modelos distintos y el de la raíz estaba desactualizado. Eso generaba confusión al compilar el cliente de Prisma y al sincronizar la BD.

Además, la conexión estaba apuntando a `db:5432`, que solo es válido cuando la app corre junto con PostgreSQL dentro de Docker Compose. Si la app corre fuera de Docker, la variable `DATABASE_URL` debe apuntar al host real de la base de datos del entorno (por ejemplo, la instancia de producción o localhost en desarrollo).

## Regla de oro

El esquema autoritativo para el proyecto es el que está en:

- backend/prisma/schema.prisma

Y el archivo raíz quedó sincronizado con el mismo contenido para evitar divergencias.

## Sincronización recomendada

### Entorno local con Docker

```bash
cd backend
npx prisma validate --schema ./prisma/schema.prisma
npx prisma db push --schema ./prisma/schema.prisma
```

### Producción / entorno real

Asegúrate de que `DATABASE_URL` apunte al host real de PostgreSQL y no a `db` si la app no corre dentro del contenedor Docker:

```bash
export DATABASE_URL="postgresql://usuario:password@host:5432/inventario"
cd backend
npx prisma validate --schema ./prisma/schema.prisma
npx prisma db push --schema ./prisma/schema.prisma
```

## Campo crítico: productos.area

El campo `area` debe existir en la tabla `productos` y en el schema Prisma si la aplicación lo usa. Si aparece el error:

```text
The column productos.area does not exist in the current database.
```

significa que la base de datos real no está sincronizada con el esquema actual.

La corrección consiste en:

1. Verificar que la conexión apunta al servidor correcto.
2. Ejecutar `prisma db push` con el esquema correcto.
3. Confirmar que la columna `area` exista en PostgreSQL.

## Comandos útiles

```bash
cd backend
npx prisma validate --schema ./prisma/schema.prisma
npx prisma generate --schema ./prisma/schema.prisma
npx prisma db push --schema ./prisma/schema.prisma
```

## Nota de seguridad

No se deben guardar secretos ni credenciales en el repositorio. Mantén el archivo `.env` fuera de Git y usa `.env.example` o variables seguras del entorno de despliegue.
