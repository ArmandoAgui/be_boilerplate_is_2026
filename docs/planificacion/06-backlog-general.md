# Backlog integral: épicas, historias y tareas

> Edición para revisión en el fork, publicada por solicitud posterior del equipo. La arquitectura, estimaciones y asignaciones siguen siendo propuestas. Las referencias a conservación local, ausencia de commits/push y «esta ejecución» describen la etapa de planificación anterior; esta publicación posterior incorpora la documentación sin modificar aplicación ni protecciones.

**Estado:** planificación propuesta, no implementación ni decisiones aprobadas. **Alcance confirmado por el equipo:** diez módulos más adaptación de autenticación; cinco integrantes; cuatro semanas.

## Convenciones y estimación

Jerarquía: **EP-T (transversal), EP-01..EP-10 (módulos), EP-E (entrega) → HU → tareas BD/BE/FE/INT/QA/DOC**. HU es historia; RF/CA/PR enlazan requerimiento/aceptación/prueba. Todas las historias están en estado **propuesta/no iniciada**.

P0 = bloqueante compartido; P1 = esencial obligatorio; P2 = mejora opcional. P1 no permite eliminar funcionalidad por llegar tarde. Las dependencias indican disponibilidad de contrato/operación; los productores se integran antes de aceptar la historia. Las horas son **horas-persona orientativas**, incluyen sus tareas y pruebas de historia, no se suman de nuevo por cada sub-tarea; esfuerzo no equivale a duración calendario. Rango de planificación sugerido: 0,75–1,5 veces la cifra base, a calibrar con disponibilidad/primer flujo.

**Total base: 392 h = transversales 92 + dominio 250 + cierre 50. Reserva de riesgo del 25%: 98.0 h. Compromiso de referencia a validar: 490.0 h efectivas.** Pruebas de aceptación globales/regresión del cierre son adicionales a las pruebas locales de cada historia, no la repetición contable del mismo trabajo. La reserva no autoriza nuevas mejoras.

## EP-T. Base compartida y adaptación de autenticación

### HU-T-01: Entorno y URL compatibles

**Historia:** como Todos, necesito entorno y url compatibles para habilitar la plataforma completa. **Actor:** Todos. **Módulo:** transversal C0. **Prioridad:** P0. **Dependencias:** Ninguna. **Semana:** 1. **Estimación:** 8 h. **Principal propuesto:** Heber, con revisión cruzada.

**Aceptación:** Compose de cátedra y Next levantan con puertos distintos y URL /api/v1; secretos fuera de Git. **Riesgo:** Herramientas no disponibles. **Evidencia:** decisión revisada y, cuando se implemente, resultado reproducible en entorno de desarrollo/demo; nunca credenciales.

**Tareas:** HU-T-01-BD: impacto/contrato de datos (sin migración ahora); HU-T-01-BE: adaptar responsabilidades de API requeridas; HU-T-01-FE: adaptar consumidor y estados si aplica; HU-T-01-INT: comprobar dependencia de extremo a extremo; HU-T-01-QA: contrastar aceptación y caso negativo; HU-T-01-DOC: decisión, configuración no sensible y pasos de reproducción. Las tareas sin cambio necesario deben justificarse como no aplicables, no inventar código.

### HU-T-02: Decisiones de alcance y contratos compartidos

**Historia:** como Todos, necesito decisiones de alcance y contratos compartidos para habilitar la plataforma completa. **Actor:** Todos. **Módulo:** transversal C2. **Prioridad:** P0. **Dependencias:** Ninguna. **Semana:** 1. **Estimación:** 8 h. **Principal propuesto:** Armando, con revisión cruzada.

**Aceptación:** Diez módulos, matriz de permisos, contratos y preguntas D-01..D-14 registrados con responsables. **Riesgo:** Respuestas de cátedra tardías. **Evidencia:** decisión revisada y, cuando se implemente, resultado reproducible en entorno de desarrollo/demo; nunca credenciales.

**Tareas:** HU-T-02-BD: impacto/contrato de datos (sin migración ahora); HU-T-02-BE: adaptar responsabilidades de API requeridas; HU-T-02-FE: adaptar consumidor y estados si aplica; HU-T-02-INT: comprobar dependencia de extremo a extremo; HU-T-02-QA: contrastar aceptación y caso negativo; HU-T-02-DOC: decisión, configuración no sensible y pasos de reproducción. Las tareas sin cambio necesario deben justificarse como no aplicables, no inventar código.

### HU-T-03: Condominios, torres, unidades y pertenencia N:M

**Historia:** como Administrador, necesito condominios, torres, unidades y pertenencia n:m para habilitar la plataforma completa. **Actor:** Administrador. **Módulo:** transversal C0. **Prioridad:** P0. **Dependencias:** HU-T-02. **Semana:** 1. **Estimación:** 20 h. **Principal propuesto:** Guille, con revisión cruzada.

**Aceptación:** Un usuario en varias unidades y varios usuarios en una unidad se representan y consultan según permisos; cambios básicos de pertenencia auditables. **Riesgo:** Cardinalidades y altas por aprobar. **Evidencia:** decisión revisada y, cuando se implemente, resultado reproducible en entorno de desarrollo/demo; nunca credenciales.

**Tareas:** HU-T-03-BD: impacto/contrato de datos (sin migración ahora); HU-T-03-BE: adaptar responsabilidades de API requeridas; HU-T-03-FE: adaptar consumidor y estados si aplica; HU-T-03-INT: comprobar dependencia de extremo a extremo; HU-T-03-QA: contrastar aceptación y caso negativo; HU-T-03-DOC: decisión, configuración no sensible y pasos de reproducción. Las tareas sin cambio necesario deben justificarse como no aplicables, no inventar código.

### HU-T-04: Autorización por rol y recurso del condominio

**Historia:** como Todos, necesito autorización por rol y recurso del condominio para habilitar la plataforma completa. **Actor:** Todos. **Módulo:** transversal C1. **Prioridad:** P0. **Dependencias:** HU-T-03. **Semana:** 1. **Estimación:** 12 h. **Principal propuesto:** Yael, con revisión cruzada.

**Aceptación:** Residente no consulta unidad ajena y seguridad no ejecuta finanzas/votaciones administrativas; permiso validado en API. **Riesgo:** Confiar en datos del cliente. **Evidencia:** decisión revisada y, cuando se implemente, resultado reproducible en entorno de desarrollo/demo; nunca credenciales.

**Tareas:** HU-T-04-BD: impacto/contrato de datos (sin migración ahora); HU-T-04-BE: adaptar responsabilidades de API requeridas; HU-T-04-FE: adaptar consumidor y estados si aplica; HU-T-04-INT: comprobar dependencia de extremo a extremo; HU-T-04-QA: contrastar aceptación y caso negativo; HU-T-04-DOC: decisión, configuración no sensible y pasos de reproducción. Las tareas sin cambio necesario deben justificarse como no aplicables, no inventar código.

### HU-T-05: Sesión completa Next y rotación revisada

**Historia:** como Todos, necesito sesión completa next y rotación revisada para habilitar la plataforma completa. **Actor:** Todos. **Módulo:** transversal C1. **Prioridad:** P0. **Dependencias:** HU-T-01. **Semana:** 1. **Estimación:** 18 h. **Principal propuesto:** Serrato, con revisión cruzada.

**Aceptación:** Login/me/expiración/renovación/logout completos y pruebas concurrentes de refresh; cookie presente no basta. **Riesgo:** Carrera de renovación y expiración. **Evidencia:** decisión revisada y, cuando se implemente, resultado reproducible en entorno de desarrollo/demo; nunca credenciales.

**Tareas:** HU-T-05-BD: impacto/contrato de datos (sin migración ahora); HU-T-05-BE: adaptar responsabilidades de API requeridas; HU-T-05-FE: adaptar consumidor y estados si aplica; HU-T-05-INT: comprobar dependencia de extremo a extremo; HU-T-05-QA: contrastar aceptación y caso negativo; HU-T-05-DOC: decisión, configuración no sensible y pasos de reproducción. Las tareas sin cambio necesario deben justificarse como no aplicables, no inventar código.

### HU-T-06: Archivos y evidencia autorizada

**Historia:** como Residente/Administrador, necesito archivos y evidencia autorizada para habilitar la plataforma completa. **Actor:** Residente/Administrador. **Módulo:** transversal C3. **Prioridad:** P0. **Dependencias:** HU-T-03, HU-T-04. **Semana:** 1. **Estimación:** 10 h. **Principal propuesto:** Serrato, con revisión cruzada.

**Aceptación:** Carga de foto persistida con límites y consulta autorizada; fallos no publican archivos huérfanos. **Riesgo:** Almacenamiento de despliegue. **Evidencia:** decisión revisada y, cuando se implemente, resultado reproducible en entorno de desarrollo/demo; nunca credenciales.

**Tareas:** HU-T-06-BD: impacto/contrato de datos (sin migración ahora); HU-T-06-BE: adaptar responsabilidades de API requeridas; HU-T-06-FE: adaptar consumidor y estados si aplica; HU-T-06-INT: comprobar dependencia de extremo a extremo; HU-T-06-QA: contrastar aceptación y caso negativo; HU-T-06-DOC: decisión, configuración no sensible y pasos de reproducción. Las tareas sin cambio necesario deben justificarse como no aplicables, no inventar código.

### HU-T-07: Contratos, reglas de persistencia y calidad compartidos

**Historia:** como Todos, necesito contratos, reglas de persistencia y calidad compartidos para habilitar la plataforma completa. **Actor:** Todos. **Módulo:** transversal C2. **Prioridad:** P0. **Dependencias:** HU-T-02. **Semana:** 1. **Estimación:** 8 h. **Principal propuesto:** Heber, con revisión cruzada.

**Aceptación:** Convención API/errores, propiedad de migraciones y propuesta de checks documentadas; contratos de productores M1/2/3/6/9 acordados. **Riesgo:** Integración tardía. **Evidencia:** decisión revisada y, cuando se implemente, resultado reproducible en entorno de desarrollo/demo; nunca credenciales.

