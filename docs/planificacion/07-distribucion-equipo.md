# Distribución de responsabilidades y RACI

> Edición para revisión en el fork, publicada por solicitud posterior del equipo. La arquitectura, estimaciones y asignaciones siguen siendo propuestas. Las referencias a conservación local, ausencia de commits/push y «esta ejecución» describen la etapa de planificación anterior; esta publicación posterior incorpora la documentación sin modificar aplicación ni protecciones.

**Estado:** planificación propuesta, no implementación ni decisiones aprobadas. **Alcance confirmado por el equipo:** diez módulos más adaptación de autenticación; cinco integrantes; cuatro semanas.

## Propuesta sujeta a aprobación de los cinco

No se conocen fortalezas, experiencia ni disponibilidad. Los nombres son responsables propuestos, no contribuciones realizadas. Las horas de dueño son aproximación de coordinación; cada historia incluye pruebas/integración y puede ejecutarse con apoyo cruzado. Acordar disponibilidad antes de asignar tarjetas.

## Alternativa A: dos módulos por persona, de extremo a extremo

| Integrante | Módulos principales | Dominio base (h) | Revisión cruzada |
|---|---|---|---|
| Armando | M1 Cuotas y pagos de mantenimiento, M8 Directorio de residentes | 56 | M1 por Guille; M8 por Serrato |
| Heber | M2 Reservas de áreas comunes, M7 Anuncios y comunicados | 42 | M2 por Serrato; M7 por Armando |
| Guille | M6 Asambleas y votaciones digitales, M10 Reportes financieros y analíticos para administración | 54 | M6 por Heber; M10 por Yael |
| Serrato | M3 Reportes de incidencias y mantenimiento, M9 Notificaciones | 48 | M3 por Yael; M9 por Heber |
| Yael | M4 Control de acceso de visitas, M5 Paquetería | 50 | M4 por Armando; M5 por Guille |

Los pares compensan complejidad: pagos con directorio; reservas con comunicados; votaciones/reportes comparten datos pero son revisados por personas distintas; incidencias/notificaciones comparten eventos; visitas/paquetes comparten contexto de seguridad. No suponen cargas iguales por módulo.

## Alternativa B: especialidades con trabajo compartido

| Integrante | Especialidad propuesta | Aporte y riesgo |
|---|---|---|
| Armando | Contratos y coordinación de integración | Revisar cambios entre repos y alcance; no integrar todo por los demás |
| Heber | Backend/API y entorno | Apoyar casos transaccionales y despliegue; riesgo de cola de endpoints |
| Guille | Datos y migraciones | Revisar esquema/consistencia; riesgo de centralizar toda modificación de datos |
| Serrato | Frontend y sesión Next | Patrones de formularios/errores; riesgo de cola de pantallas y autenticación |
| Yael | QA, acceso y evidencia | Ayudar a preparar casos y demo; riesgo de dejar todas las pruebas para una persona |

## Comparación y recomendación

| Criterio | A: módulos | B: especialidades |
|---|---|---|
| Ventaja | Cinco flujos verticales; responsabilidad visible | Patrones consistentes y aprendizaje focalizado |
| Desventaja | Puede divergir estilo/contrato sin revisión | Entregas parciales por capa y esperas entre personas |
| Integración | Cada dueño integra su flujo y coordina contratos | Requiere sincronizar API/datos/UI frecuentemente |
| Dependencia | Baja después de estabilizar base; riesgo de bus factor del módulo | Alta si todos esperan a frontend, datos o QA |
| Paralelismo | Bueno con C0/C1/C2 definidos | Bueno al inicio, puede caer en cuellos de botella |
| Carga | No se equilibra contando dos módulos, sino horas y complejidad | Datos/QA/UI pueden recibir diez módulos a la vez |

**Recomendación PA: híbrida.** Mantener dueños verticales de alternativa A y usar especialidades como apoyo/revisión, sin exclusividad. Cada dueño entrega BD/API/UI/integración/pruebas de sus historias y el especialista ayuda a coherencia, no recibe toda la ejecución de esa capa.

## Carga orientativa y redistribución

La siguiente aproximación incluye dominio, transversales según responsable inicial y 10 h de cierre por integrante. La reserva se comparte y no se considera trabajo ya asignado.

