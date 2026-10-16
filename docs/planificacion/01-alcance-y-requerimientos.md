# Alcance y requerimientos funcionales

> Edición para revisión en el fork, publicada por solicitud posterior del equipo. La arquitectura, estimaciones y asignaciones siguen siendo propuestas. Las referencias a conservación local, ausencia de commits/push y «esta ejecución» describen la etapa de planificación anterior; esta publicación posterior incorpora la documentación sin modificar aplicación ni protecciones.

**Estado:** planificación propuesta, no implementación ni decisiones aprobadas. **Alcance confirmado por el equipo:** diez módulos más adaptación de autenticación; cinco integrantes; cuatro semanas.

## Procedencia y clasificación

**RO** = requerimiento oficial o paráfrasis de caso/criterio del PDF. **HV** = hallazgo técnico verificado en análisis previo. **PA** = propuesta de arquitectura/operación. **SP** = supuesto pendiente de aprobación. **RI** = riesgo. Los criterios CA y pruebas PR son operacionalizaciones propuestas de los objetivos oficiales, no texto literal del catedrático.

Fuente primaria: PDF suministrado, reglas páginas 1-3 y Proyecto 1 páginas 3-6. Casos identificados CU-xx-yy siguen su orden en cada tabla; CE es criterio de éxito y NE necesidad de negocio. Hay 26 casos de uso oficiales. Un caso puede originar varios RF (p. ej. consultar y pagar). Las restricciones transversales se planifican en HU-T, sin atribuir a la cátedra cada detalle de implementación.

**Alcance:** los diez módulos y adaptación del módulo 0; se registra D-01 para conciliar el reparto general de diez equipos del PDF con la instrucción específica del equipo, sin reducir este alcance.

**Reglas generales RO:** forks de los dos boilerplates, originales de lectura, Compose provisto, decisiones y diagramas documentados, README con integrantes/roles, historial/PR de equipo y demo accesible. La planificación no publica ni configura estos elementos.

## Roles transversales

Residente opera sobre pertenencias y audiencias autorizadas; Administrador gestiona procesos del condominio asignado; Personal de seguridad opera accesos y recepción/entrega de paquetes. Esta delimitación es PA para concretar los roles RO: la matriz fina se aprueba en D-02. Mesa directiva es audiencia del reporte en el PDF, no un cuarto rol nuevo obligatorio. Servicio productor es actor interno del contrato M9, no un usuario humano adicional.

## Reglas comunes propuestas

API valida pertenencia y rol en cada operación, no solo en navegación; importe usa precisión decimal y moneda explícita; tiempos se registran con convención y zona acordadas; identidad del actor procede de la sesión. Los cambios sensibles preservan evidencia. Datos inexistentes, inválidos, repetidos o fuera del ámbito producen error claro y no un éxito parcial silencioso. La semántica exacta queda en D-02..D-12.

## Módulo 1: Cuotas y pagos de mantenimiento

**Objetivo/necesidad RO:** Cobrar cuotas periódicas y permitir conocer deudas, pagos y antigüedad de mora. **Éxito RO, resumido:** Administración conoce la salud financiera y cada residente comprende su deuda.

**Actores:** Residente, Administrador.

| RF | Fuente / caso oficial resumido | Función que se desarrollará | Aceptación propuesta |
|---|---|---|---|
| RF-01-001 | CU-01-01; CU oficial | Residente: consultar mi estado de cuenta y cuotas pendientes | CA-01-001: cargos, pagos confirmados y saldo de sus unidades coinciden y no aparecen unidades ajenas |
| RF-01-002 | CU-01-01; CU oficial | Residente: pagar mis cuotas pendientes | CA-01-002: el medio aprobado permite completar pago y solo su confirmación válida modifica saldo una vez |
| RF-01-003 | CU-01-02; CU oficial | Administrador: consultar unidades morosas y desde cuándo | CA-01-003: listado identifica saldo vencido y antigüedad usando vencimiento y pagos confirmados |
| RF-01-004 | CU-01-03; CU oficial | Administrador: generar cuotas mensuales para las unidades sin carga manual individual | CA-01-004: al llegar el periodo se generan cuotas correspondientes, una por regla aprobada/unidad/periodo; repetir ejecución no duplica |