**Tareas:** HU-T-07-BD: impacto/contrato de datos (sin migración ahora); HU-T-07-BE: adaptar responsabilidades de API requeridas; HU-T-07-FE: adaptar consumidor y estados si aplica; HU-T-07-INT: comprobar dependencia de extremo a extremo; HU-T-07-QA: contrastar aceptación y caso negativo; HU-T-07-DOC: decisión, configuración no sensible y pasos de reproducción. Las tareas sin cambio necesario deben justificarse como no aplicables, no inventar código.

### HU-T-08: Entorno demo inicial y ruta de actualización

**Historia:** como Todos, necesito entorno demo inicial y ruta de actualización para habilitar la plataforma completa. **Actor:** Todos. **Módulo:** transversal C4. **Prioridad:** P0. **Dependencias:** HU-T-01. **Semana:** 1. **Estimación:** 8 h. **Principal propuesto:** Yael, con revisión cruzada.

**Aceptación:** Primer despliegue verificable de base y plan de variables/HTTPS/migración coordinada; sin seed sensible público. **Riesgo:** Plataforma de hosting por decidir. **Evidencia:** decisión revisada y, cuando se implemente, resultado reproducible en entorno de desarrollo/demo; nunca credenciales.

**Tareas:** HU-T-08-BD: impacto/contrato de datos (sin migración ahora); HU-T-08-BE: adaptar responsabilidades de API requeridas; HU-T-08-FE: adaptar consumidor y estados si aplica; HU-T-08-INT: comprobar dependencia de extremo a extremo; HU-T-08-QA: contrastar aceptación y caso negativo; HU-T-08-DOC: decisión, configuración no sensible y pasos de reproducción. Las tareas sin cambio necesario deben justificarse como no aplicables, no inventar código.

## EP-01. Cuotas y pagos de mantenimiento — 42 h

Principal propuesto: Armando; revisor: Guille. No equivale a propietario exclusivo de integración o QA.

### HU-01-001: Consultar mi estado de cuenta y cuotas pendientes

**Historia:** como Residente, quiero consultar mi estado de cuenta y cuotas pendientes para cobrar cuotas periódicas y permitir conocer deudas, pagos y antigüedad de mora. **Actor:** Residente. **Módulo:** M1. **Prioridad:** P1 esencial. **RF:** RF-01-001. **Fuente:** CU-01-01. **Semana objetivo:** 2. **Estimación base:** 6 h.

**Dependencias:** B: C0 identidad/unidades, C1 autorización y C2 contratos; P: M9 para avisos; I: M10 consume saldos. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-01-001: cargos, pagos confirmados y saldo de sus unidades coinciden y no aparecen unidades ajenas. **Alternativas:** Unidad sin cargos: lista vacía/saldo cero; pertenencia revocada: rechazar.

**Riesgos:** Doble contabilización, carreras de cobro y acceso a otra unidad; el mecanismo real de pago puede aumentar esfuerzo. **Decisión pendiente:** D-03: mecanismo de pago aprobado; moneda, recargos, pagos parciales y evidencia. Recargos no se añaden por defecto.

**Evidencia esperada:** PR-01-001 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-01-001; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-01-001-BD:** diseñar/revisar persistencia y restricciones de Cuota, periodo, unidad, importe/moneda, vencimiento, pago, aplicación e historial. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-01-001-BE:** DTOs y caso de uso para consultar mi estado de cuenta y cuotas pendientes; aplicar Importes decimales positivos, periodo/vencimiento válidos, unidad de pertenencia, referencias y transiciones admitidas. y la regla relevante: Saldo derivado de cargos menos pagos confirmados; no confirmar por un estado de UI. Generación mensual repetida no duplica cargos. Preservar actor, fecha y evidencia de cada movimiento.
- **HU-01-001-FE:** formulario/lista/detalle necesario para el actor Residente, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-01-001-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0 identidad/unidades, C1 autorización y C2 contratos; P: M9 para avisos; I: M10 consume saldos.); rechazar IDs/ámbitos indebidos.
- **HU-01-001-QA:** ejecutar PR-01-001 y casos negativos: Unidad sin cargos: lista vacía/saldo cero; pertenencia revocada: rechazar; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-01-001-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-01-001 y evidencia de prueba en PR internos.

### HU-01-002: Pagar mis cuotas pendientes

**Historia:** como Residente, quiero pagar mis cuotas pendientes para cobrar cuotas periódicas y permitir conocer deudas, pagos y antigüedad de mora. **Actor:** Residente. **Módulo:** M1. **Prioridad:** P1 esencial. **RF:** RF-01-002. **Fuente:** CU-01-01. **Semana objetivo:** 3. **Estimación base:** 18 h.

**Dependencias:** B: C0 identidad/unidades, C1 autorización y C2 contratos; P: M9 para avisos; I: M10 consume saldos. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-01-002: el medio aprobado permite completar pago y solo su confirmación válida modifica saldo una vez. **Alternativas:** Reintento, medio fallido o importe inválido: sin doble cargo ni saldo falso.

**Riesgos:** Doble contabilización, carreras de cobro y acceso a otra unidad; el mecanismo real de pago puede aumentar esfuerzo. **Decisión pendiente:** D-03: mecanismo de pago aprobado; moneda, recargos, pagos parciales y evidencia. Recargos no se añaden por defecto.

**Evidencia esperada:** PR-01-002 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-01-002; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-01-002-BD:** diseñar/revisar persistencia y restricciones de Cuota, periodo, unidad, importe/moneda, vencimiento, pago, aplicación e historial. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-01-002-BE:** DTOs y caso de uso para pagar mis cuotas pendientes; aplicar Importes decimales positivos, periodo/vencimiento válidos, unidad de pertenencia, referencias y transiciones admitidas. y la regla relevante: Saldo derivado de cargos menos pagos confirmados; no confirmar por un estado de UI. Generación mensual repetida no duplica cargos. Preservar actor, fecha y evidencia de cada movimiento.
- **HU-01-002-FE:** formulario/lista/detalle necesario para el actor Residente, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-01-002-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0 identidad/unidades, C1 autorización y C2 contratos; P: M9 para avisos; I: M10 consume saldos.); rechazar IDs/ámbitos indebidos.
- **HU-01-002-QA:** ejecutar PR-01-002 y casos negativos: Reintento, medio fallido o importe inválido: sin doble cargo ni saldo falso; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-01-002-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-01-002 y evidencia de prueba en PR internos.

### HU-01-003: Consultar unidades morosas y desde cuándo

**Historia:** como Administrador, quiero consultar unidades morosas y desde cuándo para cobrar cuotas periódicas y permitir conocer deudas, pagos y antigüedad de mora. **Actor:** Administrador. **Módulo:** M1. **Prioridad:** P1 esencial. **RF:** RF-01-003. **Fuente:** CU-01-02. **Semana objetivo:** 2. **Estimación base:** 6 h.

**Dependencias:** B: C0 identidad/unidades, C1 autorización y C2 contratos; P: M9 para avisos; I: M10 consume saldos. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-01-003: listado identifica saldo vencido y antigüedad usando vencimiento y pagos confirmados. **Alternativas:** Sin mora: lista vacía; residente sin permiso no accede al listado global.

**Riesgos:** Doble contabilización, carreras de cobro y acceso a otra unidad; el mecanismo real de pago puede aumentar esfuerzo. **Decisión pendiente:** D-03: mecanismo de pago aprobado; moneda, recargos, pagos parciales y evidencia. Recargos no se añaden por defecto.

**Evidencia esperada:** PR-01-003 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-01-003; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-01-003-BD:** diseñar/revisar persistencia y restricciones de Cuota, periodo, unidad, importe/moneda, vencimiento, pago, aplicación e historial. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-01-003-BE:** DTOs y caso de uso para consultar unidades morosas y desde cuándo; aplicar Importes decimales positivos, periodo/vencimiento válidos, unidad de pertenencia, referencias y transiciones admitidas. y la regla relevante: Saldo derivado de cargos menos pagos confirmados; no confirmar por un estado de UI. Generación mensual repetida no duplica cargos. Preservar actor, fecha y evidencia de cada movimiento.
- **HU-01-003-FE:** formulario/lista/detalle necesario para el actor Administrador, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-01-003-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0 identidad/unidades, C1 autorización y C2 contratos; P: M9 para avisos; I: M10 consume saldos.); rechazar IDs/ámbitos indebidos.
- **HU-01-003-QA:** ejecutar PR-01-003 y casos negativos: Sin mora: lista vacía; residente sin permiso no accede al listado global; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-01-003-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-01-003 y evidencia de prueba en PR internos.

### HU-01-004: Generar cuotas mensuales para las unidades sin carga manual individual

**Historia:** como Administrador, quiero generar cuotas mensuales para las unidades sin carga manual individual para cobrar cuotas periódicas y permitir conocer deudas, pagos y antigüedad de mora. **Actor:** Administrador. **Módulo:** M1. **Prioridad:** P1 esencial. **RF:** RF-01-004. **Fuente:** CU-01-03. **Semana objetivo:** 3. **Estimación base:** 12 h.

**Dependencias:** B: C0 identidad/unidades, C1 autorización y C2 contratos; P: M9 para avisos; I: M10 consume saldos. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-01-004: al llegar el periodo se generan cuotas correspondientes, una por regla aprobada/unidad/periodo; repetir ejecución no duplica. **Alternativas:** Fallo parcial: reintento recupera faltantes sin duplicar ni ocultar error.

**Riesgos:** Doble contabilización, carreras de cobro y acceso a otra unidad; el mecanismo real de pago puede aumentar esfuerzo. **Decisión pendiente:** D-03: mecanismo de pago aprobado; moneda, recargos, pagos parciales y evidencia. Recargos no se añaden por defecto.

