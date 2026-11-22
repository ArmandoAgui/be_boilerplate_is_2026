# Pruebas de componente de H2, H29 y H30

Suites Jest del backend con los criterios de aceptación de Heber del sprint 2. Cada `describe` lleva el ID y título de la historia y cada `it` empieza con `ACn:`, en el orden de los criterios de la tarjeta Jira (primero Frontend, luego Backend). Usan dobles del repositorio y de los servicios: no se conectan a PostgreSQL.

| Historia | Archivo | Criterios |
|---|---|---|
| H2. Pagar una cuota pendiente | `src/pagos/services/pagos.entrega.spec.ts` | AC4 a AC7 |
| H29. Consultar indicadores consolidados | `src/reportes/services/reportes.entrega.spec.ts` | AC3 a AC6 |
| H30. Compartir resultados administrativos | `src/reportes/services/reporte-pdf.entrega.spec.ts` | AC3 a AC6 |

Los criterios de interfaz (H2 AC1 a AC3, H29 AC1 y AC2, H30 AC1 y AC2) están en las suites del frontend. En el plan de pruebas, backend y frontend de una historia se registran como un solo caso de componente.

## Ejecución

```sh
npm test
npm run test:componentes-entrega -- --testNamePattern='H2\.' --verbose
```

Cambiar `H2` por `H29` o `H30` para la suite de cada historia. `npm test` ejecuta primero la regresión de Vitest (incluidas las pruebas previas de pagos y reportes) y después estas suites con Jest.

## Alcance

- H2 AC2 (espera de 2 segundos y botón "Procesando…") se prueba en el frontend; aquí la pasarela se usa sin espera.
- H30 AC6 (401 sin sesión) lo aplica el guard global de autenticación y se verifica en la prueba manual de integración.
- Bloqueo de fila y solicitudes simultáneas requieren PostgreSQL real: no se demuestran con dobles.
