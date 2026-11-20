# Instalación local

## Requisitos

Git, Python 3.10+, Docker Engine con Compose V2 y Buildx, conexión a Internet para imágenes/dependencias/fuentes. En Windows usar WSL2 y Docker Desktop integrado, contenedores Linux. Para ejecutar Node fuera de Docker: Node 24. No reutilizar una base real para pruebas de integración.

## Pasos

1. Clonar ambos repositorios y seleccionar la rama de entrega; mientras se revisa usar release/1.0.0, y después de publicarla usar main.
2. Desde backend ejecutar el asistente de Compose: genera las variables y secretos locales en .local-platform/platform.env y .local-platform/secrets. No hace falta copiar .env para este modo; la alternativa sin Docker sí utiliza .env.example.
3. Con --build se construyen y levantan frontend, API, PostgreSQL, migraciones y Caddy.
4. Con --seed se cargan los roles, usuarios y escenarios mediante el mismo script del servidor.
5. Abrir https://localhost:8443 y obtener las credenciales del archivo privado indicado abajo.

```bash
git clone https://github.com/ArmandoAgui/be_boilerplate_is_2026.git
git clone https://github.com/ArmandoAgui/fe_boilerplate_is_2026.git
git -C be_boilerplate_is_2026 switch release/1.0.0
git -C fe_boilerplate_is_2026 switch release/1.0.0
cd be_boilerplate_is_2026
python3 deploy/local.py --frontend ../fe_boilerplate_is_2026 --build --seed
```

Durante revisión usar `git switch release/1.0.0` en ambos clones; tras publicación usar main. El script ejecuta el mismo deploy/compose.production.yml del servidor: PostgreSQL, migración, API, Next y Caddy. Solo publica loopback 8080/8443 y conserva volúmenes con proyecto sonnet5-local; no toca el Compose antiguo ni la instancia AWS. Los secretos aleatorios se crean en .local-platform, ignorado por Git. Repetir sin --build reutiliza imágenes; --seed ejecuta la misma implementación deploy/seed-demo.mjs que el servidor.

Abrir https://localhost:8443. Caddy emite un certificado local: confiar la CA en el equipo de desarrollo, o aceptar la excepción exclusivamente para localhost en el navegador. Para exportar la CA:

```bash
docker compose --env-file .local-platform/platform.env -f deploy/compose.production.yml cp gateway:/data/caddy/pki/authorities/local/root.crt .local-platform/caddy-root.crt
curl --cacert .local-platform/caddy-root.crt https://localhost:8443/api/health
```

Swagger: https://localhost:8443/api/docs. Credenciales nuevas en `.local-platform/seed-private/cuentas-qa.json`, modo 0600. Leerlas privadamente; no pegarlas en Git/PR/capturas. Seed crea administrador, seguridad, residentes al día/moroso/multitorre/compartido/límite/sin unidad/inactivo y datos de los diez módulos. Una segunda ejecución preserva contraseñas y registros; un conjunto parcial de usuarios/unidades QA se rechaza para no sobrescribir datos. No refresca fechas automáticamente.

## Ejecución de desarrollo fuera de Docker

`cp .env.example .env`, configurar PostgreSQL y JWT, `npm ci`, `npx prisma migrate deploy`, `npm run build`, `SEED_DEMO=true npm run db:seed` y `npm run start:dev`. API en 3000. Frontend: copiar .env.example a .env.local, API_URL=http://localhost:3000/api/v1/, `npm ci`, `npm run dev -- --port 3001`. CORS_ORIGIN=http://localhost:3001. No mezclar localhost/127.0.0.1 para cookies.

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| DATABASE_URL | Conexión Prisma/pg; en servidor se construye desde archivos de secretos | postgresql://USUARIO:CLAVE@localhost:5432/sonnet5 |
| JWT_SECRET | Secreto privado de firma JWT | Generar con openssl rand -base64 32; no publicar el resultado |
| JWT_EXPIRES_IN | Duración de acceso | 15m |
| REFRESH_TOKEN_EXPIRES_IN_DAYS | Duración de renovación | 7 |
| PORT | Puerto de API | 3000 |
| NODE_ENV | Entorno de ejecución | development en host; production en contenedor |
| UPLOADS_DIR | Fotografías privadas | ./uploads en host; /uploads en contenedor |
| BCRYPT_SALT_ROUNDS | Costo de hash | 12 |
| CUOTA_MENSUAL_USD | Tarifa mensual global | 50.00 |
| CORS_ORIGIN | Origen exacto del frontend | http://localhost:3001 en desarrollo |
| API_URL | Backend consumido en servidor por Next | http://localhost:3000/api/v1/ en desarrollo |
| SEED_DEMO | Activa explícitamente la creación de datos ficticios | true solo al ejecutar seed |
| SEED_CREDENTIALS_FILE | Archivo privado de credenciales del seed | ./.seed-private/cuentas-qa.json |

Las plantillas .env.example contienen nombres y valores de ejemplo para desarrollo. Cambiar los secretos antes de uso real. El seed no corre al iniciar la aplicación. El script histórico prisma/seed.ts solo delega a la implementación común.

## Pruebas automatizadas

En cada repositorio:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Backend: unitarias src/**/*.spec.ts y HTTP test/*.e2e-spec.ts; frontend: tests/ y e2e/. Integración requiere TEST_DATABASE_URL de una base aislada (nombre permitido por las protecciones de las suites), migraciones previas y `npm run test:e2e`. Nunca apuntar TEST_DATABASE_URL a AWS ni al volumen local con datos que se quieran conservar. Los recorridos Playwright usan sus fixtures y configuración; consultar playwright.config.ts para puertos. Las suites HTTP comparten BD y se ejecutan sin paralelismo entre archivos; una interrupción puede dejar fixtures, ver problemas conocidos.
