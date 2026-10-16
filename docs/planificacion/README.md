# Planificación integral de la plataforma de condominios

> Edición para revisión en el fork, publicada por solicitud posterior del equipo. La arquitectura, estimaciones y asignaciones siguen siendo propuestas. Las referencias a conservación local, ausencia de commits/push y «esta ejecución» describen la etapa de planificación anterior; esta publicación posterior incorpora la documentación sin modificar aplicación ni protecciones.

**Estado:** planificación propuesta, no implementación ni decisiones aprobadas. **Alcance confirmado por el equipo:** diez módulos más adaptación de autenticación; cinco integrantes; cuatro semanas.

## Propósito y autoridad

Esta carpeta reúne planificación del alcance completo: diez módulos y adaptación de autenticación para Armando, Heber, Guille, Serrato y Yael en cuatro semanas. No contiene implementación. RO/HV/PA/SP/RI distinguen requisito oficial, hallazgo verificado, propuesta, supuesto y riesgo. El PDF es fuente de negocio; el alcance completo lo confirma el equipo y su diferencia con el reparto general se registra D-01.

## Archivos y ruta de lectura

| Orden / archivo | Propósito |
|---|---|
| [00-resumen-ejecutivo.md](00-resumen-ejecutivo.md) | Panorama, alcance y viabilidad |
| [01-alcance-y-requerimientos.md](01-alcance-y-requerimientos.md) | 29 RF, 26 CU y matriz completa de trazabilidad |
| [02-arquitectura-propuesta.md](02-arquitectura-propuesta.md) | Monolito modular, capas y diagramas |
| [03-modelo-datos-conceptual.md](03-modelo-datos-conceptual.md) | Entidades/cardinalidades/dueños y ER, sin schema definitivo |
| [04-dependencias-modulos.md](04-dependencias-modulos.md) | Matriz B/P/O/I y paralelismo |
| [05-mvp-por-modulo.md](05-mvp-por-modulo.md) | Obligatorio, implementación mínima, opcional y demo de cada módulo |
| [06-backlog-general.md](06-backlog-general.md) | Épicas, 41 historias esenciales y tareas con aceptación/esfuerzo |
| [07-distribucion-equipo.md](07-distribucion-equipo.md) | Alternativas, estrategia híbrida, carga y RACI |
| [08-cronograma.md](08-cronograma.md) | Capacidad, hitos semanales y Gantt ilustrativo |
| [09-estrategia-github.md](09-estrategia-github.md) | Flujo de colaboración y publicación futura sin configurar |
| [10-plan-pruebas.md](10-plan-pruebas.md) | 29 pruebas funcionales, 14 críticas y 8 transversales propuestas |
| [11-riesgos-y-decisiones.md](11-riesgos-y-decisiones.md) | Riesgos y 14 decisiones pendientes |
| [12-agenda-primera-reunion.md](12-agenda-primera-reunion.md) | Agenda de 90 minutos y acta de acuerdos |

Para primera reunión: leer 00 → 07 → 08 → 11 → 12; cada dueño revisa RF/MVP de sus dos módulos. Para implementación futura: 01 → 02 → 03 → 04 → 05 → 06 → 10. Git: 09 antes de publicar o cambiar protecciones.

## Guía técnica existente

[guia-tecnica-y-backlog-condominios.md](guia-tecnica-y-backlog-condominios.md) conserva el análisis técnico detallado y recibe correcciones de alcance. Su backlog PRE/MOD/ENT es orientativo/histórico: el backlog vigente con esfuerzo es 06 y no se suman los dos. Los doce análisis dentro de docs en los repositorios siguen siendo evidencia técnica y solo se corrigen afirmaciones de alcance; no se copia todo ese diagnóstico a estos nuevos archivos.

Los identificadores RF, HU, CA, PR y D permiten enlazar caso/aceptación/prueba/decisión. Ningún ID es código o test ya implementado. Todas las estimaciones/asignaciones/fechas son propuestas salvo el alcance interno de diez módulos confirmado.

## Publicación y cambios

La carpeta está fuera de los repositorios: no se publica automáticamente. No se crea otro repo. Esta entrega no hace commit/push/PR ni cambia protecciones o aplicación. Ver 09 para propuesta de incorporación futura al fork backend canónico y enlace desde frontend, con autorización y verificación de destino antes de actuar.

Se comprueban enlaces locales, trazabilidad de los 29 RF y 26 CU, cobertura de diez módulos, sumas de esfuerzo/capacidad y cambios limitados a Markdown. No se ejecuta prueba de aplicación ni se declara que el plan esté implementado. Correcciones locales de alcance en repos quedan sin commit para revisión.

## Resultado de la revisión documental

Revisión local completada: 26 CU oficiales identificados, 29 RF cubiertos en requerimientos/MVP/backlog/pruebas y 41 historias esenciales; 51 pruebas propuestas (29 funcionales, 14 críticas, 8 transversales). Estimación y sumas verificadas: 392 h base +98 h reserva =490 h; semanas base 110/104/128/50 h. Se revisaron 294 enlaces de 27 Markdown y estructura de tablas/bloques; esto no equivale a renderizar Mermaid ni ejecutar tests de aplicación.

Correcciones de alcance locales sin commit: backend `docs/00-resumen-ejecutivo.md`, `docs/02-arquitectura-backend.md`, `docs/06-riesgos-y-recomendaciones.md`, `docs/07-propuesta-plataforma-condominios.md`; frontend `docs/04-integracion-backend.md`; además guía consolidada local. Los archivos de aplicación no cambiaron. HEAD/main, remotos y protecciones locales permanecen; se comprobó por lectura que main de ambos forks/originales y las ramas remotas de documentación conservan los SHA anteriores. No se efectuó commit, push, PR, merge o cambio de reglas/configuración.

## Ubicación de esta edición

Repositorio canónico: `ArmandoAgui/be_boilerplate_is_2026`, rama `docs/analisis-inicial`, carpeta `docs/planificacion/`. Esta edición incorpora los catorce documentos de planificación y la guía técnica consolidada; los enlaces al código se adaptaron a su ubicación publicada. El original de trabajo sigue en la carpeta local documentacion. El frontend enlaza esta misma edición para evitar otra copia mantenida en paralelo.

La solicitud de publicación autoriza subir los documentos, no aprueba automáticamente las decisiones de arquitectura ni inicia desarrollo. No se crean PR, se modifica main o se alteran hooks. El estado sin commits descrito en el registro anterior corresponde al cierre de planificación, previo a esta publicación.
