# D-M2-01 — Reservas personales

**Fecha:** 29/10/2026. **Estado:** aprobado explícitamente por el usuario en esta sesión.

Confirmación recibida: «Cambiar la regla: reservas personales, máximo 2 futuras por usuario y solo su creador puede verlas y cancelarlas.»

Esta instrucción sustituye, para este módulo, las reglas H6/H7 del PDF que asignaban las reservas, el límite y la cancelación a la unidad. Debe comunicarse al equipo/cátedra; no se presenta como requisito original del PDF. El resto del PDF permanece vigente.

## Comportamiento vigente

- User es dueño de la reserva. `userId` procede del JWT, nunca de un campo enviado por el cliente.
- No se requiere unidad ni vínculo UsuarioUnidad para reservar. Máximo dos CONFIRMADAS con inicio futuro por usuario.
- GET /reservas/mias consulta solo `userId` del actor. PATCH cancelación filtra id y userId; ajenas devuelven 404, incluso para residentes de la misma unidad.
- Crear bloquea la fila users del actor y después AreaComun, dentro del mismo TransactionClient. El bloqueo de usuario protege el cupo al reservar áreas distintas; el del área protege solapamientos entre usuarios.
- El horario elegido se muestra como resumen de lectura en la confirmación. Para modificar área/fecha/inicio se vuelve a disponibilidad. Duración y asistentes siguen editables.
- Duración, capacidad, zona horaria, 30 días, plazo de cancelación y conservación de reservas ante cambios administrativos no cambian.

## Migración y conservación

`20261029160000_reservas_personales` permite NULL en Reserva.unidadId y añade índice `(userId, estado, inicio)`. No borra, reasigna ni cancela reservas existentes. Su userId original conserva la propiedad y su unidadId queda como dato histórico; las nuevas usan NULL. Las entidades compartidas Unidad/UsuarioUnidad/Torre/Seccion permanecen para otros módulos.

Si un usuario ya acumulaba más de dos futuras bajo la regla anterior, se conservan y se impiden nuevas hasta bajar del límite. Los clientes deben actualizarse junto al backend: POST ya no acepta unidadId ni userId (400 por propiedades adicionales). No hay rollback destructivo automático.

## Evidencia

Pruebas HTTP con PostgreSQL: alta sin unidad, UTC, listado aislado por creador, protección contra suplantar userId, usuarios de misma unidad con cupos separados, carreras por cupo y solapamiento, doble cancelación y acceso a reservas históricas al desactivar una unidad. Pruebas UI: resumen fijo, sin selector de unidad, conservación ante 409 y navegación de regreso a disponibilidad.
