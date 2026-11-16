# Paso a paso: despliegue de pruebas en AWS

Esta guía reproduce el despliegue realizado el **16 de noviembre de 2026**. Incluye frontend, backend y PostgreSQL, integración de Heber H29/H30, reglas del Product Owner, HTTPS y respaldos. Usar una instancia **nueva y dedicada** para repetir el procedimiento; el servidor de referencia ya está desplegado y no necesita reinstalación.

URL de referencia: <https://sonnet5.98.81.166.66.sslip.io>. Usuario SSH: `ubuntu`. Cuenta administradora inicial: `00174323@uca.edu.sv`. No se incluyen contraseñas, llaves privadas ni tokens.

## 1. Preparar AWS y el equipo local

Crear Ubuntu Server **24.04 LTS x86_64**. Referencia probada: aproximadamente2GiB RAM y volumen raíz43GiB. Para compilar en el servidor preferir4GiB y2vCPU; en2GiB se construye en el equipo local. El almacenamiento de fotos/BD y los certificados persisten en volúmenes Docker. Revisar presupuesto: EC2, EBS, IP pública, dominio y S3 no se presuponen gratuitos.

Configurar el Security Group antes de conectar:

| Puerto TCP | Origen |
|---|---|
| 22 | IP pública actual del operador `/32` |
| 80 | Internet, para redirección HTTP y ACME |
| 443 | Internet, para HTTPS |

No abrir3000/3112/3113/5432. Permitir salida para instalación de paquetes, imágenes, DNS y emisión de certificados. El bootstrap configura UFW dentro de Ubuntu; **no crea ni edita el Security Group** y UFW no sustituye sus reglas.

En el equipo local: Git, SSH, Docker funcionando y plugin Buildx. En Windows utilizar WSL2 con integración de Docker Desktop y contenedores Linux; ejecutar los ejemplos en Bash, ajustando la ubicación de la llave. Comprobar:

```bash
git --version
docker version
docker buildx version
```

Guardar la llave descargada de AWS fuera del repositorio y ajustar permisos en Linux/WSL. Los comandos siguientes usan la instancia de referencia: cambiar IP, llave, dominio y correos al crear otra.

```bash
chmod 600 "$HOME/Downloads/Sonnet 5.pem"
ssh -i "$HOME/Downloads/Sonnet 5.pem" ubuntu@98.81.166.66
```

## 2. Confirmar servidor y DNS

En **la sesión SSH**:

```bash
cat /etc/os-release
uname -m
free -m
df -h /
printf '%s\n' "$SSH_CONNECTION"
getent ahostsv4 sonnet5.98.81.166.66.sslip.io
```

El dominio debe resolver a98.81.166.66. `sslip.io` fue autorizado como dominio temporal basado en IP; depende de ese proveedor y de conservar la IP pública. Para uso permanente sustituirlo por un dominio propio apuntando a una IP estable. No usar HTTP para el login: en producción la cookie de sesión es Secure.

## 3. Obtener los commits desplegados

Los dos commits siguientes son una **pareja comprobada** de la rama `feature/docker-plataforma-ubuntu` e incluyen Heber. Se fijan para reproducibilidad; no se despliega la última develop implícitamente. Para otra versión elegir una nueva pareja revisada y reconstruir ambas imágenes.

```text
Backend:  c60e1c5c3bda16d503b10401a5d2e25c9295cd96
Frontend: a1db269c440f078e3efc557611dd943378f3db78
```

En **el servidor**, clonar el bootstrap:

```bash
git clone https://github.com/ArmandoAgui/be_boilerplate_is_2026.git sonnet5-bootstrap
git -C sonnet5-bootstrap checkout --detach c60e1c5c3bda16d503b10401a5d2e25c9295cd96
```

Los repositorios son públicos: no requieren PAT ni contraseña de GitHub. Nunca introducir tokens en URLs, archivos de configuración, imágenes o historial.

## 4. Ejecutar la preparación de Ubuntu

En **la misma sesión SSH**, obtener el origen real de conexión para no bloquear el acceso. Revisar el plan y después ejecutar:

```bash
OPERADOR_CIDR="${SSH_CONNECTION%% *}/32"

bash sonnet5-bootstrap/deploy/bootstrap-ubuntu.sh \
  --domain sonnet5.98.81.166.66.sslip.io \
  --email 00174323@uca.edu.sv --admin-email 00174323@uca.edu.sv \
  --ssh-cidr "$OPERADOR_CIDR" --dry-run

sudo env SSH_CONNECTION="$SSH_CONNECTION" \
  bash sonnet5-bootstrap/deploy/bootstrap-ubuntu.sh \
  --domain sonnet5.98.81.166.66.sslip.io \
  --email 00174323@uca.edu.sv --admin-email 00174323@uca.edu.sv \
  --ssh-cidr "$OPERADOR_CIDR"
```

El ejemplo presupone una conexión IPv4. Con IPv6 usar un CIDR autorizado apropiado. El script instala Docker oficial/Compose/Buildx, Python y UFW, genera cinco secretos y prepara systemd. Conserva secretos existentes y reglas UFW previas. No carga datos demo ni arranca todavía la plataforma. Si cambia la IP del operador, actualizar **antes** UFW y Security Group desde una sesión existente o consola AWS.

En la instancia2GiB se añadió swap2GiB como apoyo ante picos. Solo si `swapon --show` no muestra swap y `/swapfile` no existe, ejecutar en el servidor:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -m
```

No repetir la creación ni duplicar la línea de fstab. Swap no reemplaza RAM ni garantiza capacidad.

## 5. Construir las imágenes fuera de EC2

En **el equipo local**, dentro de una carpeta nueva:

```bash
git clone https://github.com/ArmandoAgui/be_boilerplate_is_2026.git backend
git clone https://github.com/ArmandoAgui/fe_boilerplate_is_2026.git frontend
git -C backend checkout --detach c60e1c5c3bda16d503b10401a5d2e25c9295cd96
git -C frontend checkout --detach a1db269c440f078e3efc557611dd943378f3db78

docker buildx build --platform linux/amd64 --load \
  --build-arg VCS_REF=c60e1c5c3bda16d503b10401a5d2e25c9295cd96 \
  -t sonnet5-api:c60e1c5 ./backend
docker buildx build --platform linux/amd64 --load \
  --build-arg VCS_REF=a1db269c440f078e3efc557611dd943378f3db78 \
  -t sonnet5-web:a1db269 ./frontend
```

El servidor es amd64: conservar `--platform linux/amd64` al construir desde un equipo ARM. Se necesita Internet durante build (npm y fuentes de Next). Los Dockerfiles fijan imágenes base por digest y generan el cliente Prisma sin conectarse a una BD real.

Transferir por SSH sin publicar imágenes en un registro:

```bash
set -o pipefail
docker save sonnet5-api:c60e1c5 | gzip -1 | \
  ssh -i "$HOME/Downloads/Sonnet 5.pem" ubuntu@98.81.166.66 'sudo docker load'
docker save sonnet5-web:a1db269 | gzip -1 | \
  ssh -i "$HOME/Downloads/Sonnet 5.pem" ubuntu@98.81.166.66 'sudo docker load'
```

Esperar que ambos comandos confirmen `Loaded image` antes de continuar. La llave solo se usa desde el equipo local; no copiarla al servidor.

## 6. Preparar la release inicial importada

Esta vía documenta la carga offline utilizada en la instancia2GiB. La herramienta estándar `sonnet5 deploy` ofrece compilación en un host con al menos3GiB o pull de imágenes publicadas por digest; ver la [guía general](README.md). Aquí se importaron imágenes locales y se registraron explícitamente sus IDs sin relajar ese control.

En **el servidor nuevo**, comprobar que no existe ya una release activa:

```bash
sudo test ! -e /opt/sonnet5/current && echo 'Sin release activa; continuar'
```

Si ya existe, **no ejecutar este primer despliegue de nuevo**; seguir la sección de actualizaciones. Después:

```bash
sudo mkdir -p /opt/sonnet5/releases/aws-pruebas-20261116
sudo git clone https://github.com/ArmandoAgui/be_boilerplate_is_2026.git \
  /opt/sonnet5/releases/aws-pruebas-20261116/backend