**Reglas PA:** Saldo derivado de cargos menos pagos confirmados; no confirmar por un estado de UI. Generación mensual repetida no duplica cargos. Preservar actor, fecha y evidencia de cada movimiento.

**Datos candidatos PA:** Cuota, periodo, unidad, importe/moneda, vencimiento, pago, aplicación e historial.

**Dependencias PA:** B: C0 identidad/unidades, C1 autorización y C2 contratos; P: M9 para avisos; I: M10 consume saldos.

**Validaciones PA:** Importes decimales positivos, periodo/vencimiento válidos, unidad de pertenencia, referencias y transiciones admitidas.

**Riesgo RI:** Doble contabilización, carreras de cobro y acceso a otra unidad; el mecanismo real de pago puede aumentar esfuerzo.

**Aclaración SP:** D-03: mecanismo de pago aprobado; moneda, recargos, pagos parciales y evidencia. Recargos no se añaden por defecto.

| RF | Alternativa / error que debe concretarse |
|---|---|
| RF-01-001 | Unidad sin cargos: lista vacía/saldo cero; pertenencia revocada: rechazar |
| RF-01-002 | Reintento, medio fallido o importe inválido: sin doble cargo ni saldo falso |
| RF-01-003 | Sin mora: lista vacía; residente sin permiso no accede al listado global |
| RF-01-004 | Fallo parcial: reintento recupera faltantes sin duplicar ni ocultar error |

## Módulo 2: Reservas de áreas comunes

**Objetivo/necesidad RO:** Evitar choques y sobrecupo al reservar espacios compartidos. **Éxito RO, resumido:** Ningún espacio tiene dos reservas incompatibles a la misma hora.

**Actores:** Residente, Administrador.

| RF | Fuente / caso oficial resumido | Función que se desarrollará | Aceptación propuesta |
|---|---|---|---|
| RF-02-001 | CU-02-01; CU oficial | Residente: consultar áreas disponibles para fecha y hora | CA-02-001: disponibilidad respeta reservas confirmadas, horarios y capacidad |
| RF-02-002 | CU-02-02; CU oficial | Residente: reservar un espacio sin cruces | CA-02-002: solicitudes concurrentes incompatibles dejan una sola reserva; la rechazada explica conflicto |
| RF-02-003 | CU-02-03; CU oficial | Administrador: definir áreas, capacidad y horarios permitidos | CA-02-003: configuración persistida gobierna consultas y nuevas reservas; solo administrador autorizado la cambia |

**Reglas PA:** Disponibilidad es informativa; al guardar se garantiza exclusión transaccional. Capacidad y ventanas autorizadas se validan en API. Propuesta D-04: intervalos semiabiertos [inicio, fin), por aprobar.

**Datos candidatos PA:** Área, capacidad, calendario/horario, reserva, intervalo, unidad y actor.

**Dependencias PA:** B: C0/C1/C2 y catálogo de áreas de RF-02-003; O: avisos M9; I: uso de M2 hacia M10.

**Validaciones PA:** Inicio menor a fin, zona horaria acordada, área activa, asistentes dentro de capacidad y pertenencia vigente.

**Riesgo RI:** Dos lecturas de disponible seguidas de insert pueden producir doble reserva.

**Aclaración SP:** D-04: unidad de reserva, zona horaria, cancelación, duración máxima y reglas de cupo; no inventar sanciones.

| RF | Alternativa / error que debe concretarse |
|---|---|
| RF-02-001 | Fuera de horario o sin áreas: no ofrecer una disponibilidad falsa |
| RF-02-002 | Área cerrada entre consulta y envío: rechazar y actualizar disponibilidad |
| RF-02-003 | Capacidad no positiva o horario invertido: rechazar; reservas existentes requieren política explícita |

## Módulo 3: Reportes de incidencias y mantenimiento

**Objetivo/necesidad RO:** Registrar problemas con evidencia y dar seguimiento visible hasta su resolución. **Éxito RO, resumido:** Cada reporte permanece trazable con estado visible.

**Actores:** Residente, Administrador.

