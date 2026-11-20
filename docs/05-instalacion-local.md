# Instalación local

## Requisitos

Git, Python 3.10+, Docker Engine con Compose V2 y Buildx, conexión a Internet para imágenes/dependencias/fuentes. En Windows usar WSL2 y Docker Desktop integrado, contenedores Linux. Para ejecutar Node fuera de Docker: Node 24. No reutilizar una base real para pruebas de integración.

## Plataforma completa con Docker Compose

```bash
git clone https://github.com/ArmandoAgui/be_boilerplate_is_2026.git
git clone https://github.com/ArmandoAgui/fe_boilerplate_is_2026.git
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

| Variable | Uso |
|---|---|
| DATABASE_URL | Conexión Prisma/pg; Compose del servidor la arma desde secretos |
| JWT_SECRET, JWT_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN_DAYS | Firma y duración de sesiones |
| PORT, NODE_ENV, UPLOADS_DIR | Puerto, entorno y fotos privadas |
| BCRYPT_SALT_ROUNDS | Costo de hash |
| CUOTA_MENSUAL_USD | Tarifa global; recargo único 5% |
| CORS_ORIGIN | Origen exacto del frontend, sin ruta |
| API_URL | Backend privado consumido por Next; no usar NEXT_PUBLIC |
| SEED_DEMO, SEED_CREDENTIALS_FILE | Ejecución explícita del seed y archivo privado de credenciales |

Las plantillas .env.example contienen nombres y valores de ejemplo para desarrollo. Cambiar los secretos antes de uso real. El seed no corre al iniciar la aplicación. El script histórico prisma/seed.ts solo delega a la implementación común.

## Pruebas

En cada repositorio: `npm test`, `npm run typecheck`, `npm run lint` y `npm run build`. Backend: unitarias src/**/*.spec.ts y HTTP test/*.e2e-spec.ts; frontend: tests/ y e2e/. Integración requiere TEST_DATABASE_URL de una base aislada (nombre permitido por las protecciones de las suites), migraciones previas y `npm run test:e2e`. Nunca apuntar TEST_DATABASE_URL a AWS ni al volumen local con datos que se quieran conservar. Los recorridos Playwright usan sus fixtures y configuración; consultar playwright.config.ts para puertos. Las suites HTTP comparten BD y se ejecutan sin paralelismo entre archivos; una interrupción puede dejar fixtures, ver problemas conocidos.