sudo git -C /opt/sonnet5/releases/aws-pruebas-20261116/backend \
  checkout --detach c60e1c5c3bda16d503b10401a5d2e25c9295cd96
sudo git clone https://github.com/ArmandoAgui/fe_boilerplate_is_2026.git \
  /opt/sonnet5/releases/aws-pruebas-20261116/frontend
sudo git -C /opt/sonnet5/releases/aws-pruebas-20261116/frontend \
  checkout --detach a1db269c440f078e3efc557611dd943378f3db78
```

Registrar la pareja, verificar la revisión OCI de las imágenes y activar mediante la herramienta preparada por el bootstrap:

```bash
sudo python3 - <<'PY'
import datetime, json, os, subprocess, sys
from pathlib import Path
os.umask(0o077)
sys.path.insert(0, '/opt/sonnet5/bin')
from plataforma import Platform, atomic_json
app = Platform(Path('/etc/sonnet5/platform.env'))
release = Path('/opt/sonnet5/releases/aws-pruebas-20261116')
data = {k: app.settings[k] for k in ('NODE_IMAGE', 'POSTGRES_IMAGE', 'CADDY_IMAGE')}
data.update(
    BACKEND_SHA='c60e1c5c3bda16d503b10401a5d2e25c9295cd96',
    FRONTEND_SHA='a1db269c440f078e3efc557611dd943378f3db78',
    API_IMAGE='sonnet5-api:c60e1c5', WEB_IMAGE='sonnet5-web:a1db269',
    created_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
    delivery='local build and SSH docker save/load',
)
with app.lock():
    if (app.stack / 'current').exists() or (app.stack / 'current').is_symlink():
        raise SystemExit('Ya existe release activa; usar el procedimiento de actualización')
    for image, revision in [('API_IMAGE', 'BACKEND_SHA'), ('WEB_IMAGE', 'FRONTEND_SHA')]:
        info = json.loads(subprocess.check_output(['docker', 'image', 'inspect', data[image]], text=True))[0]
        if info['Config']['Labels'].get('org.opencontainers.image.revision') != data[revision]:
            raise SystemExit('La revisión OCI no coincide con la release')
        data[image + '_ID'] = info['Id']
    atomic_json(release / 'release.json', data)
    app.activate_link('current', release)
    app.up()
    app.init_admin()
PY