**Evidencia esperada:** PR-01-004 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-01-004; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-01-004-BD:** diseñar/revisar persistencia y restricciones de Cuota, periodo, unidad, importe/moneda, vencimiento, pago, aplicación e historial. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-01-004-BE:** DTOs y caso de uso para generar cuotas mensuales para las unidades sin carga manual individual; aplicar Importes decimales positivos, periodo/vencimiento válidos, unidad de pertenencia, referencias y transiciones admitidas. y la regla relevante: Saldo derivado de cargos menos pagos confirmados; no confirmar por un estado de UI. Generación mensual repetida no duplica cargos. Preservar actor, fecha y evidencia de cada movimiento.
- **HU-01-004-FE:** formulario/lista/detalle necesario para el actor Administrador, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-01-004-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0 identidad/unidades, C1 autorización y C2 contratos; P: M9 para avisos; I: M10 consume saldos.); rechazar IDs/ámbitos indebidos.
- **HU-01-004-QA:** ejecutar PR-01-004 y casos negativos: Fallo parcial: reintento recupera faltantes sin duplicar ni ocultar error; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-01-004-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-01-004 y evidencia de prueba en PR internos.

## EP-02. Reservas de áreas comunes — 28 h

Principal propuesto: Heber; revisor: Serrato. No equivale a propietario exclusivo de integración o QA.

### HU-02-001: Consultar áreas disponibles para fecha y hora

**Historia:** como Residente, quiero consultar áreas disponibles para fecha y hora para evitar choques y sobrecupo al reservar espacios compartidos. **Actor:** Residente. **Módulo:** M2. **Prioridad:** P1 esencial. **RF:** RF-02-001. **Fuente:** CU-02-01. **Semana objetivo:** 2. **Estimación base:** 6 h.

**Dependencias:** B: C0/C1/C2 y catálogo de áreas de RF-02-003; O: avisos M9; I: uso de M2 hacia M10. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-02-001: disponibilidad respeta reservas confirmadas, horarios y capacidad. **Alternativas:** Fuera de horario o sin áreas: no ofrecer una disponibilidad falsa.

**Riesgos:** Dos lecturas de disponible seguidas de insert pueden producir doble reserva. **Decisión pendiente:** D-04: unidad de reserva, zona horaria, cancelación, duración máxima y reglas de cupo; no inventar sanciones.

**Evidencia esperada:** PR-02-001 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-02-001; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-02-001-BD:** diseñar/revisar persistencia y restricciones de Área, capacidad, calendario/horario, reserva, intervalo, unidad y actor. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-02-001-BE:** DTOs y caso de uso para consultar áreas disponibles para fecha y hora; aplicar Inicio menor a fin, zona horaria acordada, área activa, asistentes dentro de capacidad y pertenencia vigente. y la regla relevante: Disponibilidad es informativa; al guardar se garantiza exclusión transaccional. Capacidad y ventanas autorizadas se validan en API. Propuesta D-04: intervalos semiabiertos [inicio, fin), por aprobar.
- **HU-02-001-FE:** formulario/lista/detalle necesario para el actor Residente, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-02-001-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0/C1/C2 y catálogo de áreas de RF-02-003; O: avisos M9; I: uso de M2 hacia M10.); rechazar IDs/ámbitos indebidos.
- **HU-02-001-QA:** ejecutar PR-02-001 y casos negativos: Fuera de horario o sin áreas: no ofrecer una disponibilidad falsa; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-02-001-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-02-001 y evidencia de prueba en PR internos.

### HU-02-002: Reservar un espacio sin cruces

**Historia:** como Residente, quiero reservar un espacio sin cruces para evitar choques y sobrecupo al reservar espacios compartidos. **Actor:** Residente. **Módulo:** M2. **Prioridad:** P1 esencial. **RF:** RF-02-002. **Fuente:** CU-02-02. **Semana objetivo:** 3. **Estimación base:** 14 h.

**Dependencias:** B: C0/C1/C2 y catálogo de áreas de RF-02-003; O: avisos M9; I: uso de M2 hacia M10. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-02-002: solicitudes concurrentes incompatibles dejan una sola reserva; la rechazada explica conflicto. **Alternativas:** Área cerrada entre consulta y envío: rechazar y actualizar disponibilidad.

**Riesgos:** Dos lecturas de disponible seguidas de insert pueden producir doble reserva. **Decisión pendiente:** D-04: unidad de reserva, zona horaria, cancelación, duración máxima y reglas de cupo; no inventar sanciones.

**Evidencia esperada:** PR-02-002 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-02-002; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-02-002-BD:** diseñar/revisar persistencia y restricciones de Área, capacidad, calendario/horario, reserva, intervalo, unidad y actor. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-02-002-BE:** DTOs y caso de uso para reservar un espacio sin cruces; aplicar Inicio menor a fin, zona horaria acordada, área activa, asistentes dentro de capacidad y pertenencia vigente. y la regla relevante: Disponibilidad es informativa; al guardar se garantiza exclusión transaccional. Capacidad y ventanas autorizadas se validan en API. Propuesta D-04: intervalos semiabiertos [inicio, fin), por aprobar.
- **HU-02-002-FE:** formulario/lista/detalle necesario para el actor Residente, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-02-002-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0/C1/C2 y catálogo de áreas de RF-02-003; O: avisos M9; I: uso de M2 hacia M10.); rechazar IDs/ámbitos indebidos.
- **HU-02-002-QA:** ejecutar PR-02-002 y casos negativos: Área cerrada entre consulta y envío: rechazar y actualizar disponibilidad; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-02-002-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-02-002 y evidencia de prueba en PR internos.

### HU-02-003: Definir áreas, capacidad y horarios permitidos

**Historia:** como Administrador, quiero definir áreas, capacidad y horarios permitidos para evitar choques y sobrecupo al reservar espacios compartidos. **Actor:** Administrador. **Módulo:** M2. **Prioridad:** P1 esencial. **RF:** RF-02-003. **Fuente:** CU-02-03. **Semana objetivo:** 2. **Estimación base:** 8 h.

**Dependencias:** B: C0/C1/C2 y catálogo de áreas de RF-02-003; O: avisos M9; I: uso de M2 hacia M10. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-02-003: configuración persistida gobierna consultas y nuevas reservas; solo administrador autorizado la cambia. **Alternativas:** Capacidad no positiva o horario invertido: rechazar; reservas existentes requieren política explícita.

**Riesgos:** Dos lecturas de disponible seguidas de insert pueden producir doble reserva. **Decisión pendiente:** D-04: unidad de reserva, zona horaria, cancelación, duración máxima y reglas de cupo; no inventar sanciones.

**Evidencia esperada:** PR-02-003 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-02-003; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-02-003-BD:** diseñar/revisar persistencia y restricciones de Área, capacidad, calendario/horario, reserva, intervalo, unidad y actor. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-02-003-BE:** DTOs y caso de uso para definir áreas, capacidad y horarios permitidos; aplicar Inicio menor a fin, zona horaria acordada, área activa, asistentes dentro de capacidad y pertenencia vigente. y la regla relevante: Disponibilidad es informativa; al guardar se garantiza exclusión transaccional. Capacidad y ventanas autorizadas se validan en API. Propuesta D-04: intervalos semiabiertos [inicio, fin), por aprobar.
- **HU-02-003-FE:** formulario/lista/detalle necesario para el actor Administrador, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-02-003-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0/C1/C2 y catálogo de áreas de RF-02-003; O: avisos M9; I: uso de M2 hacia M10.); rechazar IDs/ámbitos indebidos.
- **HU-02-003-QA:** ejecutar PR-02-003 y casos negativos: Capacidad no positiva o horario invertido: rechazar; reservas existentes requieren política explícita; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-02-003-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-02-003 y evidencia de prueba en PR internos.

## EP-03. Reportes de incidencias y mantenimiento — 28 h

Principal propuesto: Serrato; revisor: Yael. No equivale a propietario exclusivo de integración o QA.

### HU-03-001: Reportar un problema con fotos y descripción y consultar estado

**Historia:** como Residente, quiero reportar un problema con fotos y descripción y consultar estado para registrar problemas con evidencia y dar seguimiento visible hasta su resolución. **Actor:** Residente. **Módulo:** M3. **Prioridad:** P1 esencial. **RF:** RF-03-001. **Fuente:** CU-03-01. **Semana objetivo:** 2. **Estimación base:** 12 h.

**Dependencias:** B: C0/C1/C2; P: C3 archivos y M9; I: M10 consume estados. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-03-001: reporte, evidencia y estado inicial persisten y se consultan solo con permiso. **Alternativas:** Carga inválida o interrumpida: error recuperable, sin evidencia huérfana publicada.

**Riesgos:** Adjuntos perdidos/expuestos o cambio de estado sin historial. **Decisión pendiente:** D-05: responsables posibles, estados y evidencia de resolución; política de archivos.

**Evidencia esperada:** PR-03-001 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-03-001; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-03-001-BD:** diseñar/revisar persistencia y restricciones de Incidencia, descripción, evidencia/foto, prioridad, asignación, seguimiento y actor. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-03-001-BE:** DTOs y caso de uso para reportar un problema con fotos y descripción y consultar estado; aplicar Descripción no vacía, evidencia accesible y de tipo/tamaño aprobado, asignado válido y transición admitida. y la regla relevante: Guardar autor y cambios de estado; permitir consulta al actor autorizado; no marcar resuelto por simple envío del formulario. Propuesta: estados reportada/en atención/resuelta, a aprobar.
- **HU-03-001-FE:** formulario/lista/detalle necesario para el actor Residente, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-03-001-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0/C1/C2; P: C3 archivos y M9; I: M10 consume estados.); rechazar IDs/ámbitos indebidos.
- **HU-03-001-QA:** ejecutar PR-03-001 y casos negativos: Carga inválida o interrumpida: error recuperable, sin evidencia huérfana publicada; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-03-001-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-03-001 y evidencia de prueba en PR internos.

### HU-03-002: Priorizar y asignar reportes según urgencia

**Historia:** como Administrador, quiero priorizar y asignar reportes según urgencia para registrar problemas con evidencia y dar seguimiento visible hasta su resolución. **Actor:** Administrador. **Módulo:** M3. **Prioridad:** P1 esencial. **RF:** RF-03-002. **Fuente:** CU-03-02. **Semana objetivo:** 3. **Estimación base:** 10 h.

**Dependencias:** B: C0/C1/C2; P: C3 archivos y M9; I: M10 consume estados. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-03-002: prioridad/asignado cambian con actor y fecha visibles y controles de permiso. **Alternativas:** Asignado fuera del ámbito o transición inválida: rechazar sin perder historial.

