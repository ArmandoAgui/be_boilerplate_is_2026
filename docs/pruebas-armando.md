# Pruebas de componente de H5–H8 y H23–H24

Estas suites complementan las pruebas existentes y siguen la identificación de criterios de Jira consultada el 21/11/2026. Cada `describe` contiene el ID y título de la historia; los `it` comienzan con `ACn:`. Los archivos están junto al servicio o repositorio probado y usan dobles, sin conectarse a PostgreSQL.

## Ejecución

Con Node 24 y dependencias instaladas:

```sh
npm ci
npm run build
npm test
```

El postinstall de Prisma necesita `DATABASE_URL` para generar el cliente, incluso si las pruebas no conectan a la base. Usar la configuración local de `.env.example`; no usar credenciales de producción para estas suites. `typecheck` incluye tests e2e que importan `dist`, por eso se ejecuta después de `build` en un clon limpio.

`npm test` conserva primero la regresión existente de Vitest y después ejecuta las nuevas suites con Jest, como pide la guía del plan de pruebas. La compilación de estas suites se realiza con TypeScript y tsc-alias en `.jest-build/`, ignorado por Git y excluido del descubrimiento de Vitest. No se cambian servicios, endpoints, esquema ni migraciones.

Para la suite de una historia:

```sh
npm run test:componentes-entrega -- --testNamePattern='H5\.'
```

Cambiar H5 por H6, H7, H8, H23 o H24. El comando compila TypeScript y ejecuta Jest con soporte ESM de Node, también desde Windows sin variables de entorno en sintaxis POSIX. Configuración basada en la [guía ESM de Jest](https://jestjs.io/docs/ecmascript-modules). Para modificar la identificación de criterios, conciliar primero la historia Jira con el PO y conservar la trazabilidad.

## Archivos

- `src/reservas/services/reservas.entrega.spec.ts`: disponibilidad, solicitud, deuda, cupo, autorización, cancelación y administración.
- `src/reservas/repositories/reservas.entrega.spec.ts`: alcance personal, orden del listado, estados que consumen cupo y frontera inclusiva de cancelación.
- `src/comunicados/comunicados.entrega.spec.ts`: publicación segmentada, aviso, validación, aislamiento de audiencia y consulta sin lectura obligatoria.

El frontend aporta los criterios de interfaz mediante sus suites colocadas en `components/reservas/` y `components/comunicados/`. En el Excel, la combinación backend/frontend se registra como un caso de componente por historia. Las verificaciones de consulta del repositorio comprueban los filtros enviados al doble; no demuestran concurrencia ni persistencia real. Esas propiedades requieren las pruebas manuales de integración del plan.

## Diferencias documentales que requieren acuerdo

- H6 AC3 y AC8 describen confirmación directa. El PO y la implementación requieren solicitud `PENDIENTE` y aprobación administrativa. La competencia por un horario se resuelve al aprobar. Los tests identifican explícitamente esa regla; no certifican el texto desactualizado de Jira.
- H7 AC1 menciona solo reservas confirmadas. El sistema también permite cancelar pendientes válidas, con 24 horas o más. Aclarar esa ampliación con el equipo.

Las pruebas automatizadas no equivalen a una ejecución manual ni a aceptación por otro integrante. El plan conserva esas filas como No ejecutado hasta disponer de nombre, fecha, resultado y evidencia reales. Las pruebas nuevas llegan a develop mediante PR revisado antes de declarar cumplida la entrega.