| RF | Fuente / caso oficial resumido | Función que se desarrollará | Aceptación propuesta |
|---|---|---|---|
| RF-03-001 | CU-03-01; CU oficial | Residente: reportar un problema con fotos y descripción y consultar estado | CA-03-001: reporte, evidencia y estado inicial persisten y se consultan solo con permiso |
| RF-03-002 | CU-03-02; CU oficial | Administrador: priorizar y asignar reportes según urgencia | CA-03-002: prioridad/asignado cambian con actor y fecha visibles y controles de permiso |
| RF-03-003 | CU-03-03; CU oficial | Residente: recibir seguimiento cuando mi reporte se resuelve | CA-03-003: cierre queda en historial y el residente recibe/consulta seguimiento de resolución |

**Reglas PA:** Guardar autor y cambios de estado; permitir consulta al actor autorizado; no marcar resuelto por simple envío del formulario. Propuesta: estados reportada/en atención/resuelta, a aprobar.

**Datos candidatos PA:** Incidencia, descripción, evidencia/foto, prioridad, asignación, seguimiento y actor.

**Dependencias PA:** B: C0/C1/C2; P: C3 archivos y M9; I: M10 consume estados.

**Validaciones PA:** Descripción no vacía, evidencia accesible y de tipo/tamaño aprobado, asignado válido y transición admitida.

**Riesgo RI:** Adjuntos perdidos/expuestos o cambio de estado sin historial.

**Aclaración SP:** D-05: responsables posibles, estados y evidencia de resolución; política de archivos.

| RF | Alternativa / error que debe concretarse |
|---|---|
| RF-03-001 | Carga inválida o interrumpida: error recuperable, sin evidencia huérfana publicada |
| RF-03-002 | Asignado fuera del ámbito o transición inválida: rechazar sin perder historial |
| RF-03-003 | Repetir cierre: no duplicar aviso; receptor ajeno no obtiene información |

## Módulo 4: Control de acceso de visitas

**Objetivo/necesidad RO:** Preautorizar visitas y registrar entradas/salidas con conocimiento de presentes. **Éxito RO, resumido:** Seguridad sabe quién está dentro y por qué sin depender de papel.

**Actores:** Residente, Personal de seguridad.

| RF | Fuente / caso oficial resumido | Función que se desarrollará | Aceptación propuesta |
|---|---|---|---|
| RF-04-001 | CU-04-01; CU oficial | Residente: preautorizar un visitante antes de que llegue | CA-04-001: preautorización queda vinculada a su unidad y consultable por seguridad del ámbito |
| RF-04-002 | CU-04-02; CU oficial | Personal de seguridad: registrar entrada y salida de cualquier visitante, autorizado o no | CA-04-002: ambos tipos se registran con motivo, actor y tiempos; salida cierra estancia correcta |
| RF-04-003 | CU-04-03; CU oficial | Personal de seguridad: consultar quién está dentro como visita en el momento | CA-04-003: lista coincide con estancias abiertas y refleja cambios en latencia acordada D-06 |

**Reglas PA:** Seguridad registra entrada y salida de visitas autorizadas o no. No crear dos estancias abiertas por repetición. La consulta de presentes deriva entradas sin salida.

**Datos candidatos PA:** Visita prevista, visitante mínimo, unidad anfitriona, autorización y movimientos de acceso.

**Dependencias PA:** B: C0/C1/C2; O: M9; sin dependencia obligatoria de paquetería.

**Validaciones PA:** Identificación mínima/propósito, unidad válida, orden temporal y actor seguridad; datos personales mínimos acordados.

**Riesgo RI:** Salida sin entrada, duplicados y exposición de datos de visitantes.

**Aclaración SP:** D-06: qué significa autorizado o no y facultad de admitir; identidad y retención. No asumir que el sistema debe denegar toda visita no preautorizada.

| RF | Alternativa / error que debe concretarse |
|---|---|
| RF-04-001 | Fecha/datos inválidos o unidad ajena: rechazar |
| RF-04-002 | Doble envío no abre dos estancias; salida sin entrada es tratada por política explícita |
| RF-04-003 | Sin visitantes: vacía; residente no obtiene lista global |

## Módulo 5: Paquetería

