# Módulo 2 — Reservas de áreas comunes H5–H8

Responsable: Armando Antonio Aguilar Rosales. Sonnet 5. Actualizado 29/10/2026.

## Fuentes y decisión vigente

Se analizaron el PDF del 28/10/2026 (páginas 3–7,15–20), la rama docs/analisis-inicial (`4c958fe`) y el código real del boilerplate. No se modifica la documentación de análisis.

**Cambio de alcance aprobado por el usuario:** las reservas son personales, el cupo es de dos futuras por usuario y solo su creador las ve y cancela. Esta instrucción sustituye las reglas por unidad del PDF. Véase [D-M2-01](decisiones/2026-10-29-reservas-personales.md), que registra aprobación, compatibilidad y efecto en datos previos.

## Arquitectura y modelos

Nest 12 / TypeScript 6 / Prisma 7 / PostgreSQL. JWT global existente, controller → service → repository → Prisma. No se agregan dependencias backend. AppModule importa ReservasModule. UserResponseDto publica rol/nombre sin passwordHash. Se corrigió el lockfile para el peer TypeScript 5 de vite-tsconfig-paths; la app usa TypeScript 6.

Archivos de negocio: `controllers/reservas.controller.ts`, `services/reservas.service.ts`, `services/reservas.rules.ts`, `repositories/reservas.repository.ts`, `dto/reservas.dto.ts`, `filters/reservas-http.filter.ts` dentro de src/reservas. El filtro normaliza message a string.

Se reutilizan User y RefreshToken. Base compartida mínima del PDF: Rol (RESIDENTE/ADMINISTRADOR/SEGURIDAD), nombre/teléfono de User, Torre/Seccion/Unidad/UsuarioUnidad. Se conservan email e isActive del boilerplate. La FK compuesta sección/torre evita cruces. Estas entidades permanecen disponibles para M0/M1; reservas ya no requiere pertenencia a unidad. No hay API pública para asignar roles, editar perfiles o unidades. El nombre provisional del registro sigue pendiente de M0.

AreaComun: UUID, nombre único 3–60, capacidad 1–500, activa, auditoría. HorarioArea: día 0–6 y HH:mm, franjas válidas sin solapamientos. Reserva: UUID, código único secuencial RES-000001, areaId, userId creador, inicio/fin UTC, asistentes, CONFIRMADA/CANCELADA, canceladaAt y auditoría. unidadId es nullable e histórico; no se solicita ni se asigna en nuevas reservas.

## Migraciones

- `20261029140000_modulo_02_reservas`: base compartida, áreas, horarios y reservas, secuencia/función de códigos, índices y CHECKs simples. Conserva las dos migraciones anteriores.
- `20261029160000_reservas_personales`: DROP NOT NULL de unidadId e índice `(userId,estado,inicio)`. Conserva todos los registros y su autor original.

No se usan db push, migrate reset ni borrados de datos ajenos. La secuencia puede tener saltos por rollback. El protocolo transaccional es obligatorio también para futuros escritores de otros módulos; no se afirma que escrituras SQL directas eviten solapamientos automáticamente.

## API

Prefijo `/api/v1`, Bearer del boilerplate. auth/me incluye id/email/nombre/rol/isActive/createdAt.

| Ruta | Rol | Entrada | Respuesta |
|---|---|---|---|
| GET /areas | Residente, Administrador | — | 200 `{datos:[{id,nombre,capacidad,activa,horarios}]}` |
| GET /areas/:id/disponibilidad | Residente, Administrador | fecha AAAA-MM-DD | 200 `{areaId,fecha,bloques:[{inicio,fin,estado}]}` |
| POST /areas | Administrador | nombre, capacidad, activa opcional, horarios | 201 área |
| PATCH /areas/:id | Administrador | Mismos campos, opcionales | 200 área |
| POST /reservas | Residente | areaId, inicio ISO con zona, duracionHoras, asistentes | 201 reserva personal |
| GET /reservas/mias | Residente | estado opcional, pagina≥1 (1), tamanoPagina 1–50 (20) | 200 `{datos,total,pagina,tamanoPagina}` propias |
| PATCH /reservas/:id/cancelacion | Residente creador | UUID | 200 `{id,estado:"CANCELADA",canceladaAt}` |
| GET /unidades/mias | Residente | — | Contrato compartido `{datos:[{id,codigo}]}`; no participa en reservas |

El residente recibe solo áreas activas; el administrador también inactivas. Disponibilidad de área inactiva devuelve 404 para ambos. Cada día devuelve 24 bloques, incluidos pasados/fuera de horario; 24:00 se usa solo como fin visual del último bloque. Los datos del listado incluyen área, fechas, asistentes y estado, sin unidadCodigo; unidadId puede aparecer como metadato histórico/null.