**Riesgos:** Adjuntos perdidos/expuestos o cambio de estado sin historial. **Decisión pendiente:** D-05: responsables posibles, estados y evidencia de resolución; política de archivos.

**Evidencia esperada:** PR-03-002 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-03-002; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-03-002-BD:** diseñar/revisar persistencia y restricciones de Incidencia, descripción, evidencia/foto, prioridad, asignación, seguimiento y actor. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-03-002-BE:** DTOs y caso de uso para priorizar y asignar reportes según urgencia; aplicar Descripción no vacía, evidencia accesible y de tipo/tamaño aprobado, asignado válido y transición admitida. y la regla relevante: Guardar autor y cambios de estado; permitir consulta al actor autorizado; no marcar resuelto por simple envío del formulario. Propuesta: estados reportada/en atención/resuelta, a aprobar.
- **HU-03-002-FE:** formulario/lista/detalle necesario para el actor Administrador, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-03-002-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0/C1/C2; P: C3 archivos y M9; I: M10 consume estados.); rechazar IDs/ámbitos indebidos.
- **HU-03-002-QA:** ejecutar PR-03-002 y casos negativos: Asignado fuera del ámbito o transición inválida: rechazar sin perder historial; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-03-002-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-03-002 y evidencia de prueba en PR internos.

### HU-03-003: Recibir seguimiento cuando mi reporte se resuelve

**Historia:** como Residente, quiero recibir seguimiento cuando mi reporte se resuelve para registrar problemas con evidencia y dar seguimiento visible hasta su resolución. **Actor:** Residente. **Módulo:** M3. **Prioridad:** P1 esencial. **RF:** RF-03-003. **Fuente:** CU-03-03. **Semana objetivo:** 3. **Estimación base:** 6 h.

**Dependencias:** B: C0/C1/C2; P: C3 archivos y M9; I: M10 consume estados. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-03-003: cierre queda en historial y el residente recibe/consulta seguimiento de resolución. **Alternativas:** Repetir cierre: no duplicar aviso; receptor ajeno no obtiene información.

**Riesgos:** Adjuntos perdidos/expuestos o cambio de estado sin historial. **Decisión pendiente:** D-05: responsables posibles, estados y evidencia de resolución; política de archivos.

**Evidencia esperada:** PR-03-003 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-03-003; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-03-003-BD:** diseñar/revisar persistencia y restricciones de Incidencia, descripción, evidencia/foto, prioridad, asignación, seguimiento y actor. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-03-003-BE:** DTOs y caso de uso para recibir seguimiento cuando mi reporte se resuelve; aplicar Descripción no vacía, evidencia accesible y de tipo/tamaño aprobado, asignado válido y transición admitida. y la regla relevante: Guardar autor y cambios de estado; permitir consulta al actor autorizado; no marcar resuelto por simple envío del formulario. Propuesta: estados reportada/en atención/resuelta, a aprobar.
- **HU-03-003-FE:** formulario/lista/detalle necesario para el actor Residente, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-03-003-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0/C1/C2; P: C3 archivos y M9; I: M10 consume estados.); rechazar IDs/ámbitos indebidos.
- **HU-03-003-QA:** ejecutar PR-03-003 y casos negativos: Repetir cierre: no duplicar aviso; receptor ajeno no obtiene información; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-03-003-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-03-003 y evidencia de prueba en PR internos.

## EP-04. Control de acceso de visitas — 24 h

Principal propuesto: Yael; revisor: Armando. No equivale a propietario exclusivo de integración o QA.

### HU-04-001: Preautorizar un visitante antes de que llegue

**Historia:** como Residente, quiero preautorizar un visitante antes de que llegue para preautorizar visitas y registrar entradas/salidas con conocimiento de presentes. **Actor:** Residente. **Módulo:** M4. **Prioridad:** P1 esencial. **RF:** RF-04-001. **Fuente:** CU-04-01. **Semana objetivo:** 1. **Estimación base:** 6 h.

**Dependencias:** B: C0/C1/C2; O: M9; sin dependencia obligatoria de paquetería. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-04-001: preautorización queda vinculada a su unidad y consultable por seguridad del ámbito. **Alternativas:** Fecha/datos inválidos o unidad ajena: rechazar.

**Riesgos:** Salida sin entrada, duplicados y exposición de datos de visitantes. **Decisión pendiente:** D-06: qué significa autorizado o no y facultad de admitir; identidad y retención. No asumir que el sistema debe denegar toda visita no preautorizada.

**Evidencia esperada:** PR-04-001 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-04-001; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-04-001-BD:** diseñar/revisar persistencia y restricciones de Visita prevista, visitante mínimo, unidad anfitriona, autorización y movimientos de acceso. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-04-001-BE:** DTOs y caso de uso para preautorizar un visitante antes de que llegue; aplicar Identificación mínima/propósito, unidad válida, orden temporal y actor seguridad; datos personales mínimos acordados. y la regla relevante: Seguridad registra entrada y salida de visitas autorizadas o no. No crear dos estancias abiertas por repetición. La consulta de presentes deriva entradas sin salida.
- **HU-04-001-FE:** formulario/lista/detalle necesario para el actor Residente, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-04-001-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0/C1/C2; O: M9; sin dependencia obligatoria de paquetería.); rechazar IDs/ámbitos indebidos.
- **HU-04-001-QA:** ejecutar PR-04-001 y casos negativos: Fecha/datos inválidos o unidad ajena: rechazar; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-04-001-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-04-001 y evidencia de prueba en PR internos.

### HU-04-002: Registrar entrada y salida de cualquier visitante, autorizado o no

**Historia:** como Personal de seguridad, quiero registrar entrada y salida de cualquier visitante, autorizado o no para preautorizar visitas y registrar entradas/salidas con conocimiento de presentes. **Actor:** Personal de seguridad. **Módulo:** M4. **Prioridad:** P1 esencial. **RF:** RF-04-002. **Fuente:** CU-04-02. **Semana objetivo:** 2. **Estimación base:** 12 h.

**Dependencias:** B: C0/C1/C2; O: M9; sin dependencia obligatoria de paquetería. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-04-002: ambos tipos se registran con motivo, actor y tiempos; salida cierra estancia correcta. **Alternativas:** Doble envío no abre dos estancias; salida sin entrada es tratada por política explícita.

**Riesgos:** Salida sin entrada, duplicados y exposición de datos de visitantes. **Decisión pendiente:** D-06: qué significa autorizado o no y facultad de admitir; identidad y retención. No asumir que el sistema debe denegar toda visita no preautorizada.

**Evidencia esperada:** PR-04-002 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-04-002; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-04-002-BD:** diseñar/revisar persistencia y restricciones de Visita prevista, visitante mínimo, unidad anfitriona, autorización y movimientos de acceso. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-04-002-BE:** DTOs y caso de uso para registrar entrada y salida de cualquier visitante, autorizado o no; aplicar Identificación mínima/propósito, unidad válida, orden temporal y actor seguridad; datos personales mínimos acordados. y la regla relevante: Seguridad registra entrada y salida de visitas autorizadas o no. No crear dos estancias abiertas por repetición. La consulta de presentes deriva entradas sin salida.
- **HU-04-002-FE:** formulario/lista/detalle necesario para el actor Personal de seguridad, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-04-002-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0/C1/C2; O: M9; sin dependencia obligatoria de paquetería.); rechazar IDs/ámbitos indebidos.
- **HU-04-002-QA:** ejecutar PR-04-002 y casos negativos: Doble envío no abre dos estancias; salida sin entrada es tratada por política explícita; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-04-002-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-04-002 y evidencia de prueba en PR internos.

### HU-04-003: Consultar quién está dentro como visita en el momento

**Historia:** como Personal de seguridad, quiero consultar quién está dentro como visita en el momento para preautorizar visitas y registrar entradas/salidas con conocimiento de presentes. **Actor:** Personal de seguridad. **Módulo:** M4. **Prioridad:** P1 esencial. **RF:** RF-04-003. **Fuente:** CU-04-03. **Semana objetivo:** 2. **Estimación base:** 6 h.

**Dependencias:** B: C0/C1/C2; O: M9; sin dependencia obligatoria de paquetería. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-04-003: lista coincide con estancias abiertas y refleja cambios en latencia acordada D-06. **Alternativas:** Sin visitantes: vacía; residente no obtiene lista global.

**Riesgos:** Salida sin entrada, duplicados y exposición de datos de visitantes. **Decisión pendiente:** D-06: qué significa autorizado o no y facultad de admitir; identidad y retención. No asumir que el sistema debe denegar toda visita no preautorizada.

**Evidencia esperada:** PR-04-003 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-04-003; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-04-003-BD:** diseñar/revisar persistencia y restricciones de Visita prevista, visitante mínimo, unidad anfitriona, autorización y movimientos de acceso. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-04-003-BE:** DTOs y caso de uso para consultar quién está dentro como visita en el momento; aplicar Identificación mínima/propósito, unidad válida, orden temporal y actor seguridad; datos personales mínimos acordados. y la regla relevante: Seguridad registra entrada y salida de visitas autorizadas o no. No crear dos estancias abiertas por repetición. La consulta de presentes deriva entradas sin salida.
- **HU-04-003-FE:** formulario/lista/detalle necesario para el actor Personal de seguridad, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-04-003-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0/C1/C2; O: M9; sin dependencia obligatoria de paquetería.); rechazar IDs/ámbitos indebidos.
- **HU-04-003-QA:** ejecutar PR-04-003 y casos negativos: Sin visitantes: vacía; residente no obtiene lista global; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-04-003-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-04-003 y evidencia de prueba en PR internos.

## EP-05. Paquetería — 26 h

Principal propuesto: Yael; revisor: Guille. No equivale a propietario exclusivo de integración o QA.

### HU-05-001: Registrar llegada de paquete para una unidad

**Historia:** como Personal de seguridad, quiero registrar llegada de paquete para una unidad para registrar recepción, avisar y entregar paquetes a destinatario correcto. **Actor:** Personal de seguridad. **Módulo:** M5. **Prioridad:** P1 esencial. **RF:** RF-05-001. **Fuente:** CU-05-01. **Semana objetivo:** 2. **Estimación base:** 6 h.