**Objetivo/necesidad RO:** Registrar recepción, avisar y entregar paquetes a destinatario correcto. **Éxito RO, resumido:** El paquete no se pierde ni se entrega a una persona equivocada.

**Actores:** Personal de seguridad, Residente.

| RF | Fuente / caso oficial resumido | Función que se desarrollará | Aceptación propuesta |
|---|---|---|---|
| RF-05-001 | CU-05-01; CU oficial | Personal de seguridad: registrar llegada de paquete para una unidad | CA-05-001: paquete queda recibido con unidad, referencia, fecha y actor |
| RF-05-002 | CU-05-02; CU oficial | Residente: enterarme de un paquete recibido | CA-05-002: aviso aparece en bandeja del destinatario vinculado a la unidad y referencia del paquete |
| RF-05-003 | CU-05-03; CU oficial | Residente: ver historial y paquetes no recogidos | CA-05-003: pendientes e historial se derivan del estado real de paquetes de sus unidades |
| RF-05-004 | CE-05; Criterio de éxito oficial; operación derivada propuesta | Personal de seguridad: entregar el paquete solo a persona autorizada y dejar evidencia | CA-05-004: retiro valida receptor según D-07 y deja actor, fecha y receptor; segundo retiro no cambia historial |

**Reglas PA:** Recibido/entregado con historial; verificar facultad de quien retira según D-07. Una entrega no puede registrarse dos veces.

**Datos candidatos PA:** Paquete, unidad, recepción, destinatarios, estado y entrega con receptor/actor/fecha.

**Dependencias PA:** B: C0/C1/C2; P: M9; no necesita M4 terminado.

**Validaciones PA:** Unidad, referencia de paquete, persona receptora y estado entregable; seguridad solo ámbito permitido.

**Riesgo RI:** Paquete asignado a unidad incorrecta o entrega duplicada sin identidad.

**Aclaración SP:** D-07: prueba de autorización/identidad de retiro, delegados y evidencias.

| RF | Alternativa / error que debe concretarse |
|---|---|
| RF-05-001 | Unidad inexistente o referencia repetida según política: error sin duplicado |
| RF-05-002 | Reintento de producción no duplica; usuario ajeno no ve aviso |
| RF-05-003 | Sin paquetes: vacío; cambio de pertenencia sigue política aprobada |
| RF-05-004 | Receptor no autorizado o doble envío: sin entrega indebida |

## Módulo 6: Asambleas y votaciones digitales

**Objetivo/necesidad RO:** Convocar decisiones colectivas con voto por unidad y resultado auditable. **Éxito RO, resumido:** Una unidad no vota más de una vez por tema y el resultado puede comprobarse.

**Actores:** Administrador, Residente.

| RF | Fuente / caso oficial resumido | Función que se desarrollará | Aceptación propuesta |
|---|---|---|---|
| RF-06-001 | CU-06-01; CU oficial | Administrador: convocar asamblea con agenda de temas a votar | CA-06-001: convocatoria y temas quedan consultables para destinatarios habilitados con ventana definida |
| RF-06-002 | CU-06-02; CU oficial | Residente: emitir un voto por unidad en cada tema | CA-06-002: unidad/tema acepta un único voto válido aun con dos residentes y solicitudes simultáneas |
| RF-06-003 | CU-06-03; CU oficial | Administrador: consultar resultado claro y auditable | CA-06-003: totales coinciden con votos válidos y evidencia permite verificar conteo sin exponer más datos que D-08 |

**Reglas PA:** La unicidad es unidad+tema, no usuario+tema. Verificar representante/ámbito antes de escribir y garantizar atomicidad bajo concurrencia. Propuesta: un voto emitido no se edita.

**Datos candidatos PA:** Asamblea, agenda/tema, opciones, periodo de votación, unidad habilitada, voto y evidencia.

**Dependencias PA:** B: C0/C1/C2 con pertenencia N:M; P: M9 para convocatoria si se acuerda; I: participación hacia M10.

**Validaciones PA:** Asamblea/tema vigentes, opción válida, unidad habilitada y actor facultado.

**Riesgo RI:** Dos residentes de una misma unidad votan simultáneamente o se altera un resultado.

