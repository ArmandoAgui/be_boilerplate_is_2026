# Integración de Sprint 1/2 y decisiones del Product Owner

Base: `develop` del 15/11/2026. Esta propuesta integra H12 y H24, corrige los hallazgos de la auditoría y adapta las reglas al mensaje del PO recibido ese día. No modifica Jira ni integra directamente a develop. Las respuestas del PO prevalecen sobre criterios antiguos contradictorios; deben actualizarse las historias antes de cerrar la aceptación del equipo.

## Decisiones y cobertura

| Módulo              | Comportamiento propuesto                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| General             | Un condominio. Registro de residentes y asociaciones a unidades solo por administrador; asociaciones N:M e idempotentes. Sin distinción de permisos entre propietarios e inquilinos.                                                                                                                                                                                                                                                                                                       |
| Cuotas H1–H4        | Tarifa fija global `CUOTA_MENSUAL_USD`, por defecto USD 50.00 (configurable; no se toma el importe por unidad). Pagos completos y recargo único **5%** sobre el principal desde el día posterior al vencimiento local; sin recargos diarios ni interés compuesto. Base, recargo y total visibles; importe cobrado y recargo quedan conservados al pagar. Ajustes y anulaciones de cuotas pendientes, con motivo y auditoría.                                                               |
| Reservas H5–H8      | Solicitud pendiente y aprobación administrativa. Bloqueo por cuota pendiente vencida en **cualquiera de las unidades vinculadas**, al solicitar y nuevamente al aprobar. Máximo 2 confirmadas futuras por residente. Consulta/cancelación personal y anticipación mínima inclusiva de 24 horas.                                                                                                                                                                                            |
| Incidencias H9–H12  | Reportes de unidad o área, seguimiento privado con detalle/fotos/historial. Administración puede iniciar atención y resolver con confirmación. Se conserva acceso de responsable asignado según H12. H9 prueba concurrencia sobre un servidor HTTP estable.                                                                                                                                                                                                                                |
| Visitas H13–H15     | Nombre y apellido, fecha/ventana de visita; documento opcional. Autorización reutilizable durante su vigencia. Solo un ingreso abierto por autorización; después de registrar salida se puede volver a entrar. Ingreso sin autorización previa requiere solicitud de seguridad al residente de la unidad y aprobación real de ese residente; no basta un booleano enviado por seguridad. Solicitudes en recepción vencen en 1 hora. Cancelación propia de vigentes/pendientes no vencidas. |
| Paquetería H16–H19  | Se registra recepción y avisos **en una transacción**. Aviso incluye código, empresa y fecha/hora. H19 vuelve a estar registrado. Seguridad entrega únicamente a un residente activo vinculado a la unidad, elegido del catálogo de plataforma, guardando su ID/nombre y actor/fecha de entrega. Dos entregas simultáneas: una aceptada, otra 409. Corrección de empresa/descripción o anulación con motivo; no se borra la entrega histórica.                                             |
| Asambleas H20–H22   | Se revalida fecha al publicar. Primer voto por unidad gana; no se verifica deuda ni quórum. Nueva participación guarda opción consultable por administración **solo después del cierre**. Históricos secretos permanecen sin opción identificable; no se intenta reconstruirla. El residente carga automáticamente su participación y tiene ruta de detalle de asamblea.                                                                                                                   |
| Comunicados H23–H24 | Publicación inmutable, avisos y consulta según todas las unidades actuales, incluso anteriores al alta. No se generan confirmaciones de lectura al consultar ni se presentan contadores obligatorios. Se conservan las tablas históricas sin eliminarlas.                                                                                                                                                                                                                                  |
| Directorio H25–H26  | Los tres roles autenticados consultan. Se mantienen preferencias de privacidad y proyección de nombre/teléfono/correo/unidades; solo el residente cambia sus preferencias. No se agregan datos personales adicionales.                                                                                                                                                                                                                                                                     |
| Avisos H27–H28      | Internos, dirigidos a residentes. Enlaces a los detalles privados de comunicados e incidencias ya integrados. Correo electrónico queda fuera: el PO lo declaró NiceToHave.                                                                                                                                                                                                                                                                                                                 |
| Reportes H29–H30    | Panel administrativo con cuatro indicadores generales, período y fórmulas; distingue `Sin datos` de cero. Vista para presentar y PDF sin formularios editables que el administrador puede entregar a cualquier destinatario. Sin enlaces públicos ni deudas identificables de unidades en el PDF.                                                                                                                                                                                          |

## Aclaraciones de implementación

- **Tarifa:** USD 50.00 es un valor inicial configurable, no una tarifa aprobada explícitamente por el PO. El administrador/equipo debe establecer `CUOTA_MENSUAL_USD` antes de generar cuotas. Las cuotas ya emitidas no se reescriben al cambiar esta configuración.
- **Recargo:** se eligió 5%, dado que el PO delegó ese porcentaje al equipo. Se redondea a centavos por cuota; consultar no lo acumula. Los pagos históricos conservan recargo cero si se cobraron antes de esta regla.
- **Cuotas pagadas:** no se alteran ni anulan mediante un ajuste de deuda pendiente, para no deshacer un pago sin devolución. No se implementó un proceso de reembolso contable.
- **Avisos de paquetes:** se resuelve la contradicción anterior H16/H18 a favor de confirmar recepción y avisos juntos. Un fallo de avisos revierte el alta y devuelve error; no quedan recepciones silenciosas. El correlativo puede tener saltos al revertirse, algo esperado en una secuencia.
- **Votos:** cambia explícitamente el antiguo contrato de voto secreto. Solo los votos nuevos registran opción en la participación. Las tablas existentes de votos y participaciones se conservan y siguen insertándose atómicamente.
- **Reportes:** representan el estado actual de registros del período, no reconstruyen saldos históricos a una fecha pasada. Unidades habilitadas y áreas activas son las actuales, como en los módulos de origen. El período usa calendario America/El_Salvador y admite hasta 366 días incluidos.
- **Entrega:** el PO reemplaza el nombre/documento libre del antiguo H17 por un residente identificado con su ficha de plataforma. Se guarda su ID y una copia del nombre; no se solicita documento arbitrario a un tercero.