**Dependencias:** B: C0/C1/C2; P: M9; no necesita M4 terminado. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-05-001: paquete queda recibido con unidad, referencia, fecha y actor. **Alternativas:** Unidad inexistente o referencia repetida según política: error sin duplicado.

**Riesgos:** Paquete asignado a unidad incorrecta o entrega duplicada sin identidad. **Decisión pendiente:** D-07: prueba de autorización/identidad de retiro, delegados y evidencias.

**Evidencia esperada:** PR-05-001 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-05-001; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-05-001-BD:** diseñar/revisar persistencia y restricciones de Paquete, unidad, recepción, destinatarios, estado y entrega con receptor/actor/fecha. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-05-001-BE:** DTOs y caso de uso para registrar llegada de paquete para una unidad; aplicar Unidad, referencia de paquete, persona receptora y estado entregable; seguridad solo ámbito permitido. y la regla relevante: Recibido/entregado con historial; verificar facultad de quien retira según D-07. Una entrega no puede registrarse dos veces.
- **HU-05-001-FE:** formulario/lista/detalle necesario para el actor Personal de seguridad, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-05-001-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0/C1/C2; P: M9; no necesita M4 terminado.); rechazar IDs/ámbitos indebidos.
- **HU-05-001-QA:** ejecutar PR-05-001 y casos negativos: Unidad inexistente o referencia repetida según política: error sin duplicado; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-05-001-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-05-001 y evidencia de prueba en PR internos.

### HU-05-002: Enterarme de un paquete recibido

**Historia:** como Residente, quiero enterarme de un paquete recibido para registrar recepción, avisar y entregar paquetes a destinatario correcto. **Actor:** Residente. **Módulo:** M5. **Prioridad:** P1 esencial. **RF:** RF-05-002. **Fuente:** CU-05-02. **Semana objetivo:** 3. **Estimación base:** 6 h.

**Dependencias:** B: C0/C1/C2; P: M9; no necesita M4 terminado. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-05-002: aviso aparece en bandeja del destinatario vinculado a la unidad y referencia del paquete. **Alternativas:** Reintento de producción no duplica; usuario ajeno no ve aviso.

**Riesgos:** Paquete asignado a unidad incorrecta o entrega duplicada sin identidad. **Decisión pendiente:** D-07: prueba de autorización/identidad de retiro, delegados y evidencias.

**Evidencia esperada:** PR-05-002 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-05-002; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-05-002-BD:** diseñar/revisar persistencia y restricciones de Paquete, unidad, recepción, destinatarios, estado y entrega con receptor/actor/fecha. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-05-002-BE:** DTOs y caso de uso para enterarme de un paquete recibido; aplicar Unidad, referencia de paquete, persona receptora y estado entregable; seguridad solo ámbito permitido. y la regla relevante: Recibido/entregado con historial; verificar facultad de quien retira según D-07. Una entrega no puede registrarse dos veces.
- **HU-05-002-FE:** formulario/lista/detalle necesario para el actor Residente, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-05-002-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0/C1/C2; P: M9; no necesita M4 terminado.); rechazar IDs/ámbitos indebidos.
- **HU-05-002-QA:** ejecutar PR-05-002 y casos negativos: Reintento de producción no duplica; usuario ajeno no ve aviso; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-05-002-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-05-002 y evidencia de prueba en PR internos.

### HU-05-003: Ver historial y paquetes no recogidos

**Historia:** como Residente, quiero ver historial y paquetes no recogidos para registrar recepción, avisar y entregar paquetes a destinatario correcto. **Actor:** Residente. **Módulo:** M5. **Prioridad:** P1 esencial. **RF:** RF-05-003. **Fuente:** CU-05-03. **Semana objetivo:** 2. **Estimación base:** 6 h.

**Dependencias:** B: C0/C1/C2; P: M9; no necesita M4 terminado. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-05-003: pendientes e historial se derivan del estado real de paquetes de sus unidades. **Alternativas:** Sin paquetes: vacío; cambio de pertenencia sigue política aprobada.

**Riesgos:** Paquete asignado a unidad incorrecta o entrega duplicada sin identidad. **Decisión pendiente:** D-07: prueba de autorización/identidad de retiro, delegados y evidencias.

**Evidencia esperada:** PR-05-003 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-05-003; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-05-003-BD:** diseñar/revisar persistencia y restricciones de Paquete, unidad, recepción, destinatarios, estado y entrega con receptor/actor/fecha. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-05-003-BE:** DTOs y caso de uso para ver historial y paquetes no recogidos; aplicar Unidad, referencia de paquete, persona receptora y estado entregable; seguridad solo ámbito permitido. y la regla relevante: Recibido/entregado con historial; verificar facultad de quien retira según D-07. Una entrega no puede registrarse dos veces.
- **HU-05-003-FE:** formulario/lista/detalle necesario para el actor Residente, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-05-003-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0/C1/C2; P: M9; no necesita M4 terminado.); rechazar IDs/ámbitos indebidos.
- **HU-05-003-QA:** ejecutar PR-05-003 y casos negativos: Sin paquetes: vacío; cambio de pertenencia sigue política aprobada; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-05-003-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-05-003 y evidencia de prueba en PR internos.

### HU-05-004: Entregar el paquete solo a persona autorizada y dejar evidencia

**Historia:** como Personal de seguridad, quiero entregar el paquete solo a persona autorizada y dejar evidencia para registrar recepción, avisar y entregar paquetes a destinatario correcto. **Actor:** Personal de seguridad. **Módulo:** M5. **Prioridad:** P1 esencial. **RF:** RF-05-004. **Fuente:** CE-05. **Semana objetivo:** 2. **Estimación base:** 8 h.

**Dependencias:** B: C0/C1/C2; P: M9; no necesita M4 terminado. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-05-004: retiro valida receptor según D-07 y deja actor, fecha y receptor; segundo retiro no cambia historial. **Alternativas:** Receptor no autorizado o doble envío: sin entrega indebida.

**Riesgos:** Paquete asignado a unidad incorrecta o entrega duplicada sin identidad. **Decisión pendiente:** D-07: prueba de autorización/identidad de retiro, delegados y evidencias.

**Evidencia esperada:** PR-05-004 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-05-004; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-05-004-BD:** diseñar/revisar persistencia y restricciones de Paquete, unidad, recepción, destinatarios, estado y entrega con receptor/actor/fecha. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-05-004-BE:** DTOs y caso de uso para entregar el paquete solo a persona autorizada y dejar evidencia; aplicar Unidad, referencia de paquete, persona receptora y estado entregable; seguridad solo ámbito permitido. y la regla relevante: Recibido/entregado con historial; verificar facultad de quien retira según D-07. Una entrega no puede registrarse dos veces.
- **HU-05-004-FE:** formulario/lista/detalle necesario para el actor Personal de seguridad, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-05-004-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0/C1/C2; P: M9; no necesita M4 terminado.); rechazar IDs/ámbitos indebidos.
- **HU-05-004-QA:** ejecutar PR-05-004 y casos negativos: Receptor no autorizado o doble envío: sin entrega indebida; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-05-004-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-05-004 y evidencia de prueba en PR internos.

## EP-06. Asambleas y votaciones digitales — 30 h

Principal propuesto: Guille; revisor: Heber. No equivale a propietario exclusivo de integración o QA.

### HU-06-001: Convocar asamblea con agenda de temas a votar

**Historia:** como Administrador, quiero convocar asamblea con agenda de temas a votar para convocar decisiones colectivas con voto por unidad y resultado auditable. **Actor:** Administrador. **Módulo:** M6. **Prioridad:** P1 esencial. **RF:** RF-06-001. **Fuente:** CU-06-01. **Semana objetivo:** 3. **Estimación base:** 8 h.

**Dependencias:** B: C0/C1/C2 con pertenencia N:M; P: M9 para convocatoria si se acuerda; I: participación hacia M10. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-06-001: convocatoria y temas quedan consultables para destinatarios habilitados con ventana definida. **Alternativas:** Agenda vacía o ventana invertida: rechazar; comunicación cumple política D-08.

**Riesgos:** Dos residentes de una misma unidad votan simultáneamente o se altera un resultado. **Decisión pendiente:** D-08: representación, elegibilidad, quorum, empate, privacidad del voto y cierre; no inventar ponderaciones.

**Evidencia esperada:** PR-06-001 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-06-001; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-06-001-BD:** diseñar/revisar persistencia y restricciones de Asamblea, agenda/tema, opciones, periodo de votación, unidad habilitada, voto y evidencia. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-06-001-BE:** DTOs y caso de uso para convocar asamblea con agenda de temas a votar; aplicar Asamblea/tema vigentes, opción válida, unidad habilitada y actor facultado. y la regla relevante: La unicidad es unidad+tema, no usuario+tema. Verificar representante/ámbito antes de escribir y garantizar atomicidad bajo concurrencia. Propuesta: un voto emitido no se edita.
- **HU-06-001-FE:** formulario/lista/detalle necesario para el actor Administrador, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-06-001-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0/C1/C2 con pertenencia N:M; P: M9 para convocatoria si se acuerda; I: participación hacia M10.); rechazar IDs/ámbitos indebidos.
- **HU-06-001-QA:** ejecutar PR-06-001 y casos negativos: Agenda vacía o ventana invertida: rechazar; comunicación cumple política D-08; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-06-001-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-06-001 y evidencia de prueba en PR internos.

### HU-06-002: Emitir un voto por unidad en cada tema

**Historia:** como Residente, quiero emitir un voto por unidad en cada tema para convocar decisiones colectivas con voto por unidad y resultado auditable. **Actor:** Residente. **Módulo:** M6. **Prioridad:** P1 esencial. **RF:** RF-06-002. **Fuente:** CU-06-02. **Semana objetivo:** 3. **Estimación base:** 14 h.

**Dependencias:** B: C0/C1/C2 con pertenencia N:M; P: M9 para convocatoria si se acuerda; I: participación hacia M10. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-06-002: unidad/tema acepta un único voto válido aun con dos residentes y solicitudes simultáneas. **Alternativas:** Tema cerrado, otra unidad u opción ajena: rechazar sin voto.

**Riesgos:** Dos residentes de una misma unidad votan simultáneamente o se altera un resultado. **Decisión pendiente:** D-08: representación, elegibilidad, quorum, empate, privacidad del voto y cierre; no inventar ponderaciones.

