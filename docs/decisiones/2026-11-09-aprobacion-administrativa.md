# D-M2-03 — Aprobación administrativa de reservas

Fecha: 09/11/2026. Responsable: Armando Antonio Aguilar Rosales.
Rama en ambos repositorios: `feature/modulo-02-aprobacion-reservas`, desde `origin/develop`.

## Alcance autorizado

El Product Owner confirmó aprobación del administrador, cupo por residente y cancelación con 24h. El usuario pidió implementar ahora únicamente el flujo de aprobación, aclarando que las pendientes no ocupan el horario. El bloqueo por deuda queda para un cambio posterior.

Solo se actualizó en Jira H7 / KAN-168: texto de 2h a al menos 24h, incluido el límite exacto. Su estado y las otras tarjetas permanecieron intactos. Esta decisión documenta el nuevo flujo local; no declara los demás criterios de Jira actualizados.

## Comportamiento

- POST /reservas crea PENDIENTE, con creador de la sesión. No acepta identidad/estado suministrados por cliente.
- Una pendiente no ocupa bloques ni consume el cupo de dos CONFIRMADAS futuras. Se conserva el control de cupo confirmado y de horarios ya ocupados también al solicitar.
- Pueden coexistir varias pendientes sobre el mismo intervalo. Aprobar una no confirma las otras.
- Solo Administrador usa GET /reservas/pendientes y PATCH /reservas/:id/aprobacion.
- El listado administrativo es paginado, por orden de llegada, y muestra solo pendientes cuyo inicio aún es futuro, con nombre del residente y del área.
- Aprobar bloquea primero el residente y luego el área; relee la solicitud y revalida estado PENDIENTE, residente activo, inicio futuro, capacidad, horarios vigentes, cupo confirmado y ausencia de reservas confirmadas solapadas. No hay chequeo de deuda en esta entrega.
- La transición condicional PENDIENTE → CONFIRMADA es transaccional. Dos aprobaciones incompatibles dan un éxito y un 409, sin superar cupos ni ocupar doblemente el horario. Una solicitud que falla conserva su estado pendiente.
- Las confirmadas existentes mantienen su estado y datos. No se reclasifican como pendientes.
- El creador puede cancelar una pendiente o confirmada con al menos 24h de anticipación. Se conserva el corte inclusivo de 24h y la privacidad por creador. Las canceladas no se aprueban.
- No se agrega rechazo administrativo ni reprogramación automática. Las pendientes cuyo inicio ya pasó siguen en el historial personal, no se aprueban ni aparecen en la cola futura.

## Interfaz

El residente utiliza «Solicitar reserva» y ve «Pendiente de aprobación» y que el horario aún no está apartado. El administrador entra en /admin/reservas desde «Aprobar reservas», revisa área, residente, fecha/asistentes y confirma en diálogo. Ante 409 se muestra el motivo sin anunciar éxito. Backend y frontend deben actualizarse juntos.

## Migraciones

1. 20261109140000_reservas_pendientes agrega PENDIENTE al enum.
2. 20261109140100_reservas_aprobacion_default cambia el default de las nuevas filas y adapta reserva_cancelacion para admitir PENDIENTE sin canceladaAt.

Se separan porque PostgreSQL debe confirmar el nuevo valor de enum antes de usarlo. Aplicar con `prisma migrate deploy`. No usar db push ni reset sobre bases compartidas. El CHECK mantiene CANCELADA con canceladaAt y los demás estados sin esa marca.

## Verificación

Entorno local Node 22.23.4 y PostgreSQL 18 aislado en un puerto distinto del servidor del usuario.

- Backend: build aprobado; 141 pruebas unitarias aprobadas; 15 HTTP/PostgreSQL de reservas aprobadas. Lint sin errores ni advertencias tras ajustar comparadores de las nuevas pruebas.
- Migraciones desde cero aprobadas. Migración incremental comprobada: fila anterior CONFIRMADA preservada y nueva fila PENDIENTE. Prisma migrate diff sin diferencias.
- Frontend: 138 pruebas aprobadas, typecheck, lint y build de producción aprobados.
- El lockfile backend carecía del peer TypeScript 5 de vite-tsconfig-paths y npm ci fallaba antes de instalar. Se repone únicamente esa entrada; se mantiene TypeScript 6 de la aplicación. npm ci --dry-run valida el lockfile reparado.
- Limitación global del backend: typecheck falla en test/incidencias-h10.e2e-spec.ts:716 por .send(cuerpo) con unknown; ese archivo no cambió. La regresión HTTP completa en base vacía dio 139/142 pruebas aprobadas, con fallos y limpieza incompleta de H9 iniciados por ECONNRESET en su escenario de 20 solicitudes concurrentes. Las pruebas de reservas, H10, visitas, paquetería y health pasaron en esa corrida. No se modificó incidencias para resolverlos dentro de este alcance.

Navegador Chromium contra build de producción + API + PostgreSQL: 3/3 escenarios aprobados (solicitar pendiente sin ocupar, aprobar con administrador, ver confirmación y cancelar en escritorio/móvil; sesión y permisos). Capturas de validación locales en /tmp/ingsoft-aprobacion-screenshots; no sustituyen los mockups históricos. Entrega para revisión hacia develop. Yael (Yael2222) debe revisar y aprobar antes de integrar; no hay merge automático ni despliegue.
