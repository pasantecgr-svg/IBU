Mejores prácticas para gestionar secretos y variables de entorno

1) Nunca subir `.env` al repositorio
- Mantén valores reales sólo en archivos locales (`.env`, `backend/.env.local`) que estén en `.gitignore`.
- Sube un `backend/.env.example` con placeholders como referencia (ya creado).

2) Para Docker / producción: usa un gestor de secretos o Docker Secrets
- Docker Compose (producción): monta secretos desde archivos que no estén en Git o usa un secret manager.
  Ejemplo (compose v3.8):

  services:
    backend:
      image: my-backend:latest
      secrets:
        - db_password

  secrets:
    db_password:
      file: ./secrets/db_password.txt

  (Asegúrate de que `secrets/` está en `.gitignore` y que el archivo con el secreto no se suba.)

3) En entornos cloud: usa Secret Manager (Azure Key Vault, AWS Secrets Manager, GCP Secret Manager)
- Configura la plataforma para inyectar secretos como variables de entorno en el contenedor/pod.

4) En CI/CD: guarda valores en los secretos del pipeline (GitHub Actions Secrets, GitLab CI variables)
- No pongas secretos en los logs ni en los artefactos.

5) Rotación y permisos
- Usa claves con permisos mínimos y rota las claves periódicamente.

6) Para desarrollo local seguro
- Usa `backend/.env.local` (gitignored) con tus valores reales.
- Comparte `backend/.env.example` con el equipo para que cada quien cree su `.env` local.

7) Limpieza del repo si ya subiste secretos
- Revocar las claves expuestas inmediatamente.
- Elimina el historial de Git que contiene los secretos (herramientas: `git filter-repo` o `bfg-repo-cleaner`).
