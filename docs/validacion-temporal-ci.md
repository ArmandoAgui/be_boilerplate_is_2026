# Validación temporal de GitHub Actions

Fecha: 07/11/2026. Cambio solicitado por el usuario mientras un compañero continúa trabajando en el CI.

## Alcance

En los PR hacia main se ejecuta únicamente **Validación temporal (JSON y formato)**: parsear package.json/package-lock.json, comprobar que nombre/versión coincidan y ejecutar git diff --check sobre el cambio del PR. Sin instalación de dependencias ni PostgreSQL. Permisos de solo lectura y timeout de tres minutos.

No comprueba instalación reproducible, tipos, lint, compilación, funcionalidad ni integración. Su nombre y resumen no representan la aprobación del CI completo. No publica estados falsos ni sustituye aprobaciones de revisores.

El workflow completo `.github/workflows/reservas.yml` conserva todos sus pasos y queda disponible mediante workflow_dispatch (Run workflow). No se modifica ninguna protección ni lista de checks obligatorios; si una regla exige la validación completa, seguirá siendo necesaria. Para restaurar la automatización completa, devolver su evento pull_request y retirar este workflow temporal mediante otro PR.

## Ejecutar sin Actions

```bash
npm run validate:temporary
# Revisar también el diff ya confirmado respecto a un commit:
node scripts/validar-temporal.mjs --base SHA_DEL_COMMIT_BASE
```

Solo requiere Node y Git; no necesita npm ci, Docker, .env ni servicios. Funciona en Windows y Linux. En ejecución local sin base comprueba los cambios staged/unstaged y los JSON; con --base comprueba además el diff entre ese commit y HEAD. En Actions la base se obtiene del JSON del evento del PR, sin interpolar valores no confiables en comandos de shell.

## Bloqueo de facturación

GitHub rechazó las ejecuciones anteriores antes de asignar runner con el mensaje: “The job was not started because your account is locked due to a billing issue.” Un workflow más ligero **también necesita que la cuenta esté habilitada**; este cambio no elimina ni soluciona ese bloqueo.

El titular debe revisar Billing and licensing y resolver el problema indicado. Si no aparece una deuda, suscripción o problema de pago, solicitar revisión a GitHub Support. Fuente oficial: [GitHub — Desbloquear una cuenta](https://docs.github.com/en/billing/how-tos/troubleshooting/locked-account). Esta integración no tiene herramientas para modificar la facturación de la cuenta; no se cambian presupuestos, suscripciones ni métodos de pago.

Tras desbloquear la cuenta, volver a ejecutar el workflow del último commit. Hasta entonces, el resultado local se documenta como local y no como un check remoto aprobado.

## Revisión e integración

Yael (`Yael2222`) fue identificado entre los revisores del módulo y sus permisos write se verificaron en ambos forks. El PR de esta entrega solicita su revisión; la aprobación debe emitirla él.

La rama parte del módulo 2 con cancelación de 24h y depende de los PR #1 y #3 de este repositorio. El destino es main del fork; no hay merges automáticos ni cambios directos a main. Integrar la base primero. Revisar el commit propio de este PR para aislar el cambio de CI mientras main no contenga todavía el módulo.
