# Despliegue de SONNET 5 en un servidor Ubuntu

La plataforma se ejecuta en una sola máquina: Caddy recibe HTTPS, Next.js atiende el navegador y llama a NestJS; NestJS accede a PostgreSQL y a un volumen privado de fotografías. Compose inicia la base, aplica migraciones una vez y espera los healthchecks antes de abrir la web. No se publican los puertos de Next, Nest ni PostgreSQL.

Esta entrega se construye sobre los PR de integración [backend #35](https://github.com/ArmandoAgui/be_boilerplate_is_2026/pull/35) y [frontend #31](https://github.com/ArmandoAgui/fe_boilerplate_is_2026/pull/31). Los PR de Docker apuntan temporalmente a su rama de integración para mostrar solo la infraestructura. Integrar primero los cambios funcionales; actualizar las ramas de Docker con el resultado aprobado y cambiar su destino a `develop`. El script despliega **dos SHA completos aprobados que contengan Docker**, nunca la última `develop` implícitamente.

## 1. Servidor y requisitos externos

Referencia: **Ubuntu Server 24.04 LTS, x86_64, 2 vCPU, 4 GiB RAM y 30 GiB gp3**. Para compilar y conservar varias releases, preferir 40–50 GiB. Con 2 GiB solo evaluar imágenes precompiladas y tráfico pequeño: los límites de contenedores no garantizan que todo quepa. El despliegue con compilación exige al menos 3 GiB de RAM total y compila los dos proyectos secuencialmente. Medir CPU, RAM, disco y concurrencia antes de producción. EC2, disco, IPv4, dominio y S3 pueden generar cargos; no se presupone gratuidad.

Antes del bootstrap, crear y revisar manualmente:

- Instancia dedicada, llave SSH y acceso con `ubuntu`; IMDSv2 requerido y volumen EBS cifrado.
- Security Group: TCP 22 desde la IP pública del operador `/32`; TCP 80 y 443 desde Internet. **No abrir 3000, 3112, 3113 ni 5432**. Revisar IPv6 por separado si se habilita; el Compose de referencia publica IPv4. Salida necesaria para APT, GitHub, registros de imágenes, npm, DNS, ACME y S3 opcional.
- Un dominio, por ejemplo `condominio.example.com`, con registro A a la IP pública estable de la instancia. Si existe AAAA debe apuntar al servidor con conectividad IPv6 válida; retirar registros incorrectos. DNS y 80/443 deben funcionar antes del primer arranque para emitir el certificado.
- Si se requiere copia fuera del servidor: bucket S3 privado con bloqueo de acceso público, política de ciclo de vida y un IAM instance role. Ver [política mínima de escritura](../../deploy/aws/backup-policy.example.json), reemplazando bucket/prefijo. No introducir access keys en `.env`. La descarga para recuperación necesita permisos de lectura separados, concedidos al operador.

El bootstrap **no crea ni modifica recursos de AWS**, DNS o IAM. UFW no sustituye el Security Group: Docker gestiona reglas de publicación que pueden eludir UFW. Publicar únicamente Caddy es una decisión del propio Compose. En un host existente revisar reglas UFW anteriores: el script las conserva, incluyendo posibles aperturas antiguas de SSH.

## 2. Preparar Ubuntu

Obtener el backend en el **commit Docker aprobado**, revisar `deploy/bootstrap-ubuntu.sh` y conservar toda la carpeta `deploy/` junta. Ejemplo desde el servidor, sustituyendo todos los valores:

```bash
git clone https://github.com/ArmandoAgui/be_boilerplate_is_2026.git backend
cd backend
git checkout --detach SHA_COMPLETO_BACKEND_APROBADO

bash deploy/bootstrap-ubuntu.sh \
  --domain condominio.example.com --email operador@example.com \
  --admin-email administrador@example.com --ssh-cidr TU_IP_PUBLICA/32 --dry-run

sudo bash deploy/bootstrap-ubuntu.sh \
  --domain condominio.example.com --email operador@example.com \
  --admin-email administrador@example.com --ssh-cidr TU_IP_PUBLICA/32
```

Agregar `--backup-s3-bucket NOMBRE_BUCKET_PRIVADO` a ambos comandos si ya existe bucket y role. El dry-run valida parámetros y muestra el plan sin modificar el equipo; no prueba APT, DNS ni la instalación real. El script evita habilitar un firewall que excluya la IP de la sesión SSH actual.

El bootstrap instala Docker Engine, Compose y Buildx del repositorio firmado oficial cuando faltan, Python/boto3, UFW y actualizaciones de seguridad de Ubuntu sin reinicio automático. No elimina una instalación Docker anterior ni sus volúmenes. Crea configuración privada, secretos independientes, comando `sonnet5`, servicio systemd y timer de respaldo. **Todavía no inicia la aplicación** ni carga cuentas de demostración. Al repetirlo conserva secretos y rechaza parámetros de instalación contradictorios.

Rutas administradas:

| Ruta | Contenido |
|---|---|
| `/etc/sonnet5/platform.env` | Configuración no secreta, modo 0600; editar con `sudoedit` |
| `/etc/sonnet5/secrets/` | Cinco secretos, directorio 0700 de root |
| `/etc/sonnet5/condominio.json` | Torres, secciones y unidades reales |
| `/opt/sonnet5/releases/` | Fuentes y manifiesto por pareja de SHA |
| `/opt/sonnet5/current`, `previous` | Enlaces a releases controladas |
| `/var/lib/sonnet5/` | Lock de operaciones y estado auxiliar |
| `/var/backups/sonnet5/` | Copias de BD, fotos y manifiesto |

El archivo [platform.env.example](../../deploy/platform.env.example) explica las variables y [base-images.env](../../deploy/base-images.env) fija los digests. No ejecutar `source` sobre estos archivos. La herramienta los interpreta como datos. No guardar secretos en Git, argumentos de build ni imágenes.

## 3. Primera release

Reemplazar los dos SHA completos; el frontend debe contener `output: standalone` y su Dockerfile. Ambos repositorios son públicos; si dejan de serlo se debe configurar autenticación de lectura de Git sin incrustarla en URLs o scripts.

```bash
sudo sonnet5 deploy \
  --backend-sha SHA_COMPLETO_BACKEND_APROBADO \
  --frontend-sha SHA_COMPLETO_FRONTEND_APROBADO --build

sudo sonnet5 status
sudo sonnet5 logs migrate
sudo sonnet5 logs gateway
```

La herramienta clona ambos commits exactos, construye imágenes con su revisión OCI, registra sus IDs y activa una release. Verifica PostgreSQL, migraciones, API, frontend y un GET HTTPS con validación normal de certificados. Un fallo de migración detiene la cadena; no se arranca automáticamente la aplicación anterior contra un esquema potencialmente cambiado. Los contenedores unhealthy requieren investigar: Docker no reinicia solo por un healthcheck fallido, aunque sí se aplica `restart: unless-stopped` cuando termina el proceso.

La base nueva recibe las migraciones del proyecto y **un administrador inicial**; no se ejecuta `prisma db seed`. Obtener su contraseña una sola vez en la terminal privada del operador:

```bash
sudo cat /etc/sonnet5/secrets/admin_password
```

No pegar esa salida en chats, logs o PR. `sudo sonnet5 init-admin` es idempotente: una cuenta ADMIN activa existente conserva su contraseña; una cuenta del mismo correo con otro rol produce error y no se convierte en administrador. Este mecanismo es bootstrap, no recuperación ni rotación de contraseñas.

Antes de incorporar residentes, llenar `/etc/sonnet5/condominio.json` con datos reales siguiendo [condominio.example.json](../../deploy/condominio.example.json), manteniendo el archivo legible dentro del contenedor (`sudo chmod 0444 /etc/sonnet5/condominio.json`, padre privado). Por defecto está vacío para no inventar unidades.

```bash
sudoedit /etc/sonnet5/condominio.json
sudo sonnet5 init-condominio
```

La importación valida todo y usa una transacción; repetirla no duplica unidades. No mueve una unidad existente a otra sección ni elimina o reactiva históricos. La administración crea residentes, vínculos y áreas mediante los flujos de la plataforma. `CUOTA_MENSUAL_USD=50.00` es el valor inicial acordado; ajustarlo antes de generar cuotas reales.

### Imágenes precompiladas

Para evitar compilaciones en una VM pequeña, construir **desde cada commit aprobado**, para la arquitectura del servidor, publicar en un registro y proporcionar dos referencias inmutables:

```bash
# Desde el backend, ya situado en su commit aprobado:
docker buildx build --platform linux/amd64 \
  --build-arg VCS_REF=SHA_COMPLETO_BACKEND_APROBADO \
  -t ghcr.io/TU_CUENTA/sonnet5-api:SHA_COMPLETO_BACKEND_APROBADO --push .
# Repetir en frontend con su Dockerfile, SHA y nombre sonnet5-web.

sudo sonnet5 deploy \
  --backend-sha SHA_COMPLETO_BACKEND_APROBADO \
  --frontend-sha SHA_COMPLETO_FRONTEND_APROBADO \
  --api-image ghcr.io/TU_CUENTA/sonnet5-api@sha256:DIGEST_API \
  --web-image ghcr.io/TU_CUENTA/sonnet5-web@sha256:DIGEST_WEB
```

Usar los digests devueltos por el registro, no el ID local de imagen. El daemon de root necesita autenticación de lectura si el registro es privado. La herramienta comprueba que la revisión OCI corresponda al SHA declarado; los artefactos deben provenir de una construcción confiable. No configura credenciales del registro ni publica imágenes automáticamente.

## 4. Operación y actualización

```bash
sudo sonnet5 status
sudo sonnet5 logs api       # últimas 100 líneas; también web/gateway/postgres/migrate
sudo systemctl status sonnet5.service sonnet5-backup.timer
sudo systemctl list-timers sonnet5-backup.timer
sudo journalctl -u sonnet5-backup.service --since today
sudo sonnet5 backup
```

Para una actualización repetir `deploy` con nuevos SHA o imágenes aprobados. Se construye antes de interrumpir el servicio; se toma una copia consistente antes de aplicar migraciones y cambiar de release. Hay una breve ventana de mantenimiento; no se promete zero downtime. No ejecutar dos despliegues o backups a la vez: comparten un lock.

El servicio systemd restablece la release activa al arrancar el servidor. `sudo sonnet5 stop` detiene contenedores sin borrar volúmenes; `sudo sonnet5 up` los inicia. Para mantenerla detenida incluso tras reinicio usar `sudo systemctl disable --now sonnet5.service sonnet5-backup.timer`; reactivar cuando corresponda. No usar `docker compose down -v` en producción: borraría datos y certificados. No ejecutar `docker system prune --volumes`. Retener imágenes, fuentes y manifiestos de las releases recuperables; su limpieza es manual y debe respetar los respaldos conservados.

Revisar periódicamente disco (`df -h`, `sudo docker system df`), `sudo docker stats --no-stream`, estado unhealthy y fallos del timer. La rotación de logs de cada contenedor limita su ocupación (3 archivos de 10 MiB). No se instala monitorización externa ni alertas por correo. Las actualizaciones automáticas cubren seguridad de Ubuntu; imágenes Docker y dependencias se actualizan por PR, reconstrucción y prueba, sin Watchtower ni reemplazos silenciosos.

Los secretos se montan como archivos de solo lectura concedidos por servicio. Sus archivos son 0444 **dentro de un directorio root 0700**: Compose local conserva el propietario/mode del bind, por eso node no podría leer un archivo root 0400. No cambiar el padre a un directorio público. Quien controle root o Docker puede leer secretos; no añadir usuarios al grupo docker por conveniencia.

Cambiar un archivo de contraseña de PostgreSQL **no cambia el rol existente**: la inicialización solo se ejecuta sobre volumen vacío. Rotar el rol mediante un procedimiento coordinado, actualizar el secreto y recrear consumidores; respaldar primero. Cambiar JWT invalida sesiones y requiere recrear API. El bootstrap nunca rota secretos automáticamente.

## 5. Respaldos y recuperación

Timer diario: **03:00 America/El_Salvador**, retraso aleatorio hasta 120 s, persistente tras apagados. Para consistencia entre PostgreSQL y fotos, el backup detiene brevemente web/API y las reanuda incluso si falla el dump. Caddy puede responder 502 durante esa pausa. Detener el timer durante mantenimiento prolongado. El respaldo contiene `database.dump`, `uploads.tar.gz`, `manifest.json` y `checksums.txt`; no contiene contraseñas ni llaves TLS. Incluye información privada: conservar permisos y almacenamiento cifrado.

Retención local: 7 días, configurable entre 1 y 365. Si se configura S3 se suben los cuatro archivos con cifrado SSE-S3; una subida fallida conserva la copia local, devuelve error y evita aplicar retención. Los respaldos `.incomplete` no se restauran ni eliminan automáticamente; inspeccionarlos antes de limpiar. Configurar por separado el ciclo de vida de S3. Una copia local en el mismo EBS no protege frente a la pérdida del servidor. El timer y el bucket necesitan supervisión; los tests de S3 usan dobles de prueba, no una cuenta AWS real.

Para recuperar un respaldo de confianza, verificar qué release/esquema contiene su manifiesto, conservar una copia de seguridad del estado actual y copiar el directorio completo a una ruta privada del servidor. No editar su contenido ni sus checksums. Ejemplo para el **mismo host y PostgreSQL 18**:

```bash
sudo sonnet5 backup
sudo sonnet5 restore /var/backups/sonnet5/ID_RESPALDO --confirm-restore
# La aplicación queda detenida: elegir una release de esquema compatible.
sudo sonnet5 rollback ID_RELEASE_COMPATIBLE --schema-compatible
sudo sonnet5 status
```

Restore valida checksums y rutas del tar antes de detener el servicio, restaura SQL en una transacción y reemplaza las fotos; restablece también los permisos restringidos de la API. SQL y filesystem no comparten transacción: ante un fallo de fotos mantener el servicio cerrado y reintentar desde el respaldo íntegro. `rollback` cambia **solo imágenes/código**, no deshace migraciones; usarlo únicamente con compatibilidad comprobada o después de restaurar una base compatible. No degradar la versión mayor de PostgreSQL ni sustituir su imagen sin un plan de actualización de datos.

En un servidor perdido: preparar Ubuntu de nuevo, recuperar configuración/secretos por un canal privado, clonar y construir la misma pareja de commits indicada en el manifiesto, iniciar una base vacía, copiar el respaldo, restaurar y activar la release compatible. Los passwords no están en el dump: el nuevo bootstrap puede generar otros siempre que los roles de la nueva base se inicialicen con esos secretos. Los roles fijos `sonnet5_owner` y `sonnet5_app` permiten restaurar los objetos sin conservar contraseñas del host anterior. Caddy puede emitir un certificado nuevo con DNS/puertos válidos. Ensayar este procedimiento y la descarga S3 antes de depender de él; el test automático de esta entrega cubre recuperación en el mismo host.

## 6. Verificación de esta entrega

Desde backend, con Docker, Compose >=2.24, Python 3 y frontend de esta rama:

```bash
python3 -m unittest discover -s deploy/tests -p 'test_*.py' -v
python3 deploy/tests/smoke-docker.py --frontend ../fe_docker_plataforma_20261115 --build --keep
```

El smoke usa nombres aleatorios y puertos loopback. Aplica migraciones sobre una base vacía, crea datos sintéticos explícitos solo en ese entorno, prueba privilegios, ausencia de puertos internos, bootstrap idempotente, backup, restauración y hash de una foto privada. Con `--keep` informa ruta/URL para los [dos tests de navegador](https://github.com/ArmandoAgui/fe_boilerplate_is_2026/blob/feature/docker-plataforma-ubuntu/docs/docker.md). Sin esa opción elimina exclusivamente su proyecto y volúmenes. Si se conserva, al terminar ejecutar `python3 deploy/tests/smoke-docker.py --cleanup /tmp/sonnet5-smoke-RUTA_GENERADA`. El comando verifica el nombre, la configuración y el proyecto aleatorios antes de borrar exclusivamente esos contenedores, volúmenes y archivos temporales; rechaza rutas de producción.

Se verificaron builds e integración Docker en Linux amd64. El bootstrap se validó con dry-run, pruebas de rechazo y análisis de shell; **no se ha ejecutado sobre una EC2 real ni instalado paquetes/firewall en el equipo del desarrollador**. Tampoco se emitieron certificados ACME públicos ni se conectó S3. Ver [decisiones técnicas y límites](DECISIONES.md).