**Evidencia esperada:** PR-06-002 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-06-002; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-06-002-BD:** diseñar/revisar persistencia y restricciones de Asamblea, agenda/tema, opciones, periodo de votación, unidad habilitada, voto y evidencia. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-06-002-BE:** DTOs y caso de uso para emitir un voto por unidad en cada tema; aplicar Asamblea/tema vigentes, opción válida, unidad habilitada y actor facultado. y la regla relevante: La unicidad es unidad+tema, no usuario+tema. Verificar representante/ámbito antes de escribir y garantizar atomicidad bajo concurrencia. Propuesta: un voto emitido no se edita.
- **HU-06-002-FE:** formulario/lista/detalle necesario para el actor Residente, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-06-002-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0/C1/C2 con pertenencia N:M; P: M9 para convocatoria si se acuerda; I: participación hacia M10.); rechazar IDs/ámbitos indebidos.
- **HU-06-002-QA:** ejecutar PR-06-002 y casos negativos: Tema cerrado, otra unidad u opción ajena: rechazar sin voto; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-06-002-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-06-002 y evidencia de prueba en PR internos.

### HU-06-003: Consultar resultado claro y auditable

**Historia:** como Administrador, quiero consultar resultado claro y auditable para convocar decisiones colectivas con voto por unidad y resultado auditable. **Actor:** Administrador. **Módulo:** M6. **Prioridad:** P1 esencial. **RF:** RF-06-003. **Fuente:** CU-06-03. **Semana objetivo:** 3. **Estimación base:** 8 h.

**Dependencias:** B: C0/C1/C2 con pertenencia N:M; P: M9 para convocatoria si se acuerda; I: participación hacia M10. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-06-003: totales coinciden con votos válidos y evidencia permite verificar conteo sin exponer más datos que D-08. **Alternativas:** Sin votos: resultado cero; usuario sin facultad de auditoría no accede al detalle.

**Riesgos:** Dos residentes de una misma unidad votan simultáneamente o se altera un resultado. **Decisión pendiente:** D-08: representación, elegibilidad, quorum, empate, privacidad del voto y cierre; no inventar ponderaciones.

**Evidencia esperada:** PR-06-003 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-06-003; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-06-003-BD:** diseñar/revisar persistencia y restricciones de Asamblea, agenda/tema, opciones, periodo de votación, unidad habilitada, voto y evidencia. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-06-003-BE:** DTOs y caso de uso para consultar resultado claro y auditable; aplicar Asamblea/tema vigentes, opción válida, unidad habilitada y actor facultado. y la regla relevante: La unicidad es unidad+tema, no usuario+tema. Verificar representante/ámbito antes de escribir y garantizar atomicidad bajo concurrencia. Propuesta: un voto emitido no se edita.
- **HU-06-003-FE:** formulario/lista/detalle necesario para el actor Administrador, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-06-003-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0/C1/C2 con pertenencia N:M; P: M9 para convocatoria si se acuerda; I: participación hacia M10.); rechazar IDs/ámbitos indebidos.
- **HU-06-003-QA:** ejecutar PR-06-003 y casos negativos: Sin votos: resultado cero; usuario sin facultad de auditoría no accede al detalle; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-06-003-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-06-003 y evidencia de prueba en PR internos.

## EP-07. Anuncios y comunicados — 14 h

Principal propuesto: Heber; revisor: Armando. No equivale a propietario exclusivo de integración o QA.

### HU-07-001: Publicar comunicados para todos o torre/sección

**Historia:** como Administrador, quiero publicar comunicados para todos o torre/sección para publicar información oficial relevante para todos o una torre/sección. **Actor:** Administrador. **Módulo:** M7. **Prioridad:** P1 esencial. **RF:** RF-07-001. **Fuente:** CU-07-01. **Semana objetivo:** 2. **Estimación base:** 8 h.

**Dependencias:** B: C0/C1/C2 y torre/sección; P: M9. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-07-001: contenido y audiencia persisten y se distribuye solo al ámbito elegido con evidencia D-09. **Alternativas:** Torre ajena o contenido vacío: rechazar sin difusión.

**Riesgos:** Filtrado solo en UI o afirmar que notificación prueba lectura humana. **Decisión pendiente:** D-09: evidencia exigida de recepción/lectura, edición y audiencia histórica.

**Evidencia esperada:** PR-07-001 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-07-001; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-07-001-BD:** diseñar/revisar persistencia y restricciones de Comunicado, contenido, ámbito, destinatarios y evidencia de publicación/lectura propuesta. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-07-001-BE:** DTOs y caso de uso para publicar comunicados para todos o torre/sección; aplicar Contenido no vacío, torre del condominio y permiso administrativo. y la regla relevante: Audiencia se verifica también al acceder por ID. Publicado conserva referencia y fecha; definir audiencia dinámica o foto al publicar.
- **HU-07-001-FE:** formulario/lista/detalle necesario para el actor Administrador, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-07-001-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0/C1/C2 y torre/sección; P: M9.); rechazar IDs/ámbitos indebidos.
- **HU-07-001-QA:** ejecutar PR-07-001 y casos negativos: Torre ajena o contenido vacío: rechazar sin difusión; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-07-001-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-07-001 y evidencia de prueba en PR internos.

### HU-07-002: Ver comunicados relevantes para mi unidad

**Historia:** como Residente, quiero ver comunicados relevantes para mi unidad para publicar información oficial relevante para todos o una torre/sección. **Actor:** Residente. **Módulo:** M7. **Prioridad:** P1 esencial. **RF:** RF-07-002. **Fuente:** CU-07-02. **Semana objetivo:** 2. **Estimación base:** 6 h.

**Dependencias:** B: C0/C1/C2 y torre/sección; P: M9. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-07-002: lista y detalle solo incluyen audiencia aplicable; comunicación se demuestra con evidencia acordada. **Alternativas:** Enlace a comunicado fuera de audiencia: sin contenido.

**Riesgos:** Filtrado solo en UI o afirmar que notificación prueba lectura humana. **Decisión pendiente:** D-09: evidencia exigida de recepción/lectura, edición y audiencia histórica.

**Evidencia esperada:** PR-07-002 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-07-002; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-07-002-BD:** diseñar/revisar persistencia y restricciones de Comunicado, contenido, ámbito, destinatarios y evidencia de publicación/lectura propuesta. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-07-002-BE:** DTOs y caso de uso para ver comunicados relevantes para mi unidad; aplicar Contenido no vacío, torre del condominio y permiso administrativo. y la regla relevante: Audiencia se verifica también al acceder por ID. Publicado conserva referencia y fecha; definir audiencia dinámica o foto al publicar.
- **HU-07-002-FE:** formulario/lista/detalle necesario para el actor Residente, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-07-002-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0/C1/C2 y torre/sección; P: M9.); rechazar IDs/ámbitos indebidos.
- **HU-07-002-QA:** ejecutar PR-07-002 y casos negativos: Enlace a comunicado fuera de audiencia: sin contenido; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-07-002-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-07-002 y evidencia de prueba en PR internos.

## EP-08. Directorio de residentes — 14 h

Principal propuesto: Armando; revisor: Serrato. No equivale a propietario exclusivo de integración o QA.

### HU-08-001: Decidir si aparezco y qué datos comparto

**Historia:** como Residente, quiero decidir si aparezco y qué datos comparto para facilitar contacto entre vecinos respetando datos que cada residente decide compartir. **Actor:** Residente. **Módulo:** M8. **Prioridad:** P1 esencial. **RF:** RF-08-001. **Fuente:** CU-08-01. **Semana objetivo:** 2. **Estimación base:** 8 h.

**Dependencias:** B: C0/C1/C2; O: M9 si se desea, no requerido para directorio. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-08-001: preferencias por actor autorizado gobiernan campos y aparición, también después de cambiarse. **Alternativas:** Editar perfil ajeno o campo inválido: rechazar.

**Riesgos:** Caché conserva datos ocultados o búsqueda expone campos no autorizados. **Decisión pendiente:** D-10: campos, ámbito y política de visibilidad para residente con varias unidades.

**Evidencia esperada:** PR-08-001 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-08-001; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-08-001-BD:** diseñar/revisar persistencia y restricciones de Perfil de contacto y preferencias por residente/ámbito, opt-in y campos visibles. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-08-001-BE:** DTOs y caso de uso para decidir si aparezco y qué datos comparto; aplicar Contacto válido, dueño de perfil, filtros y pertenencia al ámbito. y la regla relevante: Propuesta de privacidad: no aparecer por defecto; solo devolver campos autorizados desde API, incluso búsqueda/detalle. Preferencias deben aplicarse al dejar de compartir.
- **HU-08-001-FE:** formulario/lista/detalle necesario para el actor Residente, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-08-001-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0/C1/C2; O: M9 si se desea, no requerido para directorio.); rechazar IDs/ámbitos indebidos.
- **HU-08-001-QA:** ejecutar PR-08-001 y casos negativos: Editar perfil ajeno o campo inválido: rechazar; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-08-001-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-08-001 y evidencia de prueba en PR internos.

### HU-08-002: Buscar contacto de otro vecino respetando sus preferencias

**Historia:** como Residente, quiero buscar contacto de otro vecino respetando sus preferencias para facilitar contacto entre vecinos respetando datos que cada residente decide compartir. **Actor:** Residente. **Módulo:** M8. **Prioridad:** P1 esencial. **RF:** RF-08-002. **Fuente:** CU-08-02. **Semana objetivo:** 2. **Estimación base:** 6 h.

**Dependencias:** B: C0/C1/C2; O: M9 si se desea, no requerido para directorio. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-08-002: búsqueda y detalle solo revelan datos voluntarios de vecinos del ámbito permitido. **Alternativas:** No opt-in o dato oculto: no aparece ni se filtra por consulta directa.

**Riesgos:** Caché conserva datos ocultados o búsqueda expone campos no autorizados. **Decisión pendiente:** D-10: campos, ámbito y política de visibilidad para residente con varias unidades.

