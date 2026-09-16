# Organigrama institucional

## Fuente de datos

El backend consulta dos endpoints institucionales y mantiene el token fuera del navegador:

- Funcionarios: `FUNCTIONARIES_API_URL` (`http://integra.unibague.edu.co/functionariesChart/functionaries`)
- Dependencias: `DEPENDENCIES_API_URL`
- Token: `FUNCTIONARIES_API_TOKEN`

Configura estas variables en `backend/.env` usando `backend/.env.example` como referencia. No pongas el token en React, URLs públicas ni en Git.

## Relación jerárquica

La respuesta de dependencias usa estos campos:

- `dep_code`: identificador de la dependencia.
- `dep_name`: nombre de la dependencia.
- `dep_father`: identificador de la dependencia padre.
- `dep_nom_father`: nombre de la dependencia padre.

La respuesta de funcionarios usa `dep_code` para vincular cada funcionario con su dependencia.

La vista actual está limitada a las dependencias que administran este inventario:

- `REDES E INFRAESTRUCTURA`
- `SISTEMAS DE INFORMACION`
- `MANTENIMIENTO`

El filtro se aplica sobre `faculty` y `program` del funcionario. No se incluyen funcionarios de otras áreas aunque su cargo contenga el texto `G3`.

El backend expone una respuesta normalizada en:

```text
GET /api/usuarios/organigrama
```

La ruta requiere autenticación y rol `ADMIN`. Devuelve `arbol`, `totalFuncionarios` y `totalDependencias`.

La tabla profesional del directorio usa también:

```text
GET /api/usuarios/dependencias
```

Devuelve el código, nombre y dependencia superior de las tres áreas permitidas. El token se envía exclusivamente desde el backend mediante `FUNCTIONARIES_API_TOKEN`.

## Inventario por dependencia

Cada producto puede guardar `dependencia_codigo` y `dependencia_nombre`. El formulario obtiene las opciones desde `/api/usuarios/dependencias`, y la lista permite filtrar con:

```text
GET /api/productos?dependencia=<dep_code>
```

La importación Excel acepta las columnas `dependencia_codigo` y `dependencia_nombre`. Los productos antiguos quedan como **Sin asignar** hasta que se editen o se importen con su dependencia.

## Vista

La opción **Organigrama** aparece solo para administradores. Incluye:

- Dependencias padre e hijas expandibles.
- Funcionarios agrupados dentro de cada dependencia.
- Cargo, correo, sede y código de usuario.
- Búsqueda por funcionario, correo, cargo o dependencia.
- Botón para actualizar la información del middleware.

## Seguridad

El token institucional puede dar acceso a información personal. Si fue compartido públicamente, solicita su rotación y actualiza únicamente `backend/.env` en el entorno correspondiente.
