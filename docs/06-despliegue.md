# Despliegue

## Dónde está desplegado

| Componente | Plataforma | URL | Rama |
|---|---|---|---|
| Frontend Next | Docker en AWS EC2 Ubuntu 24.04 | https://sonnet5.98.81.166.66.sslip.io | develop actualmente; main tras aprobar la release |
| Backend Nest | Docker, red privada; Caddy HTTPS | https://sonnet5.98.81.166.66.sslip.io/api/v1 y /api/docs | develop actualmente; main tras aprobar la release |
| PostgreSQL 18 | Volumen Docker privado en la EC2 | Sin puerto público | Migraciones del backend |
| Fotos/certificados | Volúmenes independientes | Fotos autenticadas; TLS en Caddy | Se conservan entre releases |

**Estado antes de publicar:** la EC2 ejecuta develop backend 7973ee7 y frontend a36bbfe; la release 1.0.0 debe aprobarse y fusionarse antes de declarar publicación desde main. Ningún merge despliega automáticamente. El manifiesto privado release.json y las etiquetas OCI registran los SHA activos, comprobables con sonnet5 status y en la release activa.

## Cómo se publica una nueva versión

1. Preparar release/1.0.0 desde develop en ambos repositorios; actualizar versiones y verificar código/docs/seed/Compose.
2. Crear PR hacia main y obtener aprobación de otro integrante. Fusionar backend y frontend; no eludir protecciones.
3. Crear etiqueta v1.0.0 y GitHub Release sobre el commit main correspondiente en cada repo. Las notas enumeran funcionalidades y limitaciones. Devolver los ajustes a develop mediante PR revisado.
4. Construir imágenes amd64 desde los SHA completos de main (no desde un head feature), con VCS_REF y digest de imágenes base. En la EC2 de 2 GiB construir fuera del servidor. Publicar por digest en registro o importar por SSH según [guía AWS](despliegue/PASO-A-PASO-AWS.md).
5. Comprobar revisión OCI y registrar manifiesto nuevo. Respaldar BD/fotos, pausar escrituras, conservar previous y activar la nueva pareja; aplicar migraciones antes de API. La CLI estándar admite imágenes por digest: `sudo sonnet5 deploy --backend-sha SHA_MAIN_BACKEND --frontend-sha SHA_MAIN_FRONTEND --api-image IMAGEN_API_POR_DIGEST --web-image IMAGEN_WEB_POR_DIGEST`. Para imágenes importadas usar el procedimiento de actualización controlada documentado en el registro operativo; no repetir primera instalación.
6. Comprobar sonnet5 status, migración exitosa, HTTPS /api/health, /api/v1/health/ready, /api/docs, /api/docs-json y acceso con los tres roles. Mantener usuarios y contraseñas entregadas.

No usar db push, migrate reset, down -v ni prune --volumes sobre el servidor. Un fallo de migración requiere diagnóstico; no reactivar código antiguo sobre un esquema cambiado sin verificar compatibilidad. Hotfix desde main → main y develop → v1.0.1.

## Seed común y cuentas existentes

Tras instalar la herramienta de esta release, `sudo sonnet5 seed-demo` ejecuta deploy/seed-demo.mjs dentro de la imagen activa. Es el mismo archivo que `npm run db:seed` y deploy/local.py --seed. Conserva las nueve cuentas QA y sus contraseñas si ya están presentes; no vuelve a crear datos ni renueva fechas. Una base vacía recibe los diez módulos y contraseñas aleatorias; se guardan en /etc/sonnet5/seed-private/cuentas-qa.json con acceso privado. En AWS las contraseñas anteriores siguen en el archivo privado previo, no se reemplazan por otro archivo ni se incluyen en README/Moodle público. Entregarlas únicamente por el campo de Moodle.

## Variables de entorno en producción

| Variable | Dónde se configura |
|---|---|
| DOMAIN, ACME_EMAIL, ADMIN_EMAIL, CORS_ORIGIN | /etc/sonnet5/platform.env, root 0600 |
| STACK_NAME, STACK_DIR, STATE_DIR, BACKUP_DIR, SECRETS_DIR | /etc/sonnet5/platform.env |
| CUOTA_MENSUAL_USD, BACKUP_RETENTION_DAYS, BACKUP_S3_BUCKET, BACKUP_S3_PREFIX | /etc/sonnet5/platform.env; S3 opcional |
| NODE_IMAGE, POSTGRES_IMAGE, CADDY_IMAGE, puertos de publicación | /etc/sonnet5/platform.env; imágenes base por digest |
| POSTGRES_PASSWORD_FILE, JWT_SECRET_FILE | Mounts de Compose desde SECRETS_DIR; sin valores en Git |
| postgres_password, db_owner_password, db_app_password, jwt_secret, admin_password | Archivos privados bajo SECRETS_DIR |
| POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_DB, NODE_ENV, PORT, UPLOADS_DIR | Entorno de API en deploy/compose.production.yml |
| API_URL, NODE_ENV, PORT, HOSTNAME | Entorno de Next en deploy/compose.production.yml |
| SEED_DEMO, SEED_CREDENTIALS_FILE | Comando explícito de seed; no se ejecuta en el arranque |

Solo TCP 80/443 públicos; SSH limitado al operador. BD y puertos 3000 permanecen privados. Copias diarias de BD y fotos con pausa breve; retención local 7 días. S3 no está configurado: copiar respaldos fuera de la VM. Dominio sslip.io es temporal y depende de la IP. Mantener el sistema al menos hasta el 24/11/2026.
