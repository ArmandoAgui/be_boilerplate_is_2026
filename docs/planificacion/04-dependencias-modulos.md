# Dependencias y orden de implementación

> Edición para revisión en el fork, publicada por solicitud posterior del equipo. La arquitectura, estimaciones y asignaciones siguen siendo propuestas. Las referencias a conservación local, ausencia de commits/push y «esta ejecución» describen la etapa de planificación anterior; esta publicación posterior incorpora la documentación sin modificar aplicación ni protecciones.

**Estado:** planificación propuesta, no implementación ni decisiones aprobadas. **Alcance confirmado por el equipo:** diez módulos más adaptación de autenticación; cinco integrantes; cuatro semanas.

## Clasificación

**B bloqueante:** debe existir contrato/capacidad antes de integrar el flujo dependiente. **P parcial:** permite avanzar con contrato/doble, pero aceptación exige integración real de esa parte. **O opcional:** solo mejora adicional, sin reemplazar un caso obligatorio. **I integración posterior:** consumidor puede desarrollarse con fixtures acordados; aceptación final requiere conectar datos reales. La matriz es de diseño, no imports existentes.

## Bases comunes antes de paralelizar

| Base | Capacidad | Bloqueo que resuelve | Historia |
|---|---|---|---|
| C0 | Usuario, condominio, torre/unidad y pertenencia N:M | Identidad de registros y destinatarios de los diez módulos | HU-T-03 |
| C1 | Sesión y permisos por rol/recurso | Acceso real autorizado, no solo UI | HU-T-04/05 |
| C2 | Contratos API, errores, tiempo/moneda, migraciones y lectura/eventos | Evitar modelos y clientes incompatibles | HU-T-02/07 |
| C3 | Fotos con permisos y persistencia | Evidencia requerida por incidencias | HU-T-06 |
| C4 | Despliegue temprano | Compatibilidad y demo posterior | HU-T-08 |

Cada módulo tiene B sobre C0/C1/C2 para su aceptación. Puede diseñarse/testearse con contratos antes, sin fingir que esos dobles son integración final. M3 además tiene B sobre C3 para aceptar fotos. C4 no bloquea programación local, pero sí entrega accesible.

## Matriz de diez módulos

Fila es el módulo que debe considerar la capacidad/datos de la columna. Las relaciones I hacia M10 en productores señalan contrato/evidencia para integración con reportes, no que M1 deba esperar a M10 para operar. No son dependencias de ejecución bidireccionales.

| Consume / integra | M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 | M9 | M10 |
|---|---|---|---|---|---|---|---|---|---|---|
| M1 Cuotas y pagos de mantenimiento | — | · | · | · | · | · | · | · | P | I |
| M2 Reservas de áreas comunes | · | — | · | · | · | · | · | · | O | I |
| M3 Reportes de incidencias y mantenimiento | · | · | — | · | · | · | · | · | P | I |
| M4 Control de acceso de visitas | · | · | · | — | · | · | · | · | O | · |
| M5 Paquetería | · | · | · | · | — | · | · | · | P | · |
| M6 Asambleas y votaciones digitales | · | · | · | · | · | — | · | · | P | I |
| M7 Anuncios y comunicados | · | · | · | · | · | · | — | · | P | · |
| M8 Directorio de residentes | · | · | · | · | · | · | · | — | O | · |
| M9 Notificaciones | I | · | I | · | I | I | I | · | — | · |
| M10 Reportes financieros y analíticos para administración | I | I | I | · | · | I | O | · | O | — |

M9 puede construirse primero con evento/destinatario/ref sin tener productores completos. M1/M3/M5/M7 consumen después ese contrato (P); M9 integra eventos reales de sus productores al aceptar CU-09-01 (I). Esto no establece un ciclo de arranque. M6 incluye convocatoria vía comunicación que debe concretarse; se propone M9 para reutilizar canal, no un proveedor externo obligatorio.

M10 depende de M1/M2/M3/M6 **para aceptación con datos reales**, aunque su consulta/DTO/pantalla pueden desarrollarse antes. Compartir reportes es obligatorio; dependencia de M7 es O porque el medio mínimo aprobado puede ser una salida imprimible/archivo autorizado. Directorio es una preferencia de presentación: C0 no depende de M8.

## Orden y paralelismo

1. Días iniciales: HU-T-01/02, contrato C0/C1 y de M9; acordar moneda/fechas, rol/ámbito y datos base. Cada dueño define contrato del dominio en paralelo.
2. Semana 1: implementar bases HU-T-03/04/05/06/07 y servicio HU-09-002; preparar primer despliegue y una notificación/flujo real pequeño según capacidad.
3. Semana 2: cinco frentes verticales simultáneos: Armando M1/M8, Heber M2/M7, Serrato M3 y bandeja M9, Yael M4/M5, Guille M6 y consultas preliminares M10. Una persona no desarrolla dos historias a la vez: alterna según bloqueo y prioridad.
4. Semana 3: completar M6, seguimiento M3, avisos M5 y productores de cuota por vencer/comunicado; conectar reportes a los cuatro productores y compartir resultados. Verificar cobertura de los 29 RF.
5. Semana 4: aceptación, concurrencia, aislamiento, regresión, demo y evidencia. No posponer primera integración hasta semana 4.

## Interfaces que deben estabilizarse temprano

- Contexto: obtener actor autenticado, roles del condominio, unidades vigentes y representación habilitada, sin aceptar pertenencia del cliente como autoridad.
- M9: solicitar aviso mediante tipo/origen/clave de evento y resolver destinatarios de ámbito; devolver resultado trazable, no promesa silenciosa.
- M1→M10: saldo y mora con corte/moneda; M2→M10: ocupación y capacidad/ventana usada; M3→M10: estados abiertos; M6→M10: votos y unidades elegibles. Fórmulas en D-12.
- Archivos: registrar referencia y metadata, consultar con autorización del recurso y limpiar fallos; sin compartir rutas de filesystem al navegador.

Ver [08-cronograma.md](08-cronograma.md) para esfuerzo y criterio de salida. Todas las dependencias de aceptación deben validarse con datos reales; fixtures ayudan a programar, no sirven como entrega final.