| Integrante | Base inicial h | Apoyo/traspaso propuesto (horas de ejecución) | Base ajustada h | Con reserva 25% h |
|---|---|---|---|---|
| Armando | 74 | +4 contexto de Guille; +10 archivos de Serrato; +2 configuración M2; −10 apoyo de Guille en M1 | 80 | 100.0 |
| Heber | 68 | +6 sesión de Serrato; +2 aceptación de Yael; +2 métricas de Guille; −2 configuración M2 a Armando | 76 | 95.0 |
| Guille | 84 | −4 contexto a Armando; +10 diseño/verificación M1; −8 reporte a Yael; −2 métricas a Heber | 80 | 100.0 |
| Serrato | 86 | −6 sesión a Heber; −10 archivos a Armando; +8 UI/pruebas entrega M5 de Yael | 78 | 97.5 |
| Yael | 80 | −2 aceptación a Heber; −8 entrega M5 a Serrato; +8 integración/compartir M10 de Guille | 78 | 97.5 |

Esto mueve trabajo, no añade horas al total. Mantener responsabilidad principal del contrato y acordar quién ejecuta las sub-tareas de apoyo. Con 35 h/persona/semana y 75% de tiempo efectivo, cada persona ofrece 105 h efectivas en cuatro semanas; 95–100 h con reserva apenas deja margen. La asignación semanal puede bloquearse aunque el total cierre: revisar disponibilidad por día y ceder tareas al terminar la base.

**Cuello por etapa explícito:** en S1 Serrato concentraría 18 h de sesión +10 h de archivos +12 h de contrato M9 =40 h, frente a 26,25 h efectivas/persona/semana del escenario. Por eso se propone que Armando ejecute los 10 h de archivos y Heber 6 h de sesión, manteniendo revisión/contratos con Serrato. Guille puede adelantar diseño/verificación de M1 tras estabilizar C0; adelantar M6/M10 desde S2 evita concentrar sus 54 h de dominio en S3. Yael recibe apoyo de Serrato en entrega M5 y después apoya compartir/integración M10. Antes de comprometer el plan, dividir esas bolsas entre sub-tareas verificables sin duplicar esfuerzo y comprobar agenda individual; los totales de cuatro semanas no bastan para garantizar secuencia.

## RACI preliminar

R ejecuta; A responde por aceptación/coordinación de esa fila; C consulta; I informado. A/R combina responsabilidad y ejecución. Hay un A por fila; no implica autoridad unilateral para cambiar alcance. Todos aprueban las decisiones compartidas en reunión.

| Responsabilidad | Armando | Heber | Guille | Serrato | Yael |
|---|---|---|---|---|---|
| M1 (incluye integración y pruebas) | A/R | C | R | C | C |
| M2 (incluye integración y pruebas) | C | A/R | C | R | C |
| M3 (incluye integración y pruebas) | C | C | C | A/R | R |
| M4 (incluye integración y pruebas) | R | C | C | C | A/R |
| M5 (incluye integración y pruebas) | C | C | R | C | A/R |
| M6 (incluye integración y pruebas) | C | R | A/R | C | C |
| M7 (incluye integración y pruebas) | R | A/R | C | C | C |
| M8 (incluye integración y pruebas) | A/R | C | C | R | C |
| M9 (incluye integración y pruebas) | C | R | C | A/R | C |
| M10 (incluye integración y pruebas) | C | C | A/R | C | R |
| C0 contexto/migraciones | R | C | A/R | C | C |
| C1 sesión y permisos | C | R | C | A/R | R |
| Entorno y despliegue | C | A/R | C | C | R |
| Consolidar evidencia de aceptación | R | R | R | R | A/R |
| Documentación y ensayo | A/R | R | R | R | R |

## Revisión y cobertura de ausencias

Cada PR tiene al menos revisor del módulo indicado, que contrasta contratos y reproduce la aceptación relevante. Un segundo revisor participa cuando cambia una entidad compartida o afecta privacidad/transacciones. Guille revisa compatibilidad de migraciones con otro dueño del cambio, no realiza todas las migraciones. La persona que revisa no aprueba una operación financiera/permiso solo porque compila.

Cada dueño documenta pasos para que el revisor pueda continuar si falta. Rotar demostración del flujo, revisión de integración y ejecución de tests; Yael consolida evidencias, no escribe/ejecuta todas las pruebas. Armando coordina, no fusiona o integra todo. Aprobación de reparto y ajustes por disponibilidad: D-14.