## API y permisos

Todas las rutas siguientes viven bajo `/api/v1`; se exige JWT válido y cuenta activa.

| Ruta                                                               | Rol                                              |
| ------------------------------------------------------------------ | ------------------------------------------------ |
| POST `/users`                                                      | Administrador                                    |
| GET/POST `/administracion/vinculos`                                | Administrador                                    |
| GET `/administracion/cuotas`, PATCH `/administracion/cuotas/:id`   | Administrador                                    |
| GET `/administracion/unidades/:id/residentes`                      | Seguridad / Administrador                        |
| GET `/paquetes/mios`, GET `/paquetes/:id`                          | Residente, solo unidades propias                 |
| GET `/paquetes/:id/residentes`                                     | Seguridad / Administrador                        |
| POST `/paquetes/:id/entrega`                                       | Seguridad                                        |
| PATCH `/paquetes/:id/correccion`                                   | Seguridad / Administrador                        |
| POST `/visitas/autorizaciones/solicitudes`                         | Seguridad                                        |
| PATCH `/visitas/autorizaciones/:id/aprobacion`                     | Residente destinatario                           |
| GET `/incidencias/mias`, GET `/incidencias/:id`                    | Propiedad y permisos de H12                      |
| GET `/comunicados/mios`, GET `/comunicados/:id`                    | Residente dentro de audiencia actual             |
| GET `/directorio`, GET `/directorio/:id`                           | Todos los roles autenticados; respeta privacidad |
| GET `/administracion/reportes`, GET `/administracion/reportes/pdf` | Administrador                                    |

## Levantar y validar

Node 24 y PostgreSQL. Desde esta rama de backend, en una base **local** nueva:

```sh
cp .env.example .env
# Configurar DATABASE_URL, JWT_SECRET y CUOTA_MENSUAL_USD.
npm ci
npm run prisma:deploy
npm run db:seed
npm run start:dev
```

`db:seed` crea cuentas de demostración `admin@condominio.test`, `seguridad@condominio.test`, `residente1@condominio.test` a `residente5@condominio.test`, contraseña `Prueba123!`. El seed no debe usarse en producción y no elimina datos existentes.

Validación local, con `TEST_DATABASE_URL` apuntando a otra base que termine en `_test`, con migraciones previamente aplicadas:

```sh
npm run build
npm run typecheck
npm run lint
npm test
npm run test:e2e
```

Se evita la contaminación entre suites usando una ejecución secuencial y un listener estable de pruebas. Los logs de fallos deliberadamente inyectados en tests no son fallos de la suite.

La migración nueva es aditiva: conserva pagos, recepciones y votos. Se retira la unicidad total de autorización de visitas y se reemplaza por un índice único parcial para ingresos abiertos. Las autorizaciones anteriormente USADA se vuelven VIGENTE conservando su ventana temporal original: las vencidas siguen sin admitir ingreso. Revisar este cambio de negocio antes de desplegar.

No se cambió la validación temporal automática de GitHub Actions solicitada previamente. Los resultados locales no deben confundirse con una ejecución de CI remota.

## Dependencias y alcance de seguridad

Se actualizaron dependencias transitivas compatibles mediante npm audit fix, sin forzar cambios mayores. La instalación original reportaba 23 avisos (2 críticos); después quedan 8 (2 bajos, 4 moderados y 2 altos), asociados a herramientas de desarrollo/despliegue, incluyendo @nestjs/mau. Su corrección completa requiere revisar el flujo de despliegue: npm propone cambiar @nestjs/mau de 0.2.6 a 0.0.6 con cambios incompatibles. No se aplicó esa regresión automática ni se declara que todo el árbol de desarrollo esté libre de avisos.

## Evidencia de validación local — 15/11/2026

- Node 24; instalación limpia mediante npm ci en ambos repositorios.
- Build, typecheck y lint correctos en ambos proyectos.
- Backend: 220 pruebas unitarias y 205 pruebas HTTP/PostgreSQL, sin omitidas por falta de base.
- Frontend: 181 pruebas de componentes/reglas.
- Navegador: ocho recorridos de comunicados, reportes/PDF, paquetería, confirmación de visitas, permisos, móvil y ciclo de incidencias. Se repiten sobre Next 16.4.6.
- 18 migraciones aplicadas en base nueva y Prisma migrate diff sin diferencias.
- npm audit --omit=dev: cero vulnerabilidades en ambos repositorios. Esto no implica auditoría completa del código ni cero avisos en dependencias de desarrollo.
- Validación temporal de CI y git diff --check correctos. Los tests completos anteriores son locales; no se presentan como ejecuciones de GitHub Actions.
