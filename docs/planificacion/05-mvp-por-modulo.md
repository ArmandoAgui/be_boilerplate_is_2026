# Producto mínimo funcional de los diez módulos

> Edición para revisión en el fork, publicada por solicitud posterior del equipo. La arquitectura, estimaciones y asignaciones siguen siendo propuestas. Las referencias a conservación local, ausencia de commits/push y «esta ejecución» describen la etapa de planificación anterior; esta publicación posterior incorpora la documentación sin modificar aplicación ni protecciones.

**Estado:** planificación propuesta, no implementación ni decisiones aprobadas. **Alcance confirmado por el equipo:** diez módulos más adaptación de autenticación; cinco integrantes; cuatro semanas.

## Criterio de selección

El MVP incluye todos los casos oficiales y sus criterios de éxito. Se simplifica presentación y tecnología, no funcionalidad obligatoria. Una propuesta dependiente de D-03/D-06/D-08/D-09/D-12 no se declara aceptada hasta validarla con cátedra. No confundir datos simulados para desarrollar con demostración final de integración.

## M1. Cuotas y pagos de mantenimiento

**Obligatorio RO:** consultar mi estado de cuenta y cuotas pendientes (RF-01-001); pagar mis cuotas pendientes (RF-01-002); consultar unidades morosas y desde cuándo (RF-01-003); generar cuotas mensuales para las unidades sin carga manual individual (RF-01-004).

**Implementación mínima PA:** Tabla de estado de cuenta; flujo de pago con medio aprobado; consulta de mora; generación por periodo mediante ejecución mensual programada sencilla con control idempotente. Una acción manual de respaldo no sustituye la periodicidad solicitada.

**Mejoras opcionales:** Pasarela adicional, conciliación bancaria automática y gráficas avanzadas; no sustituyen el pago obligatorio.

**Demostración verificable:** Generar mes, repetir sin duplicar, pagar una cuota, ver saldo actualizado y mora de otra unidad impaga.

**Límite pendiente:** D-03: mecanismo de pago aprobado; moneda, recargos, pagos parciales y evidencia. Recargos no se añaden por defecto.

## M2. Reservas de áreas comunes

**Obligatorio RO:** consultar áreas disponibles para fecha y hora (RF-02-001); reservar un espacio sin cruces (RF-02-002); definir áreas, capacidad y horarios permitidos (RF-02-003).

**Implementación mínima PA:** Formulario por fecha/hora y lista de disponibilidad; alta de reserva con exclusión en PostgreSQL/transacción y administración simple de áreas/capacidad/horarios.

**Mejoras opcionales:** Calendario visual interactivo y lista de espera.

**Demostración verificable:** Configurar área y horario; reservar; lanzar dos solicitudes simultáneas para el mismo intervalo: solo una se confirma.

**Límite pendiente:** D-04: unidad de reserva, zona horaria, cancelación, duración máxima y reglas de cupo; no inventar sanciones.

## M3. Reportes de incidencias y mantenimiento

**Obligatorio RO:** reportar un problema con fotos y descripción y consultar estado (RF-03-001); priorizar y asignar reportes según urgencia (RF-03-002); recibir seguimiento cuando mi reporte se resuelve (RF-03-003).

**Implementación mínima PA:** Formulario con foto y descripción, listado/detalle con historial, prioridad/asignación por administración y aviso/seguimiento de cierre.

**Mejoras opcionales:** SLA automáticos, mapa y chat.

**Demostración verificable:** Reportar con foto, asignar/priorizar, resolver y comprobar seguimiento y aviso al residente.

**Límite pendiente:** D-05: responsables posibles, estados y evidencia de resolución; política de archivos.

## M4. Control de acceso de visitas

**Obligatorio RO:** preautorizar un visitante antes de que llegue (RF-04-001); registrar entrada y salida de cualquier visitante, autorizado o no (RF-04-002); consultar quién está dentro como visita en el momento (RF-04-003).

**Implementación mínima PA:** Formulario de preautorización, registro de ingreso/egreso y lista de presentes actualizada por consulta/recarga con latencia acordada.

**Mejoras opcionales:** QR, lectores físicos y WebSockets; consultar presentes actualizados es obligatorio.

**Demostración verificable:** Preautorizar una visita, registrar otra no preautorizada, ver ambas dentro y registrar sus salidas.

**Límite pendiente:** D-06: qué significa autorizado o no y facultad de admitir; identidad y retención. No asumir que el sistema debe denegar toda visita no preautorizada.

## M5. Paquetería

**Obligatorio RO:** registrar llegada de paquete para una unidad (RF-05-001); enterarme de un paquete recibido (RF-05-002); ver historial y paquetes no recogidos (RF-05-003); entregar el paquete solo a persona autorizada y dejar evidencia (RF-05-004).

**Implementación mínima PA:** Recepción por seguridad, aviso por bandeja, listado de pendientes/historial y confirmación trazable de entrega autorizada.

**Mejoras opcionales:** Firma dibujada, fotografía de entrega y lector de códigos; verificación de receptor sigue siendo obligatoria.

**Demostración verificable:** Recibir paquete, ver aviso del residente correcto, rechazar retiro indebido, entregar y comprobar historial.

