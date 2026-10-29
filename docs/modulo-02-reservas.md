# Módulo 2: reservas de áreas comunes — H5–H8

Responsable: Armando Antonio Aguilar Rosales. Equipo Sonnet 5. Implementación del 29/10/2026.

## Fuentes y compatibilidad

Se revisó el PDF `HISTORIAS_USUARIO_SONNET_5_PROYECTO_1_IS_02_2026 (2).pdf` (28/10/2026), páginas visibles 3–7 y 15–20, y `origin/docs/analisis-inicial` (commit `4c958fe`), incluidos arquitectura, autenticación, integración, modelo conceptual y planificación. El PDF prevalece sobre las propuestas preliminares de la rama de análisis. No se modifica esa documentación.

La auditoría encontró main backend `92a451f`, sin cambios locales ni modelos de dominio. La rama `feat/auth-prisma-docker` tampoco tenía roles/unidades. Se conserva Nest 12, TypeScript 6, Prisma 7, PostgreSQL, JWT global y patrón controller → service → repository → Prisma. No se agregan dependencias backend. Se corrige el lockfile para que pueda instalarse el peer TypeScript 5 de `vite-tsconfig-paths`; el TypeScript de la aplicación sigue siendo 6.

## Arquitectura y archivos

- `src/reservas/controllers/reservas.controller.ts`: AreasController, ReservasController y adaptador mínimo UnidadesReservaController; DTOs y parámetros UUID.
- `src/reservas/services/reservas.service.ts`: casos de uso, rol, pertenencia, transacciones.
- `src/reservas/services/reservas.rules.ts`: fechas locales, franjas, intervalos semiabiertos `[inicio, fin)`, duración/capacidad.
- `src/reservas/repositories/reservas.repository.ts`: único acceso del módulo a Prisma; comparte TransactionClient entre bloqueo, lecturas e inserción; paginación consistente.
- `src/reservas/dto/reservas.dto.ts`: validación estricta y PATCH parcial.
- `src/reservas/filters/reservas-http.filter.ts`: errores del módulo con message string, incluyendo errores de validación.
- `src/reservas/reservas.module.ts`: composición; se importa en AppModule.
- `src/users/dto/user-response.dto.ts`: añade rol/nombre públicos a login y auth/me; nunca hash ni relaciones completas.

## Datos y migraciones

Se reutilizan User/RefreshToken; se añaden a User `rol`, `nombre`, `telefono` y relaciones. Se conserva `email` en vez de renombrar a correo, e `isActive` en vez de activo, para mantener la autenticación existente. La migración conserva usuarios y asigna RESIDENTE por defecto, sin asignar unidades automáticamente ni elevar permisos.

Base compartida mínima del PDF: Rol (RESIDENTE, ADMINISTRADOR, SEGURIDAD), Torre, Seccion, Unidad (codigo, torre, sección, cuotaMensual Decimal, activa), UsuarioUnidad (N:M único). La FK compuesta de sección/torre impide unidades de una sección de otra torre. Esta base debe integrarse con los responsables de M0/M1; no hay API para cambiar roles/unidades ni una segunda identidad. El registro del boilerplate sigue sin recoger nombre/teléfono: nombre provisional hasta integrar M0. No se implementan directorio, cuotas o gestión de usuarios fuera de este alcance.

Modelos propios: AreaComun, HorarioArea y Reserva; UUID, relaciones restrictivas para conservar reservas, estados CONFIRMADA/CANCELADA. Inicio, fin y canceladaAt son timestamptz(3); Prisma devuelve ISO UTC. Índices `(areaId,inicio,fin)` y `(unidadId,estado,inicio)`.

Migración nueva: `prisma/migrations/20261029140000_modulo_02_reservas/migration.sql`. Incluye secuencia y función para códigos `RES-000001`, únicos entre áreas y transacciones, ampliables a más de seis dígitos. Los saltos de secuencia tras rollback son normales. Añade CHECKs simples de capacidad, nombre, formato de franjas, duración y coherencia de cancelación. Solapamientos y cupo requieren pasar por el repositorio transaccional; escrituras SQL externas deben respetar el mismo protocolo. No se ejecutó db push, migrate reset ni se alteraron las dos migraciones previas.

## Contratos HTTP

Todas las rutas llevan `/api/v1` y Bearer JWT del boilerplate. `GET auth/me` incluye `id,email,nombre,rol,isActive,createdAt`.

