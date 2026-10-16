# Tecnologías, herramientas y entorno del backend

Base analizada: `92a451f`; revisión estática del 16/10/2026. Los rangos declarados no deben confundirse con versiones instaladas: no hay instalación verificada. Las versiones resueltas siguientes proceden de [package-lock.json](../package-lock.json).

## Stack comprobado

| Componente | Declaración en package.json | Resolución del lock / configuración |
|---|---|---|
| NestJS / Express | common, core y platform-express `^12.0.1` | core `12.0.3`; adaptador HTTP `@nestjs/platform-express` |
| Configuración | `@nestjs/config ^12.0.0` | `12.0.0`; validación propia al arranque |
| JWT | `@nestjs/jwt ^12.0.2` | `12.0.2`; HS256 configurado en AuthModule |
| OpenAPI | `@nestjs/swagger ^12.0.1` | `12.0.1`; interfaz en `/api/docs` |
| Prisma CLI / cliente / adaptador | `^7.10.0` | Prisma y cliente `7.10.0`; adaptador PostgreSQL |
| PostgreSQL | No se instala por npm | Imagen `postgres:18-alpine` en Compose |
| Driver PostgreSQL | `pg ^8.23.0` | Se usa a través de PrismaPg |
| Contraseñas | `bcrypt ^6.0.0` | Rondas configurables; 12 por defecto |
| DTOs | class-validator `^0.15.1`, class-transformer `^0.5.1` | ValidationPipe global y transformación de email |
| Lenguaje | TypeScript `^6.0.2` | Lock `6.0.3`; ESM, NodeNext y target ES2023 |
| Pruebas | Vitest `^4.1.2`, Supertest `^7.0.0`, @nestjs/testing | Vitest `4.1.11`; configs unitarias y e2e |
| Calidad | oxlint `^1.58.0`, oxlint-tsgolint, Prettier `^3.4.2` | `lint` usa análisis de tipos; `format` escribe archivos |

Fuente de rangos y scripts: [package.json](../package.json). Otras dependencias de ejecución son `dotenv`, `reflect-metadata`, `rxjs` y `tsx`; esta última ejecuta el seed. No hay Passport, middleware de sesiones ni biblioteca RBAC declarados.

## Node.js

El manifiesto raíz no declara `engines` y no hay archivo de versión de Node versionado. [Dockerfile](../Dockerfile) fija la familia `node:24-alpine`, no una versión patch. El [README](../README.md) recomienda Node 22 o 24 y menciona ≥20.19; el lock precisa para Prisma `^20.19 || ^22.12 || >=24.0`, para Nest core `>=20` y para Swagger `^20.19.0 || >=22.12.0`. La intersección importa: no cualquier Node mayor a 20.19 satisface todos esos rangos. Se propone usar Node 24 como el contenedor, sin alterar configuración en esta fase.

## Construcción y calidad

`npm run build` ejecuta `nest build` y después `tsc-alias -p tsconfig.build.json`. [tsconfig.json](../tsconfig.json) define alias por módulo, imports ESM y tipado estricto. [tsconfig.build.json](../tsconfig.build.json) limita la compilación a `src`, excluyendo specs. El generador Prisma escribe bajo `src/generated/prisma`, ignorado por Git y regenerado mediante `postinstall`. Los barrels `index.ts` agrupan exportaciones.

`start:dev` y `start:debug` coordinan Nest y tsc-alias en modo watch con `concurrently`. `start:prod` ejecuta `dist/main.js`. [Configuración de oxlint](../.oxlintrc.json) ignora archivos generados y detecta promesas no gestionadas. Prettier tiene configuración propia en `.prettierrc`; no se ejecutó `format` porque modificaría código base.

## Pruebas existentes y límites

[vitest.config.ts](../vitest.config.ts) selecciona `**/*.spec.ts`, mientras [vitest.config.e2e.ts](../vitest.config.e2e.ts) selecciona `**/*.e2e-spec.ts`; ambos habilitan globals y alias. Existe una prueba de [HealthController](../src/health/controllers/health.controller.spec.ts) que verifica `Hello World!` y una [e2e](../test/app.e2e-spec.ts) que monta AppModule y consulta `/`.

La e2e no ejecuta `bootstrap()` de main: no comprueba el prefijo `/api/v1`, el pipe ni Swagger tal como se configuran en producción; sí instancia módulos que necesitan variables y conexión PostgreSQL. No hay specs de autenticación, autorización o concurrencia en el inventario versionado. La presencia de herramientas y dos specs no demuestra cobertura suficiente ni pruebas aprobadas.

## Docker y configuración

[docker-compose.yml](../docker-compose.yml) incluye `postgres` y `api`, healthcheck `pg_isready`, dependencia `service_healthy`, volumen `pgdata` en `/var/lib/postgresql` y puertos publicados. La API recibe la URL interna con host `postgres`; su comando aplica `prisma migrate deploy` antes de iniciar Node. Es ejecución configurada, no verificada aquí.

[Dockerfile](../Dockerfile) tiene etapas deps, builder y runner: `npm ci` genera Prisma con una URL placeholder; compila, poda devDependencies y ejecuta como usuario `node`. El CMD directo solo inicia Node; la aplicación de migraciones la añade Compose. No hay servicio frontend en este Compose.

[env.validation.ts](../src/config/env.validation.ts) requiere `DATABASE_URL` y `JWT_SECRET` de al menos 32 caracteres. Da defaults para `NODE_ENV`, `PORT`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN_DAYS` y `BCRYPT_SALT_ROUNDS`. Los enteros deben ser positivos; no valida sintaxis de URL, duración JWT ni un máximo de rondas bcrypt. Las variables `POSTGRES_*` las consume Compose; su plantilla está en [.env.example](../.env.example). No se reproducen valores de credenciales.

## Estado del entorno de esta revisión

Git y GitHub CLI están disponibles; cuenta autenticada: `ArmandoAgui`. `node`, `npm` y `docker` no se encontraron en PATH. No se ejecutaron builds, lint, tests, contenedores ni migraciones, y no se cambiaron dependencias. La siguiente fase deberá habilitar Node compatible y Docker Compose, conservar el Compose de la cátedra y verificar el arranque sobre una base de desarrollo antes de afirmar que existe integración funcional.