**Evidencia esperada:** PR-08-002 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-08-002; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-08-002-BD:** diseñar/revisar persistencia y restricciones de Perfil de contacto y preferencias por residente/ámbito, opt-in y campos visibles. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-08-002-BE:** DTOs y caso de uso para buscar contacto de otro vecino respetando sus preferencias; aplicar Contacto válido, dueño de perfil, filtros y pertenencia al ámbito. y la regla relevante: Propuesta de privacidad: no aparecer por defecto; solo devolver campos autorizados desde API, incluso búsqueda/detalle. Preferencias deben aplicarse al dejar de compartir.
- **HU-08-002-FE:** formulario/lista/detalle necesario para el actor Residente, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-08-002-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0/C1/C2; O: M9 si se desea, no requerido para directorio.); rechazar IDs/ámbitos indebidos.
- **HU-08-002-QA:** ejecutar PR-08-002 y casos negativos: No opt-in o dato oculto: no aparece ni se filtra por consulta directa; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-08-002-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-08-002 y evidencia de prueba en PR internos.

## EP-09. Notificaciones — 20 h

Principal propuesto: Serrato; revisor: Heber. No equivale a propietario exclusivo de integración o QA.

### HU-09-001: Recibir en un lugar avisos relevantes de cuotas, paquetes y comunicados

**Historia:** como Residente, quiero recibir en un lugar avisos relevantes de cuotas, paquetes y comunicados para concentrar avisos relevantes y ofrecer servicio común de envío a persona o grupo. **Actor:** Residente. **Módulo:** M9. **Prioridad:** P1 esencial. **RF:** RF-09-001. **Fuente:** CU-09-01. **Semana objetivo:** 3. **Estimación base:** 8 h.

**Dependencias:** B: C0/C1/C2 y contrato de eventos; P: integración M1/M3/M5/M7/M6; no requiere esos módulos terminados para construir bandeja. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-09-001: bandeja muestra eventos reales de los tres ejemplos oficiales, solo propios, con referencias navegables autorizadas. **Alternativas:** Bandeja vacía, evento duplicado o recurso ya no accesible: manejar sin filtrar datos.

**Riesgos:** Avisos perdidos por fallo entre operación y envío; duplicados o difusión fuera de grupo. **Decisión pendiente:** D-11: eventos obligatorios, latencia, retención y qué canales; proponer bandeja interna sin exigir email/SMS.

**Evidencia esperada:** PR-09-001 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-09-001; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-09-001-BD:** diseñar/revisar persistencia y restricciones de Notificación/evento, destinatarios, referencia de recurso, fecha, lectura y clave de idempotencia propuesta. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-09-001-BE:** DTOs y caso de uso para recibir en un lugar avisos relevantes de cuotas, paquetes y comunicados; aplicar Productor autorizado, grupo del ámbito, recurso referenciado y usuario destinatario. y la regla relevante: Separar evento de sus destinatarios; no notificar otra unidad por ID del cliente. Propuesta de idempotencia: evento+destinatario. Productores reales deben conectarse.
- **HU-09-001-FE:** formulario/lista/detalle necesario para el actor Residente, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-09-001-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0/C1/C2 y contrato de eventos; P: integración M1/M3/M5/M7/M6; no requiere esos módulos terminados para construir bandeja.); rechazar IDs/ámbitos indebidos.
- **HU-09-001-QA:** ejecutar PR-09-001 y casos negativos: Bandeja vacía, evento duplicado o recurso ya no accesible: manejar sin filtrar datos; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-09-001-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-09-001 y evidencia de prueba en PR internos.

### HU-09-002: Avisar a un residente o grupo mediante lógica compartida

**Historia:** como Servicio interno productor, quiero avisar a un residente o grupo mediante lógica compartida para concentrar avisos relevantes y ofrecer servicio común de envío a persona o grupo. **Actor:** Servicio interno productor. **Módulo:** M9. **Prioridad:** P1 esencial. **RF:** RF-09-002. **Fuente:** CU-09-02. **Semana objetivo:** 1. **Estimación base:** 12 h.

**Dependencias:** B: C0/C1/C2 y contrato de eventos; P: integración M1/M3/M5/M7/M6; no requiere esos módulos terminados para construir bandeja. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-09-002: productores usan un contrato común, resuelven grupo autorizado y persisten entrega sin duplicación; política de fallo definida. **Alternativas:** Reintento, grupo vacío o destinatario ajeno: resultado trazable, sin éxito falso.

**Riesgos:** Avisos perdidos por fallo entre operación y envío; duplicados o difusión fuera de grupo. **Decisión pendiente:** D-11: eventos obligatorios, latencia, retención y qué canales; proponer bandeja interna sin exigir email/SMS.

**Evidencia esperada:** PR-09-002 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-09-002; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-09-002-BD:** diseñar/revisar persistencia y restricciones de Notificación/evento, destinatarios, referencia de recurso, fecha, lectura y clave de idempotencia propuesta. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-09-002-BE:** DTOs y caso de uso para avisar a un residente o grupo mediante lógica compartida; aplicar Productor autorizado, grupo del ámbito, recurso referenciado y usuario destinatario. y la regla relevante: Separar evento de sus destinatarios; no notificar otra unidad por ID del cliente. Propuesta de idempotencia: evento+destinatario. Productores reales deben conectarse.
- **HU-09-002-FE:** formulario/lista/detalle necesario para el actor Servicio interno productor, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-09-002-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0/C1/C2 y contrato de eventos; P: integración M1/M3/M5/M7/M6; no requiere esos módulos terminados para construir bandeja.); rechazar IDs/ámbitos indebidos.
- **HU-09-002-QA:** ejecutar PR-09-002 y casos negativos: Reintento, grupo vacío o destinatario ajeno: resultado trazable, sin éxito falso; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-09-002-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-09-002 y evidencia de prueba en PR internos.

## EP-10. Reportes financieros y analíticos para administración — 24 h

Principal propuesto: Guille; revisor: Yael. No equivale a propietario exclusivo de integración o QA.

### HU-10-001: Consultar morosidad, uso de áreas e incidencias abiertas consolidadas

**Historia:** como Administrador, quiero consultar morosidad, uso de áreas e incidencias abiertas consolidadas para consolidar salud financiera, ocupación, incidencias y participación para decisiones informadas. **Actor:** Administrador. **Módulo:** M10. **Prioridad:** P1 esencial. **RF:** RF-10-001. **Fuente:** CU-10-01. **Semana objetivo:** 3. **Estimación base:** 12 h.

**Dependencias:** B: C0/C1/C2; I: M1/M2/M3/M6 para aceptación real; P: M7 o salida imprimible para compartir; no bloquear diseño por esos datos. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-10-001: tres indicadores coinciden con fuentes reales y mismo ámbito/periodo; cero datos se distingue de fuente fallida. **Alternativas:** Fuente no disponible: mostrar limitación, no reemplazar por cero.

**Riesgos:** Dashboard con datos ficticios, denominadores inconsistentes o exposición de finanzas individuales. **Decisión pendiente:** D-12: fórmulas, periodo, contenido autorizado al compartir y modalidad aceptada de compartir.

**Evidencia esperada:** PR-10-001 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-10-001; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-10-001-BD:** diseñar/revisar persistencia y restricciones de Consultas/métricas derivadas, periodo, ámbito, fuentes y captura de reporte si se comparte. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-10-001-BE:** DTOs y caso de uso para consultar morosidad, uso de áreas e incidencias abiertas consolidadas; aplicar Periodo válido, fuente coherente, permisos del administrador y audiencia al compartir. y la regla relevante: No crear saldos alternos ni guardar un resultado como fuente financiera. Definir morosidad, ocupación y participación con productores; mostrar fecha/corte.
- **HU-10-001-FE:** formulario/lista/detalle necesario para el actor Administrador, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-10-001-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0/C1/C2; I: M1/M2/M3/M6 para aceptación real; P: M7 o salida imprimible para compartir; no bloquear diseño por esos datos.); rechazar IDs/ámbitos indebidos.
- **HU-10-001-QA:** ejecutar PR-10-001 y casos negativos: Fuente no disponible: mostrar limitación, no reemplazar por cero; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-10-001-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-10-001 y evidencia de prueba en PR internos.

### HU-10-002: Compartir información con mesa directiva o residentes en asamblea

**Historia:** como Administrador, quiero compartir información con mesa directiva o residentes en asamblea para consolidar salud financiera, ocupación, incidencias y participación para decisiones informadas. **Actor:** Administrador. **Módulo:** M10. **Prioridad:** P1 esencial. **RF:** RF-10-002. **Fuente:** CU-10-02. **Semana objetivo:** 3. **Estimación base:** 6 h.

**Dependencias:** B: C0/C1/C2; I: M1/M2/M3/M6 para aceptación real; P: M7 o salida imprimible para compartir; no bloquear diseño por esos datos. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-10-002: destinatarios o salida aprobada reciben reporte con corte/periodo sin datos que no pueden consultar. **Alternativas:** Sin permiso, enlace caducado si aplica o audiencia inválida: rechazar.

**Riesgos:** Dashboard con datos ficticios, denominadores inconsistentes o exposición de finanzas individuales. **Decisión pendiente:** D-12: fórmulas, periodo, contenido autorizado al compartir y modalidad aceptada de compartir.

**Evidencia esperada:** PR-10-002 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-10-002; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-10-002-BD:** diseñar/revisar persistencia y restricciones de Consultas/métricas derivadas, periodo, ámbito, fuentes y captura de reporte si se comparte. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-10-002-BE:** DTOs y caso de uso para compartir información con mesa directiva o residentes en asamblea; aplicar Periodo válido, fuente coherente, permisos del administrador y audiencia al compartir. y la regla relevante: No crear saldos alternos ni guardar un resultado como fuente financiera. Definir morosidad, ocupación y participación con productores; mostrar fecha/corte.
- **HU-10-002-FE:** formulario/lista/detalle necesario para el actor Administrador, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-10-002-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0/C1/C2; I: M1/M2/M3/M6 para aceptación real; P: M7 o salida imprimible para compartir; no bloquear diseño por esos datos.); rechazar IDs/ámbitos indebidos.
- **HU-10-002-QA:** ejecutar PR-10-002 y casos negativos: Sin permiso, enlace caducado si aplica o audiencia inválida: rechazar; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-10-002-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-10-002 y evidencia de prueba en PR internos.