| Método/ruta | Rol | Entrada | Éxito |
|---|---|---|---|
| GET /areas | Residente, Administrador | Sin parámetros | 200 `{datos:[{id,nombre,capacidad,activa,horarios}]}` |
| GET /areas/:id/disponibilidad | Residente, Administrador | `fecha=AAAA-MM-DD` | 200 `{areaId,fecha,bloques:[{inicio,fin,estado}]}` |
| POST /areas | Administrador | CrearArea | 201 área con horarios |
| PATCH /areas/:id | Administrador | Campos opcionales de CrearArea | 200 área con horarios |
| POST /reservas | Residente | CrearReserva | 201 reserva |
| GET /reservas/mias | Residente | estado opcional, pagina≥1 (1), tamanoPagina 1–50 (20) | 200 `{datos,total,pagina,tamanoPagina}` |
| PATCH /reservas/:id/cancelacion | Residente de la unidad | UUID, sin body | 200 `{id,estado:"CANCELADA",canceladaAt}` |
| GET /unidades/mias | Residente | Sin parámetros | 200 `{datos:[{id,codigo}]}` |

Residente recibe solo áreas activas; Administrador recibe también inactivas para H8. Disponibilidad devuelve 404 para un área inactiva incluso al administrador. Cada día devuelve 24 bloques; 23:00–24:00 usa 24:00 como fin visual, sin aceptarlo como hora de franja. Un bloque confirmado sigue marcado Ocupado aunque posteriormente se restrinja el horario. Un bloque pasado sin reserva se marca Fuera de horario.

CrearArea:
```json
{"nombre":"Salón de eventos","capacidad":40,"activa":true,"horarios":[{"diaSemana":1,"horaInicio":"06:00","horaFin":"22:00"}]}
```

CrearReserva (sustituir UUIDs y fecha por valores de la base y próximos 30 días):
```json
{"areaId":"11111111-1111-4111-8111-111111111111","unidadId":"22222222-2222-4222-8222-222222222222","inicio":"2026-10-30T18:00:00.000Z","duracionHoras":2,"asistentes":4}
```
Respuesta de creación (también incluye userId y fechas de auditoría):
```json
{"id":"33333333-3333-4333-8333-333333333333","codigo":"RES-000001","areaId":"11111111-1111-4111-8111-111111111111","unidadId":"22222222-2222-4222-8222-222222222222","inicio":"2026-10-30T18:00:00.000Z","fin":"2026-10-30T20:00:00.000Z","asistentes":4,"estado":"CONFIRMADA"}
```

Listado: cada fila incluye `id,codigo,areaId,unidadId,userId,areaNombre,unidadCodigo,inicio,fin,asistentes,estado,canceladaAt,createdAt,updatedAt`. Orden ascendente por inicio e id; incluye historial cancelado y pasado. Se consultan las unidades activas vinculadas actualmente, no únicamente el usuario que creó la reserva.

Conflicto:
```json
{"statusCode":409,"error":"Conflict","message":"Ese horario ya fue reservado. Elija otro."}
```

## Reglas y errores

- 400: fechas imposibles/pasadas/después de hoy+30, inicio pasado o no en punto, duración fuera de 1–4 enteros, asistentes fuera de 1–capacidad, área inactiva al crear, capacidad fuera de 1–500, nombre fuera de 3–60, franjas vacías/invalidas/traslapadas, UUID o paginación inválidos, propiedades adicionales. ISO requiere Z o desplazamiento explícito.
- 401: sin JWT válido o usuario inactivo (guard original).
- 403: rol no autorizado o unidad no vinculada al crear. Administrador no hereda permiso de reservar/cancelar. Seguridad no consulta áreas.
- 404: área inexistente, disponibilidad de área inactiva o reserva ajena/inexistente al cancelar.
- 409: mismo horario ocupado, dos reservas confirmadas futuras por unidad, nombre duplicado o transición inválida al cancelar.

El día calendario es America/El_Salvador (UTC−6, sin cambios estacionales). Hoy y hoy+30 son inclusivos. La reserva debe caber completamente en las franjas del día; franjas colindantes cubren una ventana continua, las separadas no. Se permiten minutos en franjas (PDF); solo bloques completos de una hora pueden reservarse.

## Concurrencia y cancelación

Crear reserva abre transacción interactiva con aislamiento ReadCommitted predeterminado y espera/timeout acotados: `SELECT Unidad FOR UPDATE` → validar vínculo vigente/unidad activa → `SELECT AreaComun FOR UPDATE` → releer área, validar horario/capacidad/fecha, contar futuras por unidad, consultar confirmadas que traslapan, insertar antes de commit. Todas las operaciones usan el MISMO TransactionClient. El bloqueo adicional de unidad impide exceder el máximo con solicitudes a áreas diferentes. El bloqueo de área también se usa en H8 para que cambios administrativos se serialicen con nuevas reservas. Intervalos colindantes no se traslapan.