sudo systemctl start sonnet5.service
sudo sonnet5 status
```

El primer arranque aplica las18 migraciones, espera a PostgreSQL/API/Next y emite el certificado con Caddy. `app.up` valida HTTPS sin ignorar errores de certificado. Si falla, conservar datos/configuración y revisar logs; no borrar volúmenes ni reactivar imágenes antiguas contra un esquema cambiado sin comprobar compatibilidad.

## 7. Entrar y cargar los datos necesarios

Abrir <https://sonnet5.98.81.166.66.sslip.io>. Correo inicial: `00174323@uca.edu.sv`. En la terminal SSH privada del operador:

```bash
sudo cat /etc/sonnet5/secrets/admin_password
```

No pegar esa contraseña en chats, PR ni documentación. El alta inicial es idempotente: no cambia una contraseña de administrador existente. No se ejecuta `prisma db seed`, porque publica cuentas demo con claves conocidas.

Para poder asociar residentes a unidades, preparar `/etc/sonnet5/condominio.json` con **los datos reales o ficticios identificados para pruebas**, siguiendo `backend/deploy/condominio.example.json`. El archivo inicial tiene `{"torres":[]}`:

```bash
sudoedit /etc/sonnet5/condominio.json
sudo chmod 0444 /etc/sonnet5/condominio.json
sudo sonnet5 init-condominio
```

Registrar residentes/vínculos y áreas/horarios desde administración. La importación no duplica unidades ni mueve códigos existentes a otras secciones. Hasta cargar datos de origen, H29/H30 muestran **Sin datos**; es el resultado correcto de una base nueva.

## 8. Verificar el despliegue

Desde el equipo local:

```bash
curl -I http://sonnet5.98.81.166.66.sslip.io
curl --fail https://sonnet5.98.81.166.66.sslip.io/api/health
```

Esperar redirección308 a HTTPS y JSON `{"status":"ok"}`. En el navegador: login, Reportes con cuatro tarjetas, filtro válido/inválido, Compartir reporte y Descargar PDF. El archivo debe tener el período seleccionado y solo indicadores generales.

En el servidor:

```bash
sudo sonnet5 status
sudo sonnet5 logs migrate
sudo sonnet5 logs gateway
sudo systemctl is-active sonnet5.service sonnet5-backup.timer
sudo systemctl list-timers sonnet5-backup.timer
sudo docker stats --no-stream
sudo ufw status
```

API/web/PostgreSQL deben estar saludables; migrate debe terminar con salida0. Solo Caddy publica80/443. No basta un200 de Next para demostrar que todas las funciones están sanas: probar también login/reportes/PDF.

Resultados observados en AWS: certificado válido,18 migraciones, login, cookies Secure/HttpOnly, cuatro indicadores, PDF H30 legible y móvil390x844 sin desbordamiento. API/web corren como node con filesystem de solo lectura; sonnet5_app no tiene DDL, superusuario ni SELECT sobre `_prisma_migrations`. Puertos3000/5432 sin acceso público. No se realizó prueba de carga ni restauración sobre esta instancia activa.

## 9. Respaldar, actualizar y recuperar

```bash
sudo sonnet5 backup
sudo journalctl -u sonnet5-backup.service --since today
```

El backup pausa brevemente API/web y las reanuda; evitar pruebas de navegador durante esa pausa. Timer diario03:00 de El Salvador, retraso aleatorio hasta120s, retención local7d. Primer respaldo verificado: `20261116T233709Z-b542d8`. S3 no se configuró: una copia en el mismo EBS no protege frente a perder el servidor. Consultar [recuperación, S3 y rotación de secretos](README.md).

Para actualizar, el camino estándar es construir/publicar una nueva pareja de imágenes en un registro accesible por el daemon y proporcionar los digests y SHA completos:

```bash
sudo sonnet5 deploy \
  --backend-sha SHA_BACKEND_APROBADO --frontend-sha SHA_FRONTEND_APROBADO \
  --api-image ghcr.io/TU_CUENTA/sonnet5-api@sha256:DIGEST_API \
  --web-image ghcr.io/TU_CUENTA/sonnet5-web@sha256:DIGEST_WEB
```

La guía general explica publicación y autenticación del registro. `--build` se reserva para un servidor con RAM suficiente. No reutilizar el script de primera activación para sustituir una release activa: la actualización requiere respaldo, parada controlada, manifiesto nuevo y compatibilidad de esquema. No usar `docker compose down -v` ni `docker system prune --volumes`.

## 10. Diagnóstico rápido

| Síntoma | Revisar |
|---|---|
| SSH no conecta | IP pública del operador, llave, usuario ubuntu, UFW y Security Group |
| HTTPS falla | DNS actual, entradas A/AAAA, puertos80/443 y logs de gateway |
| Login no conserva sesión | Usar HTTPS; cookie Secure, Host/protocolo del proxy |
| API no inicia | Logs migrate/API; disponibilidad de BD y secretos; no ejecutar db push/reset |
| Reportes Sin datos | Crear datos de origen; distinguir una base vacía de un fallo |
|502 durante backup | Pausa de escrituras prevista; verificar que web/API vuelvan saludables |
| Imagen no carga/no existe | Esperar ambos docker load y comprobar tags/revisión OCI |
| Disco o RAM altos | docker stats, df -h, imágenes/respaldos retenidos; no borrar volúmenes |

El detalle de arquitectura y sus límites está en [DECISIONES.md](DECISIONES.md). Este documento describe una instalación de pruebas; no implica que los PR hayan sido aprobados o fusionados a develop.