**Aclaración SP:** D-08: representación, elegibilidad, quorum, empate, privacidad del voto y cierre; no inventar ponderaciones.

| RF | Alternativa / error que debe concretarse |
|---|---|
| RF-06-001 | Agenda vacía o ventana invertida: rechazar; comunicación cumple política D-08 |
| RF-06-002 | Tema cerrado, otra unidad u opción ajena: rechazar sin voto |
| RF-06-003 | Sin votos: resultado cero; usuario sin facultad de auditoría no accede al detalle |

## Módulo 7: Anuncios y comunicados

**Objetivo/necesidad RO:** Publicar información oficial relevante para todos o una torre/sección. **Éxito RO, resumido:** La información oficial relevante tiene canal y evidencia de comunicación a su audiencia.

**Actores:** Administrador, Residente.

| RF | Fuente / caso oficial resumido | Función que se desarrollará | Aceptación propuesta |
|---|---|---|---|
| RF-07-001 | CU-07-01; CU oficial | Administrador: publicar comunicados para todos o torre/sección | CA-07-001: contenido y audiencia persisten y se distribuye solo al ámbito elegido con evidencia D-09 |
| RF-07-002 | CU-07-02; CU oficial | Residente: ver comunicados relevantes para mi unidad | CA-07-002: lista y detalle solo incluyen audiencia aplicable; comunicación se demuestra con evidencia acordada |

**Reglas PA:** Audiencia se verifica también al acceder por ID. Publicado conserva referencia y fecha; definir audiencia dinámica o foto al publicar.

**Datos candidatos PA:** Comunicado, contenido, ámbito, destinatarios y evidencia de publicación/lectura propuesta.

**Dependencias PA:** B: C0/C1/C2 y torre/sección; P: M9.

**Validaciones PA:** Contenido no vacío, torre del condominio y permiso administrativo.

**Riesgo RI:** Filtrado solo en UI o afirmar que notificación prueba lectura humana.

**Aclaración SP:** D-09: evidencia exigida de recepción/lectura, edición y audiencia histórica.

| RF | Alternativa / error que debe concretarse |
|---|---|
| RF-07-001 | Torre ajena o contenido vacío: rechazar sin difusión |
| RF-07-002 | Enlace a comunicado fuera de audiencia: sin contenido |

## Módulo 8: Directorio de residentes

**Objetivo/necesidad RO:** Facilitar contacto entre vecinos respetando datos que cada residente decide compartir. **Éxito RO, resumido:** No se expone información que el residente eligió no compartir.

**Actores:** Residente.

| RF | Fuente / caso oficial resumido | Función que se desarrollará | Aceptación propuesta |
|---|---|---|---|
| RF-08-001 | CU-08-01; CU oficial | Residente: decidir si aparezco y qué datos comparto | CA-08-001: preferencias por actor autorizado gobiernan campos y aparición, también después de cambiarse |
| RF-08-002 | CU-08-02; CU oficial | Residente: buscar contacto de otro vecino respetando sus preferencias | CA-08-002: búsqueda y detalle solo revelan datos voluntarios de vecinos del ámbito permitido |

**Reglas PA:** Propuesta de privacidad: no aparecer por defecto; solo devolver campos autorizados desde API, incluso búsqueda/detalle. Preferencias deben aplicarse al dejar de compartir.

**Datos candidatos PA:** Perfil de contacto y preferencias por residente/ámbito, opt-in y campos visibles.

**Dependencias PA:** B: C0/C1/C2; O: M9 si se desea, no requerido para directorio.

**Validaciones PA:** Contacto válido, dueño de perfil, filtros y pertenencia al ámbito.

**Riesgo RI:** Caché conserva datos ocultados o búsqueda expone campos no autorizados.

**Aclaración SP:** D-10: campos, ámbito y política de visibilidad para residente con varias unidades.

| RF | Alternativa / error que debe concretarse |
|---|---|
| RF-08-001 | Editar perfil ajeno o campo inválido: rechazar |
| RF-08-002 | No opt-in o dato oculto: no aparece ni se filtra por consulta directa |

## Módulo 9: Notificaciones

