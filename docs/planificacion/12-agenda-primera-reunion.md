# Agenda de primera reunión técnica

> Edición para revisión en el fork, publicada por solicitud posterior del equipo. La arquitectura, estimaciones y asignaciones siguen siendo propuestas. Las referencias a conservación local, ausencia de commits/push y «esta ejecución» describen la etapa de planificación anterior; esta publicación posterior incorpora la documentación sin modificar aplicación ni protecciones.

**Estado:** planificación propuesta, no implementación ni decisiones aprobadas. **Alcance confirmado por el equipo:** diez módulos más adaptación de autenticación; cinco integrantes; cuatro semanas.

## Objetivo

Aprobar un plan de trabajo para los diez módulos y la adaptación de autenticación, validando disponibilidad, responsabilidades, decisiones compartidas y primeras historias. No dedicar la reunión a leer toda la documentación.

**Duración propuesta: 90 minutos.** Asisten Armando, Heber, Guille, Serrato y Yael. Roles de facilitación/registro/tiempo rotativos; propuesta inicial Armando facilita, Yael registra acuerdos, Heber controla tiempo. No implica que ellos decidan por los demás.

## Preparación previa

Cada integrante lee 00-resumen-ejecutivo y 07-distribucion-equipo/08-cronograma; consulta los RF y MVP de sus módulos propuestos. Trae horas disponibles por semana, experiencia, restricciones y objeciones concretas. La guía técnica se usa como referencia, no lectura obligatoria en voz alta.

## Agenda por prioridad

| Minutos | Tema | Decisión/salida |
|---|---|---|
| 0–10 | Alcance diez módulos, diferencias del PDF y disponibilidad | Ratificar alcance interno y preguntas D-01; registrar capacidad real D-14 |
| 10–25 | Viabilidad 392+98 h y reparto híbrido | Ajustar responsables/revisores y carga; aprobar o reestimar calendario |
| 25–40 | Usuario-unidad N:M, rol/condominio y sesión | Aprobar hipótesis para C0/C1, dueño de decisión y plazo de preguntas D-02/13 |
| 40–55 | MVP de alto riesgo | Elegir propuestas a validar: pago/periodicidad, concurrencia, voto, tiempo real, evidencia de anuncios y compartir |
| 55–65 | Contratos de notificación/reportes/archivos y migraciones | Responsables, interfaz mínima y dependencias para trabajar en paralelo |
| 65–75 | Git, revisión, calidad y demo | Aprobar flujo propuesto; identificar permisos/configuraciones que se pedirán después |
| 75–85 | Primera semana y primeras tarjetas | Seleccionar HU-T, HU-09-002 y HU-04-001 según capacidad; asignar ejecución y revisión |
| 85–90 | Confirmar acuerdos, preguntas y próxima revisión | Acta con decisiones, pendientes, responsable/plazo y criterios de salida |

## Propuestas a presentar

Monolito modular sobre stack actual; modelo conceptual compartido con pertenencia N:M; servicio M9 temprano; dos módulos por dueño con apoyo de especialidad; MVP de diez módulos; 41 historias esenciales/29 RF; pruebas por historia y aceptación global; 4 semanas condicionadas a capacidad. Son propuestas discutibles, no decisiones ya aprobadas.

## Decisiones que requieren acuerdo de los cinco

Disponibilidad/compromiso real, distribución y respaldo, arquitectura y contratos comunes, política de permisos/sesión, mecanismo de revisión y responsables de datos, criterios de calidad y demo, preguntas que se llevarán a cátedra. Publicar esta documentación o cambiar protecciones requiere autorización concreta posterior; aprobar el diseño no ejecuta esas operaciones.

## Preguntas para cátedra, ordenadas por impacto

1. ¿Confirma el alcance de diez módulos por este equipo pese al reparto general del PDF, y qué fechas corresponden a nuestra sección? D-01/D-14.
2. ¿Qué mecanismo mínimo satisface pagar y confirmar cuotas? ¿La generación mensual debe correr programada y cómo se demuestra? D-03.
3. ¿Cómo se define representación de unidad, elegibilidad, quorum, empate y auditabilidad/privacidad de votos? D-08.
4. ¿Qué latencia satisface presentes en tiempo real y qué tratamiento corresponde a visitas no autorizadas? D-06.
5. ¿Qué evidencia satisface enterarse del comunicado y entregar un paquete a quien corresponde? D-09/D-07.
6. ¿Qué modalidad mínima de compartir reportes es aceptable y qué métricas/periodos deben demostrarse? D-12.
7. ¿Bandeja interna cubre los avisos o exige canal externo? ¿Qué política de foto/retención y despliegue aplica? D-11/D-05.

No enviar estas preguntas automáticamente a terceros; preparar la consulta y designar a quien la hará.

## Actividades sugeridas después de aprobar

Confirmar disponibilidad y tarjetas; iniciar entorno/URL (HU-T-01), contratos (HU-T-02/07), contexto/autorización (HU-T-03/04), sesión (HU-T-05), fotos/despliegue temprano (HU-T-06/08) y contrato M9. Secuenciar según dependencias, sin asignar simultáneamente todo a una persona. Preparar preautorización de visita como primer recorrido, no saltarse permisos. La presente ejecución termina en documentación, no inicia esas actividades de desarrollo.

## Acta mínima al terminar

Fecha/asistentes; decisiones D aprobadas o pendientes con motivo; horas disponibles por persona/semana; dueños/revisores y apoyos; HU de primera semana y aceptación; contratos/migraciones con dueño; preguntas y responsable/plazo; siguiente revisión y plan ante bloqueo. Un pendiente debe quedar explícito, no registrado como aprobado por falta de objeción.