Cancelar permite a cualquier residente de la unidad, según páginas 6 y 18 del PDF. Usa bloqueo de unidad y `updateMany WHERE estado=CONFIRMADA AND inicio >= ahora+2h`. Dos cancelaciones simultáneas producen una 200 y otra 409; guarda canceladaAt. A exactamente 2h la API permite cancelar; el botón de UI exige más de 2h (texto explícito de H7). Canceladas no ocupan bloques ni cuentan para cupo.

Decisión complementaria del equipo solicitada: desactivar un área bloquea reservas nuevas y conserva todas las confirmadas existentes. Es coherente con H8 (cambios solo para nuevas reservas). Cambiar capacidad/horarios no reescribe ninguna Reserva. PATCH reemplaza franjas atómicamente; un fallo de nombre duplicado revierte también su reemplazo.

## Ejecución local

Usar Node 24 actualizado (se validó 24.22.2) y npm 11; el Node 22.12 instalado inicialmente no satisface todas las herramientas del lock. Se conserva Dockerfile/docker-compose original con PostgreSQL 18. Configure `.env` a partir de `.env.example`, sin versionar secretos.

```bash
npm ci
npx prisma migrate deploy
NODE_ENV=development npx prisma db seed
npm run build
npm run start:prod
```

Seed idempotente y prohibido en NODE_ENV=production: crea torres A/B, secciones Norte/Sur, ocho unidades/cuotas base, siete cuentas del PDF y cuatro áreas con 06:00–22:00 todos los días. Conserva datos ya existentes. Las cuentas son `admin@condominio.test`, `seguridad@condominio.test` y `residente1` a `residente5@condominio.test`; contraseña exclusivamente de pruebas definida en PDF: `Prueba123!`. No representa credenciales reales.

Frontend requiere `API_URL=http://localhost:3000/api/v1` (o puerto elegido). Ejecutar Next en un puerto diferente. PR complementario: fork `ArmandoAgui/fe_boilerplate_is_2026`, rama `feature/modulo-02-reservas`.

## Pruebas y evidencia

```bash
npm run lint
npm run build
npm run typecheck
npm test
TEST_DATABASE_URL=postgresql://postgres@localhost:55439/reservas_test npm run test:e2e
```

La BD de integración debe terminar en `_test`; aplicar migraciones antes. Sin TEST_DATABASE_URL los tests de integración se omiten explícitamente. No usar datos de compañeros. Las pruebas generan sus propios registros UUID y eliminan solo esos registros al terminar.

Resultados locales: 40 unitarias aprobadas (incluida health existente) y 12 HTTP/integración aprobadas en PostgreSQL 16 aislado mediante Docker. Dos peticiones Supertest se inician simultáneamente con Promise.all contra el mismo servidor/base: un alta 201 y conflicto 409; también carrera por cupo entre áreas distintas y doble cancelación. Se probaron JWT/login, roles, unidad compartida/ajena, UTC, paginación, liberación de canceladas, validaciones, rollback de franjas y conservación al desactivar. No se confunde mocks unitarios con concurrencia real.

Migraciones: deploy de las dos anteriores y la nueva desde una base vacía; status al día; diff esquema real vs Prisma sin diferencias. Build, typecheck y lint aprobados. CI `.github/workflows/reservas.yml` reproduce lint/build/typecheck/unitarias/integración y migraciones con PostgreSQL 18.

## Límites y revisión de integración

- Migraciones compartidas con M0/M1 deben coordinarse antes de fusionar. No existe alta/edición de roles, unidades, perfiles o relaciones en UI: se provee seed mínimo aprobado por PDF.
- La sesión JWT/refresh del boilerplate se conserva. Los riesgos ya documentados de rotación de refresh concurrente y logout local del frontend pertenecen a M0; no se declara corregida esa parte.
- npm audit detecta avisos heredados en dependencias backend (incluidos concurrently/shell-quote críticos y Nest/Prisma transitivos altos). No se actualizaron masivamente herramientas/frameworks ajenos al módulo. Revisar antes de despliegue público; no se afirma ausencia de vulnerabilidades en el boilerplate.
- Se solicitó leer protección de main vía GitHub; la integración devolvió 403 por falta de permiso administrativo. No se cambian protecciones. No hay merges ni cambios directos en main ni escrituras en originales.
- Por indicación posterior del usuario, no se solicitan revisores automáticamente: el usuario los asignará después.