**Objetivo/necesidad RO:** Concentrar avisos relevantes y ofrecer servicio común de envío a persona o grupo. **Éxito RO, resumido:** Una sola bandeja y contrato de notificación para los procesos del sistema.

**Actores:** Residente, Servicio interno productor.

| RF | Fuente / caso oficial resumido | Función que se desarrollará | Aceptación propuesta |
|---|---|---|---|
| RF-09-001 | CU-09-01; CU oficial | Residente: recibir en un lugar avisos relevantes de cuotas, paquetes y comunicados | CA-09-001: bandeja muestra eventos reales de los tres ejemplos oficiales, solo propios, con referencias navegables autorizadas |
| RF-09-002 | CU-09-02; CU oficial | Servicio interno productor: avisar a un residente o grupo mediante lógica compartida | CA-09-002: productores usan un contrato común, resuelven grupo autorizado y persisten entrega sin duplicación; política de fallo definida |

**Reglas PA:** Separar evento de sus destinatarios; no notificar otra unidad por ID del cliente. Propuesta de idempotencia: evento+destinatario. Productores reales deben conectarse.

**Datos candidatos PA:** Notificación/evento, destinatarios, referencia de recurso, fecha, lectura y clave de idempotencia propuesta.

**Dependencias PA:** B: C0/C1/C2 y contrato de eventos; P: integración M1/M3/M5/M7/M6; no requiere esos módulos terminados para construir bandeja.

**Validaciones PA:** Productor autorizado, grupo del ámbito, recurso referenciado y usuario destinatario.

**Riesgo RI:** Avisos perdidos por fallo entre operación y envío; duplicados o difusión fuera de grupo.

**Aclaración SP:** D-11: eventos obligatorios, latencia, retención y qué canales; proponer bandeja interna sin exigir email/SMS.

| RF | Alternativa / error que debe concretarse |
|---|---|
| RF-09-001 | Bandeja vacía, evento duplicado o recurso ya no accesible: manejar sin filtrar datos |
| RF-09-002 | Reintento, grupo vacío o destinatario ajeno: resultado trazable, sin éxito falso |

## Módulo 10: Reportes financieros y analíticos para administración

**Objetivo/necesidad RO:** Consolidar salud financiera, ocupación, incidencias y participación para decisiones informadas. **Éxito RO, resumido:** Administración/mesa puede tomar decisiones usando datos reales de los módulos.

**Actores:** Administrador.

| RF | Fuente / caso oficial resumido | Función que se desarrollará | Aceptación propuesta |
|---|---|---|---|
| RF-10-001 | CU-10-01; CU oficial | Administrador: consultar morosidad, uso de áreas e incidencias abiertas consolidadas | CA-10-001: tres indicadores coinciden con fuentes reales y mismo ámbito/periodo; cero datos se distingue de fuente fallida |
| RF-10-002 | CU-10-02; CU oficial | Administrador: compartir información con mesa directiva o residentes en asamblea | CA-10-002: destinatarios o salida aprobada reciben reporte con corte/periodo sin datos que no pueden consultar |
| RF-10-003 | NE-10; Necesidad de negocio oficial, además de ejemplos de CU | Administrador: consultar participación en votaciones junto a las demás métricas | CA-10-003: participación usa votos/unidades elegibles con denominador documentado y coincide con M6 |

**Reglas PA:** No crear saldos alternos ni guardar un resultado como fuente financiera. Definir morosidad, ocupación y participación con productores; mostrar fecha/corte.

**Datos candidatos PA:** Consultas/métricas derivadas, periodo, ámbito, fuentes y captura de reporte si se comparte.

**Dependencias PA:** B: C0/C1/C2; I: M1/M2/M3/M6 para aceptación real; P: M7 o salida imprimible para compartir; no bloquear diseño por esos datos.

**Validaciones PA:** Periodo válido, fuente coherente, permisos del administrador y audiencia al compartir.

**Riesgo RI:** Dashboard con datos ficticios, denominadores inconsistentes o exposición de finanzas individuales.

**Aclaración SP:** D-12: fórmulas, periodo, contenido autorizado al compartir y modalidad aceptada de compartir.