### HU-10-003: Consultar participación en votaciones junto a las demás métricas

**Historia:** como Administrador, quiero consultar participación en votaciones junto a las demás métricas para consolidar salud financiera, ocupación, incidencias y participación para decisiones informadas. **Actor:** Administrador. **Módulo:** M10. **Prioridad:** P1 esencial. **RF:** RF-10-003. **Fuente:** NE-10. **Semana objetivo:** 3. **Estimación base:** 6 h.

**Dependencias:** B: C0/C1/C2; I: M1/M2/M3/M6 para aceptación real; P: M7 o salida imprimible para compartir; no bloquear diseño por esos datos. HU-T-03/04/05/07; las historias de configuración del mismo módulo habilitan las operaciones que la usan.

**Aceptación:** CA-10-003: participación usa votos/unidades elegibles con denominador documentado y coincide con M6. **Alternativas:** Sin elegibles: no dividir entre cero ni mostrar porcentaje engañoso.

**Riesgos:** Dashboard con datos ficticios, denominadores inconsistentes o exposición de finanzas individuales. **Decisión pendiente:** D-12: fórmulas, periodo, contenido autorizado al compartir y modalidad aceptada de compartir.

**Evidencia esperada:** PR-10-003 con petición/respuesta sin datos sensibles, vista funcional, persistencia comprobada y revisión de CA-10-003; cuando haya concurrencia, conteo real de filas y resultados de ambos intentos.

**Tareas técnicas:**

- **HU-10-003-BD:** diseñar/revisar persistencia y restricciones de Consultas/métricas derivadas, periodo, ámbito, fuentes y captura de reporte si se comparte. que afecten esta historia; reutilizar entidades compartidas; migración futura coordinada, sin generar nada en esta planificación.
- **HU-10-003-BE:** DTOs y caso de uso para consultar participación en votaciones junto a las demás métricas; aplicar Periodo válido, fuente coherente, permisos del administrador y audiencia al compartir. y la regla relevante: No crear saldos alternos ni guardar un resultado como fuente financiera. Definir morosidad, ocupación y participación con productores; mostrar fecha/corte.
- **HU-10-003-FE:** formulario/lista/detalle necesario para el actor Administrador, con estados vacío, cargando, error y éxito; ocultar navegación no sustituye permiso API.
- **HU-10-003-INT:** conectar pantalla y API con sesión real; integrar solo los contratos necesarios (B: C0/C1/C2; I: M1/M2/M3/M6 para aceptación real; P: M7 o salida imprimible para compartir; no bloquear diseño por esos datos.); rechazar IDs/ámbitos indebidos.
- **HU-10-003-QA:** ejecutar PR-10-003 y casos negativos: Sin elegibles: no dividir entre cero ni mostrar porcentaje engañoso; adjuntar resultado y comprobar persistencia tras recarga.
- **HU-10-003-DOC:** registrar contrato, regla/decisión vinculada, criterio CA-10-003 y evidencia de prueba en PR internos.

## EP-E. Entrega y calidad global

### HU-E-01: Integración y pruebas de aceptación de los diez módulos

**Historia:** como equipo/cátedra, necesito integración y pruebas de aceptación de los diez módulos para verificar la entrega completa. **Actor:** equipo/cátedra. **Módulo:** transversal de entrega. **Prioridad:** P1. **Dependencias:** HU-T-04, HU-T-05 y HU-01..HU-10. **Semana:** 4. **Estimación:** 18 h. **Responsabilidad propuesta:** Todos; Yael coordina, cada dueño prueba. **Aceptación:** Matriz de RF ejecutada, concurrencia y aislamiento comprobados con datos reales. **Riesgo:** descubrir incompatibilidades al final; hacer integración desde semana 1. **Evidencia:** matriz de pruebas, PR, enlaces y acta de ensayo según historia.

**Tareas:** HU-E-01-BD: validar estado y compatibilidad de datos de demo; HU-E-01-BE/FE: corregir defectos que bloquean aceptación; HU-E-01-INT: recorrer los diez módulos y fuentes reales; HU-E-01-QA: regresión y criterios de salida; HU-E-01-DOC: evidencias, manual de ejecución y decisiones. No ejecutar estas tareas en la presente planificación.

### HU-E-02: Estabilización y regresión

**Historia:** como equipo/cátedra, necesito estabilización y regresión para verificar la entrega completa. **Actor:** equipo/cátedra. **Módulo:** transversal de entrega. **Prioridad:** P1. **Dependencias:** HU-E-01. **Semana:** 4. **Estimación:** 16 h. **Responsabilidad propuesta:** Todos; revisión cruzada. **Aceptación:** Defectos críticos cerrados, regresión y checks pertinentes aprobados. **Riesgo:** descubrir incompatibilidades al final; hacer integración desde semana 1. **Evidencia:** matriz de pruebas, PR, enlaces y acta de ensayo según historia.

**Tareas:** HU-E-02-BD: validar estado y compatibilidad de datos de demo; HU-E-02-BE/FE: corregir defectos que bloquean aceptación; HU-E-02-INT: recorrer los diez módulos y fuentes reales; HU-E-02-QA: regresión y criterios de salida; HU-E-02-DOC: evidencias, manual de ejecución y decisiones. No ejecutar estas tareas en la presente planificación.

### HU-E-03: Demo final, actualización y recuperación documentadas

**Historia:** como equipo/cátedra, necesito demo final, actualización y recuperación documentadas para verificar la entrega completa. **Actor:** equipo/cátedra. **Módulo:** transversal de entrega. **Prioridad:** P1. **Dependencias:** HU-T-08, HU-E-01. **Semana:** 4. **Estimación:** 8 h. **Responsabilidad propuesta:** Heber y Yael con dueños. **Aceptación:** Demo accesible a cátedra y procedimiento de actualización/recuperación probado en desarrollo. **Riesgo:** descubrir incompatibilidades al final; hacer integración desde semana 1. **Evidencia:** matriz de pruebas, PR, enlaces y acta de ensayo según historia.

**Tareas:** HU-E-03-BD: validar estado y compatibilidad de datos de demo; HU-E-03-BE/FE: corregir defectos que bloquean aceptación; HU-E-03-INT: recorrer los diez módulos y fuentes reales; HU-E-03-QA: regresión y criterios de salida; HU-E-03-DOC: evidencias, manual de ejecución y decisiones. No ejecutar estas tareas en la presente planificación.

### HU-E-04: Documentación, trazabilidad y ensayo de presentación

**Historia:** como equipo/cátedra, necesito documentación, trazabilidad y ensayo de presentación para verificar la entrega completa. **Actor:** equipo/cátedra. **Módulo:** transversal de entrega. **Prioridad:** P1. **Dependencias:** HU-E-01. **Semana:** 4. **Estimación:** 8 h. **Responsabilidad propuesta:** Armando coordina; todos presentan. **Aceptación:** README con nombres/roles, decisiones, enlaces y pruebas; los diez módulos se demuestran. **Riesgo:** descubrir incompatibilidades al final; hacer integración desde semana 1. **Evidencia:** matriz de pruebas, PR, enlaces y acta de ensayo según historia.

**Tareas:** HU-E-04-BD: validar estado y compatibilidad de datos de demo; HU-E-04-BE/FE: corregir defectos que bloquean aceptación; HU-E-04-INT: recorrer los diez módulos y fuentes reales; HU-E-04-QA: regresión y criterios de salida; HU-E-04-DOC: evidencias, manual de ejecución y decisiones. No ejecutar estas tareas en la presente planificación.

## EP-OP. Mejoras opcionales sin compromiso

| Historia opcional / actor | Módulo | Dependencias | Aceptación propuesta | Estimación exploratoria | Riesgo / evidencia |
|---|---|---|---|---|---|
| HU-OP-01: residente usa calendario visual avanzado | M2 | HU-02-001/002; P2 | Mismas reglas de API y accesibilidad, sin alterar exclusión | 8–16 h | Distracción del alcance; demo de navegación |
| HU-OP-02: residente recibe canal externo adicional | M9 | HU-09-001/002; P2; proveedor aprobado | Consentimiento y entrega trazable; bandeja sigue operativa | 12–24 h | Dependencia externa; prueba del proveedor |
| HU-OP-03: administrador explora gráficas avanzadas | M10 | HU-10-001/003; P2 | Mismas cifras y permisos que indicadores básicos | 6–12 h | Fórmulas duplicadas; comparación de resultados |

Para cada opcional: tareas OP-BD revisar persistencia si cambia; OP-BE mantener contrato; OP-FE construir interacción; OP-INT conectar datos reales; OP-QA comparar invariantes; OP-DOC justificar y mostrar evidencia. No se incluye en el total ni en cronograma. Las otras mejoras de MVP son catálogo de ideas sin tarjeta comprometida.

## Índice de historias y esfuerzo

| Épica | Historias esenciales | Horas base | Dueño/revisor propuestos |
|---|---|---|---|
| EP-01 | HU-01-001, HU-01-002, HU-01-003, HU-01-004 | 42 | Armando / Guille |
| EP-02 | HU-02-001, HU-02-002, HU-02-003 | 28 | Heber / Serrato |
| EP-03 | HU-03-001, HU-03-002, HU-03-003 | 28 | Serrato / Yael |
| EP-04 | HU-04-001, HU-04-002, HU-04-003 | 24 | Yael / Armando |
| EP-05 | HU-05-001, HU-05-002, HU-05-003, HU-05-004 | 26 | Yael / Guille |
| EP-06 | HU-06-001, HU-06-002, HU-06-003 | 30 | Guille / Heber |
| EP-07 | HU-07-001, HU-07-002 | 14 | Heber / Armando |
| EP-08 | HU-08-001, HU-08-002 | 14 | Armando / Serrato |
| EP-09 | HU-09-001, HU-09-002 | 20 | Serrato / Heber |
| EP-10 | HU-10-001, HU-10-002, HU-10-003 | 24 | Guille / Yael |

Los PRE/MOD/ENT de la guía consolidada anterior quedan como índice histórico corregido; este archivo es la fuente vigente de historias, estimaciones y dependencias. No se suman ambos backlogs.