**Límite pendiente:** D-07: prueba de autorización/identidad de retiro, delegados y evidencias.

## M6. Asambleas y votaciones digitales

**Obligatorio RO:** convocar asamblea con agenda de temas a votar (RF-06-001); emitir un voto por unidad en cada tema (RF-06-002); consultar resultado claro y auditable (RF-06-003).

**Implementación mínima PA:** Convocatoria con agenda, formulario de voto, restricción por unidad/tema y resultado agregado con evidencia auditable y control de acceso.

**Mejoras opcionales:** Videoasamblea, delegación compleja y visualizaciones avanzadas; auditoría y voto único no son opcionales.

**Demostración verificable:** Dos residentes de la misma unidad intentan votar a la vez: un voto; otra unidad vota; resultados coinciden y se pueden auditar.

**Límite pendiente:** D-08: representación, elegibilidad, quorum, empate, privacidad del voto y cierre; no inventar ponderaciones.

## M7. Anuncios y comunicados

**Obligatorio RO:** publicar comunicados para todos o torre/sección (RF-07-001); ver comunicados relevantes para mi unidad (RF-07-002).

**Implementación mínima PA:** Publicación dirigida, lista/detalle filtrados y aviso central; registro de publicación y acuse/lectura básico si cátedra lo exige para criterio de éxito.

**Mejoras opcionales:** Editor enriquecido, programación editorial y campañas externas.

**Demostración verificable:** Publicar para torre A y verificar que residente de B no lo ve ni por enlace directo; mostrar evidencia acordada.

**Límite pendiente:** D-09: evidencia exigida de recepción/lectura, edición y audiencia histórica.

## M8. Directorio de residentes

**Obligatorio RO:** decidir si aparezco y qué datos comparto (RF-08-001); buscar contacto de otro vecino respetando sus preferencias (RF-08-002).

**Implementación mínima PA:** Configuración de aparición/campos y búsqueda/lista de contactos filtrados en backend, sin red social adicional.

**Mejoras opcionales:** Favoritos y mensajería directa.

**Demostración verificable:** Ocultar teléfono y luego desactivar aparición; no se expone en lista, búsqueda, detalle ni respuesta API.

**Límite pendiente:** D-10: campos, ámbito y política de visibilidad para residente con varias unidades.

## M9. Notificaciones

**Obligatorio RO:** recibir en un lugar avisos relevantes de cuotas, paquetes y comunicados (RF-09-001); avisar a un residente o grupo mediante lógica compartida (RF-09-002).

**Implementación mínima PA:** Servicio interno único y bandeja persistida por destinatario; conectar paquete recibido, cuota próxima a vencer y comunicado nuevo; seguimiento de incidencia se integra también.

**Mejoras opcionales:** Email, SMS, push y WebSockets; avisos centralizados y productores exigidos son obligatorios.

**Demostración verificable:** Producir un paquete, una cuota por vencer y un comunicado desde sus módulos reales; verlos en una bandeja y negar acceso de otro destinatario.

**Límite pendiente:** D-11: eventos obligatorios, latencia, retención y qué canales; proponer bandeja interna sin exigir email/SMS.

## M10. Reportes financieros y analíticos para administración

**Obligatorio RO:** consultar morosidad, uso de áreas e incidencias abiertas consolidadas (RF-10-001); compartir información con mesa directiva o residentes en asamblea (RF-10-002); consultar participación en votaciones junto a las demás métricas (RF-10-003).

**Implementación mínima PA:** Tablas/indicadores de mora, uso, incidencias abiertas y participación; vista imprimible o exportación sencilla autorizada para mesa/residentes, según aprobación D-12.

**Mejoras opcionales:** BI externo, pronósticos y gráficas interactivas; compartir información no es opcional.

**Demostración verificable:** Crear datos reales en M1/M2/M3/M6, contrastar cuatro métricas con sus fuentes y compartir con audiencia aprobada.

**Límite pendiente:** D-12: fórmulas, periodo, contenido autorizado al compartir y modalidad aceptada de compartir.

## Salvaguardas del alcance

- M1: no presentar carga manual por unidad como generación mensual; no presentar un comprobante subido como pago consumado sin mecanismo aprobado y confirmación real del medio elegido.
- M2: no sustituir exclusión de reservas con un aviso visual; la concurrencia es parte del criterio.
- M3: fotos y seguimiento no son mejoras opcionales.
- M4: cubrir entradas/salidas de visitas autorizadas y no autorizadas; conocer presentes con actualización acordada.
- M5: incluir entrega a receptor correcto, aunque no haya firma digital; es necesaria para el criterio de éxito.
- M6: voto por unidad/tema con varios residentes y resultado auditable; la auditoría debe respetar política de privacidad acordada.
- M7: segmentación y evidencia de comunicación son obligatorias; una fila insertada no demuestra que una persona leyó el aviso.
- M8: privacidad debe mantenerse también en respuestas API y accesos por ID.
- M9: conectar productores reales de cuota por vencer, paquete y comunicado; una bandeja con datos de ejemplo no cumple.
- M10: cubrir compartir resultados y participación, además de mora/uso/incidencias; no dejarlo como dashboard vacío.
