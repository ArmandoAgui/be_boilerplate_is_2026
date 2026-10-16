# Análisis inicial: plataforma de condominios

> Actualización de alcance (16/10/2026): el equipo de cinco integrantes planifica los diez módulos y adaptación de autenticación en cuatro semanas. Se conserva el análisis técnico estático; esta corrección no implementa funcionalidades.

Fecha: 16 de octubre de 2026. Equipo: Armando, Heber, Guille, Serrato y Yael. Los nombres completos y los roles definitivos deben confirmarse en reunión.

## Alcance y evidencia

Este informe describe el código del backend en `92a451f15d79b851e9285a8abb2c82b321a27ef7` y del frontend en `861ee563ad9716638fd0b318991a505440e1057a`. Las rutas citadas son relativas al repositorio de cada documento. La revisión es estática: no equivale a una prueba de funcionamiento.

La especificación académica suministrada, **Especificación de módulos y reglas del proyecto**, páginas 1-6, define las reglas generales y el Proyecto 1. El texto de preparación adjunto define esta ejecución: forks, protección de Git y documentación, sin desarrollar funcionalidades. El PDF permite cambios de autenticación u ORM justificados; esta fase conserva ambos por la restricción más específica del encargo.

El equipo confirma que sus cinco integrantes desarrollarán los diez módulos del Proyecto 1, además de integrar/adaptar autenticación, en cuatro semanas. El reparto general de diez equipos del PDF se registra como aclaración con cátedra; no reduce el alcance de esta planificación.

## Estado comprobado en el código

| Área | Estado | Evidencia |
|---|---|---|
| Backend | NestJS 12, TypeScript 6, ESM, Express | [package.json](../package.json), [tsconfig.json](../tsconfig.json) |
| Datos | Prisma 7, adaptador pg, PostgreSQL 18 en Compose; solo usuarios y refresh tokens | [schema](../prisma/schema.prisma), [Compose](../docker-compose.yml) |
| Autenticación | Registro, login, renovación con rotación, logout y consulta del usuario; guard JWT global | [AuthController](../src/auth/controllers/auth.controller.ts), [UsersController](../src/users/controllers/users.controller.ts), [guard](../src/auth/guards/jwt-auth.guard.ts) |
| Roles | Pendientes: no hay campo de rol, enum ni guard de permisos | [schema](../prisma/schema.prisma), [payload](../src/auth/types/auth.types.ts), [guard](../src/auth/guards/jwt-auth.guard.ts) |
| Frontend | Next.js 16.3.6, React 19.2.8, TypeScript y Tailwind 4; login real por Server Action | Frontend: `package.json`, `app/actions/auth.ts` |
| Sesión web | Cookie HttpOnly y redirección por presencia de cookie; no valida expiración ni renueva tokens | Frontend: `lib/session.ts`, `proxy.ts`, `app/actions/auth.ts` |
| Negocio | Ninguno de los diez módulos está implementado | Inventario de `src/`, schema y rutas frontend `app/` |

El frontend encontrado tiene más implementación que la pantalla genérica descrita en el PDF. A su vez, el módulo 0 del documento menciona roles que el código todavía no incorpora. Se documenta el estado real sin modificarlo.

## Integración y riesgos prioritarios

El contrato de login coincide en `{ email, password }` y `accessToken`. Sin embargo, el frontend configura `API_URL=http://localhost:8000` en `.env.example`, mientras Nest expone `/api/v1` en el puerto 3000 por defecto ([main.ts](../src/main.ts)). La base para la llamada debe incluir ese prefijo; el puerto debe corresponder al host o a la red de contenedores. Los dos servidores también compiten por 3000 en sus configuraciones predeterminadas. Son ajustes propuestos para la siguiente fase, sin cambiar plantillas ahora.

El access token dura 15 minutos por defecto; la cookie web dura siete días y descarta el refresh token. Una cookie presente puede abrir la página inicial con un token ya inválido. El logout web solo elimina la cookie y no revoca la sesión del backend. Además, faltan autorización por rol y pertenencia a unidad/condominio. La rotación de refresh tokens no es atómica, lo cual requiere revisión de concurrencia antes de integrarla en el frontend.

## Preparación de Git y validación

Los forks son `ArmandoAgui/be_boilerplate_is_2026` y `ArmandoAgui/fe_boilerplate_is_2026`. En ambos, `origin` apunta al fork; `upstream` conserva la URL de lectura de `nrecinos2001` y tiene push deshabilitado mediante `disabled://upstream-read-only`. La rama de trabajo es `docs/analisis-inicial`.

Cada clon usa un hook local en `.git/protection-hooks/pre-push`, activado con `core.hooksPath`, que acepta únicamente el destino exacto del fork y la rama de documentación. `remote.pushDefault=origin`, `push.default=simple` y `branch.main.pushRemote=disabled` complementan esa protección. Se comprobó el rechazo de upstream y main invocando el hook localmente, sin intentar pushes a la cátedra. Los hooks no viajan con el clon ni constituyen reglas de protección del servidor; deberán reproducirse o sustituirse por reglas del fork en una fase posterior.

Los árboles iniciales estaban limpios. Se preservan los SHA de main indicados arriba. La validación de esta entrega comprueba cambios exclusivamente nuevos en `docs/*.md`, referencias locales, inventario de endpoints, ausencia de credenciales y conservación de main. No se instalaron dependencias ni se ejecutaron migraciones, seeds o servicios. `node`, `npm` y `docker` no están disponibles en el PATH de la sesión; build, lint y pruebas de las aplicaciones quedan sin ejecutar.

## Lectura sugerida y decisiones

1. [Tecnologías y entorno](01-analisis-backend.md), [arquitectura](02-arquitectura-backend.md) y [modelo existente](03-base-de-datos.md).
2. [Autenticación](04-autenticacion-backend.md) y [seis endpoints existentes](05-endpoints-existentes.md).
3. [Riesgos](06-riesgos-y-recomendaciones.md) y [propuesta preliminar de plataforma](07-propuesta-plataforma-condominios.md).
4. En el fork frontend, `docs/01-analisis-frontend.md` a `docs/04-integracion-backend.md`.

La primera reunión debe fijar el alcance completo, contratos de roles y pertenencia, estrategia de sesión, responsables de entidades compartidas y migraciones, puertos y despliegue. Se recomienda reutilizar la estructura modular, los repositorios, DTOs, normalización de email y autenticación existentes, agregando las decisiones faltantes en cambios posteriores revisados por el equipo. No se eligió una nueva librería de estado, ORM ni arquitectura distribuida.