```json
{"areaId":"11111111-1111-4111-8111-111111111111","inicio":"2026-10-30T18:00:00.000Z","duracionHoras":2,"asistentes":4}
```

El servidor añade userId del JWT y código. Cliente no puede indicar userId ni unidadId.

```json
{"nombre":"Salón de eventos","capacidad":40,"activa":true,"horarios":[{"diaSemana":1,"horaInicio":"06:00","horaFin":"22:00"}]}
```

```json
{"statusCode":409,"error":"Conflict","message":"Ese horario ya fue reservado. Elija otro."}
```

## Reglas, errores y concurrencia

Zona America/El_Salvador UTC−6 sin cambios estacionales; almacenamiento timestamptz(3)/ISO UTC. Hoy y hoy+30 inclusivos. Inicio futuro en punto, duración entera 1–4 horas, asistentes 1–capacidad, cobertura completa en franjas del día. Franjas colindantes forman una ventana continua; separadas no.

La transacción interactiva toma `SELECT users FOR UPDATE` del actor, después `SELECT AreaComun FOR UPDATE`, relee área, valida horario/capacidad/fecha, cuenta futuras por userId, comprueba solapamiento `[inicio,fin)` y crea antes del commit. Mismo TransactionClient para todas las consultas, ReadCommitted predeterminado, maxWait 10s/timeout 15s. Bloqueo de usuario evita una tercera reserva entre áreas distintas; bloqueo del área evita solapamientos entre creadores diferentes. H8 también bloquea el área al editar y reemplaza horarios atómicamente.

Cancelar filtra la reserva por creador, bloquea usuario y hace updateMany por id/userId/estado CONFIRMADA/inicio≥ahora+2h. Guarda canceladaAt. Dos cancelaciones simultáneas dan 200/409. A exactamente 2h la API permite cancelar; la UI muestra botón solo si faltan más de 2h según el texto de H7. Canceladas no ocupan ni cuentan. Modificar o desactivar áreas conserva reservas existentes e impide nuevas cuando está inactiva.

400: datos/UUID/paginación inválidos, campos extra, fecha/duración/hora/capacidad/franjas inválidas o área inactiva al crear. 401: JWT ausente/inválido o usuario inactivo. 403: rol sin permiso (administrador no hereda reservar/cancelar). 404: área inexistente, disponibilidad inactiva o reserva ajena, aunque se comparta unidad. 409: horario ocupado, límite personal, nombre duplicado, doble cancelación o plazo inválido.

## Ejecución y pruebas

Node 24 actualizado / npm 11. Compose/Dockerfile originales con PostgreSQL 18. Configurar .env sin versionar secretos.

```bash
npm ci
npx prisma migrate deploy
NODE_ENV=development npx prisma db seed
npm run build
npm run start:prod
```

Seed idempotente, prohibido en producción: ocho unidades, siete usuarios y cuatro áreas 06:00–22:00 toda la semana. Cuentas admin/seguridad/residente1 a residente5 en @condominio.test; contraseña exclusivamente de pruebas del PDF: Prueba123!. Conserva datos existentes. La asignación de unidades no es requisito para reservar.

```bash
npm run lint
npm run build
npm run typecheck
npm test
TEST_DATABASE_URL=postgresql://postgres@localhost:55439/reservas_test npm run test:e2e
```

Aplicar las cuatro migraciones antes de integrar. TEST_DATABASE_URL debe terminar en _test; sin variable las pruebas HTTP se omiten. Los fixtures tienen UUID propios y solo eliminan sus datos.

Resultados locales actuales: **40 unitarias y 13 HTTP/integración aprobadas**. Incluyen creación sin unidad, propiedad personal con unidad compartida, UTC, historial previo, validaciones, permisos, rollback de horarios, desactivación y tres carreras reales en PostgreSQL (solapamiento 201/409, límite personal entre áreas 201/409 y doble cancelación 200/409). Migración incremental y diff sin diferencias comprobados. CI valida una base vacía PostgreSQL 18, las cuatro migraciones, lint/build/typecheck y suites. El PR frontend complementario debe desplegarse junto con este contrato.

## Límites

Coordinar la excepción aprobada al PDF y los modelos compartidos con el equipo/cátedra. Se conservan los riesgos heredados de refresh/logout de M0 y avisos npm audit de dependencias base (Nest/Prisma y herramientas); no se afirma cobertura exhaustiva ni ausencia de vulnerabilidades. GitHub negó lectura administrativa de protección de main con 403; reglas intactas. Revisores pendientes de asignación manual por instrucción del usuario. Sin merges ni cambios en main/originales.