| RF | Alternativa / error que debe concretarse |
|---|---|
| RF-10-001 | Fuente no disponible: mostrar limitación, no reemplazar por cero |
| RF-10-002 | Sin permiso, enlace caducado si aplica o audiencia inválida: rechazar |
| RF-10-003 | Sin elegibles: no dividir entre cero ni mostrar porcentaje engañoso |

## Matriz completa de trazabilidad

Un RF tiene historia homónima HU y prueba PR; todos son identificadores de planificación, no tests implementados.

| Requerimiento | Caso / origen | Módulo | Criterio | Prueba propuesta | Historia |
|---|---|---|---|---|---|
| RF-01-001 | CU-01-01 | M1 | CA-01-001 | PR-01-001 | HU-01-001 |
| RF-01-002 | CU-01-01 | M1 | CA-01-002 | PR-01-002 | HU-01-002 |
| RF-01-003 | CU-01-02 | M1 | CA-01-003 | PR-01-003 | HU-01-003 |
| RF-01-004 | CU-01-03 | M1 | CA-01-004 | PR-01-004 | HU-01-004 |
| RF-02-001 | CU-02-01 | M2 | CA-02-001 | PR-02-001 | HU-02-001 |
| RF-02-002 | CU-02-02 | M2 | CA-02-002 | PR-02-002 | HU-02-002 |
| RF-02-003 | CU-02-03 | M2 | CA-02-003 | PR-02-003 | HU-02-003 |
| RF-03-001 | CU-03-01 | M3 | CA-03-001 | PR-03-001 | HU-03-001 |
| RF-03-002 | CU-03-02 | M3 | CA-03-002 | PR-03-002 | HU-03-002 |
| RF-03-003 | CU-03-03 | M3 | CA-03-003 | PR-03-003 | HU-03-003 |
| RF-04-001 | CU-04-01 | M4 | CA-04-001 | PR-04-001 | HU-04-001 |
| RF-04-002 | CU-04-02 | M4 | CA-04-002 | PR-04-002 | HU-04-002 |
| RF-04-003 | CU-04-03 | M4 | CA-04-003 | PR-04-003 | HU-04-003 |
| RF-05-001 | CU-05-01 | M5 | CA-05-001 | PR-05-001 | HU-05-001 |
| RF-05-002 | CU-05-02 | M5 | CA-05-002 | PR-05-002 | HU-05-002 |
| RF-05-003 | CU-05-03 | M5 | CA-05-003 | PR-05-003 | HU-05-003 |
| RF-05-004 | CE-05 | M5 | CA-05-004 | PR-05-004 | HU-05-004 |
| RF-06-001 | CU-06-01 | M6 | CA-06-001 | PR-06-001 | HU-06-001 |
| RF-06-002 | CU-06-02 | M6 | CA-06-002 | PR-06-002 | HU-06-002 |
| RF-06-003 | CU-06-03 | M6 | CA-06-003 | PR-06-003 | HU-06-003 |
| RF-07-001 | CU-07-01 | M7 | CA-07-001 | PR-07-001 | HU-07-001 |
| RF-07-002 | CU-07-02 | M7 | CA-07-002 | PR-07-002 | HU-07-002 |
| RF-08-001 | CU-08-01 | M8 | CA-08-001 | PR-08-001 | HU-08-001 |
| RF-08-002 | CU-08-02 | M8 | CA-08-002 | PR-08-002 | HU-08-002 |
| RF-09-001 | CU-09-01 | M9 | CA-09-001 | PR-09-001 | HU-09-001 |
| RF-09-002 | CU-09-02 | M9 | CA-09-002 | PR-09-002 | HU-09-002 |
| RF-10-001 | CU-10-01 | M10 | CA-10-001 | PR-10-001 | HU-10-001 |
| RF-10-002 | CU-10-02 | M10 | CA-10-002 | PR-10-002 | HU-10-002 |
| RF-10-003 | NE-10 | M10 | CA-10-003 | PR-10-003 | HU-10-003 |

La descripción ejecutable de cada prueba está en [10-plan-pruebas.md](10-plan-pruebas.md); el backlog completo en [06-backlog-general.md](06-backlog-general.md). Ningún RF está marcado como implementado.
