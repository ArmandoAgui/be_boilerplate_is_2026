#!/usr/bin/env bash
# Run only on the dedicated Ubuntu server, after reviewing this file.
set -Eeuo pipefail
umask 077
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
DOMAIN=''
EMAIL=''
ADMIN_EMAIL=''
SSH_CIDR=''
BACKUP_BUCKET=''
DRY_RUN=0
usage() {
  cat <<'HELP'
Uso: sudo bash deploy/bootstrap-ubuntu.sh \
  --domain condominio.example.com --email operador@example.com \
  --admin-email administrador@example.com --ssh-cidr TU_IP_PUBLICA/32 \
  [--backup-s3-bucket bucket-privado] [--dry-run]

Prepara Ubuntu Server 24.04 LTS dedicado. No crea EC2, DNS, buckets ni reglas
AWS. --dry-run valida argumentos y muestra el plan sin modificar el equipo.
No despliega código ni ejecuta seeds. No cambia contraseñas ya generadas.
HELP
}
while (($#)); do
  case "$1" in
    --domain|--email|--admin-email|--ssh-cidr|--backup-s3-bucket)
      (($# >= 2)) || { echo "Falta valor para $1" >&2; exit 2; }
      case "$1" in
        --domain) DOMAIN=$2 ;;
        --email) EMAIL=$2 ;;
        --admin-email) ADMIN_EMAIL=$2 ;;
        --ssh-cidr) SSH_CIDR=$2 ;;
        --backup-s3-bucket) BACKUP_BUCKET=$2 ;;
      esac
      shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Argumento no reconocido: $1" >&2; usage >&2; exit 2 ;;
  esac
done
ADMIN_EMAIL=${ADMIN_EMAIL:-$EMAIL}
command -v python3 >/dev/null || { echo 'Falta python3 para validar parámetros' >&2; exit 1; }
python3 - "$DOMAIN" "$EMAIL" "$ADMIN_EMAIL" "$SSH_CIDR" "$BACKUP_BUCKET" "${SSH_CONNECTION:-}" <<'PY'
import ipaddress,re,sys
name,email,admin,cidr,bucket,connection=sys.argv[1:]
if not re.fullmatch(r'(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}',name):
    sys.exit('Indica --domain como dominio DNS público, sin http, rutas ni puerto')
for value in (email,admin):
    if not re.fullmatch(r'[A-Za-z0-9.!+_%=-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}',value):sys.exit('Correo inválido')
try: network=ipaddress.ip_network(cidr,strict=False)
except ValueError:sys.exit('--ssh-cidr debe ser tu IP pública con /32 o un rango autorizado')
if network.prefixlen==0:sys.exit('SSH no se abre a todo Internet')
if connection:
    peer=ipaddress.ip_address(connection.split()[0])
    if peer not in network:sys.exit('La IP de la sesión SSH actual no está en --ssh-cidr; se evita bloquear el acceso')
if bucket and not re.fullmatch(r'[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]',bucket):sys.exit('Bucket S3 inválido')
PY
if ((DRY_RUN)); then
  cat <<BOOTSTRAP_PLAN
PLAN SIN CAMBIOS:
- Validar Ubuntu Server 24.04 LTS, systemd y al menos 10 GiB libres.
- Instalar paquetes del sistema, Docker Engine, Buildx y Compose desde repositorios firmados.
- Crear /etc/sonnet5 (0700), /opt/sonnet5, estado y respaldos privados.
- Generar cinco secretos independientes solo si no existen; no imprimirlos.
- Permitir SSH/22 desde ${SSH_CIDR}; HTTP/80 y HTTPS/443. Conservar reglas previas.
- Instalar sonnet5, unidades systemd y respaldo diario a las 03:00 de El Salvador.
- Preparar dominio ${DOMAIN}, correo ACME ${EMAIL} y administrador ${ADMIN_EMAIL}.
- S3 opcional: ${BACKUP_BUCKET:-no configurado}; necesita bucket privado e IAM role previos.
- No clonar, iniciar aplicaciones, migrar bases ni cargar datos de demostración.
BOOTSTRAP_PLAN
  exit 0
fi
((EUID == 0)) || { echo 'Ejecutar con sudo sobre el servidor dedicado' >&2; exit 1; }
# shellcheck disable=SC1091
source /etc/os-release
[[ ${ID:-} == ubuntu && ${VERSION_ID:-} == 24.04 ]] || { echo 'Este bootstrap soporta Ubuntu Server 24.04 LTS' >&2; exit 1; }
[[ -d /run/systemd/system ]] || { echo 'Se requiere un servidor con systemd activo' >&2; exit 1; }
[[ $(df -Pk /var | awk 'NR == 2 {print $4}') -ge 10485760 ]] || { echo 'Se requieren al menos 10 GiB libres' >&2; exit 1; }
for file in plataforma.py base-images.env systemd/sonnet5.service systemd/sonnet5-backup.service systemd/sonnet5-backup.timer; do
  [[ -f "$SCRIPT_DIR/$file" ]] || { echo "Falta $file junto al bootstrap" >&2; exit 1; }
done
exec 9>/run/lock/sonnet5-bootstrap.lock
flock -n 9 || { echo 'Otro bootstrap está en curso' >&2; exit 1; }
# Reject a conflicting re-run before touching packages, firewall or secrets.
if [[ -f /etc/sonnet5/platform.env ]]; then
  python3 - "$SCRIPT_DIR" "$DOMAIN" "$EMAIL" "$ADMIN_EMAIL" "$BACKUP_BUCKET" <<'PY'
import sys
from pathlib import Path
sys.path.insert(0,sys.argv[1])
from plataforma import read_env
v=read_env(Path('/etc/sonnet5/platform.env'))
for key,wanted in zip(('DOMAIN','ACME_EMAIL','ADMIN_EMAIL','BACKUP_S3_BUCKET'),sys.argv[2:]):
    if v.get(key,'')!=wanted:sys.exit(f'{key} difiere de la instalación actual; revisar la configuración existente antes de cambiarla')
PY
fi
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends ca-certificates curl git openssl python3 python3-boto3 ufw unattended-upgrades
if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1 || ! docker buildx version >/dev/null 2>&1; then
  # Never remove an existing Docker installation or its volumes automatically.
  if dpkg-query -W -f='${Status}' docker.io 2>/dev/null | grep -q 'install ok installed'; then
    echo 'Existe Docker de Ubuntu. Instala sus plugins o migra conscientemente al repositorio oficial; no se elimina automáticamente.' >&2
    exit 1
  fi
  install -m 0755 -d /etc/apt/keyrings
  curl --proto '=https' --tlsv1.2 -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod 0644 /etc/apt/keyrings/docker.asc
  arch=$(dpkg --print-architecture)
  cat > /etc/apt/sources.list.d/docker.sources <<REPO
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: noble
Components: stable
Architectures: ${arch}
Signed-By: /etc/apt/keyrings/docker.asc
REPO
  apt-get update
  apt-get install -y --no-install-recommends docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
python3 - "$(docker compose version --short)" <<'PY'
import re,sys
v=re.match(r'v?(\d+)\.(\d+)',sys.argv[1])
if not v or tuple(map(int,v.groups()))<(2,24):sys.exit('Se requiere Docker Compose >= 2.24')
PY
systemctl enable --now docker
install -d -m 0700 /etc/sonnet5 /etc/sonnet5/secrets /opt/sonnet5 /opt/sonnet5/bin /opt/sonnet5/releases /var/lib/sonnet5 /var/backups/sonnet5
for secret in postgres_password db_owner_password db_app_password jwt_secret admin_password; do
  dest="/etc/sonnet5/secrets/$secret"
  [[ ! -L "$dest" ]] || { echo "Secreto $secret no puede ser un enlace" >&2; exit 1; }
  if [[ ! -e "$dest" ]]; then
    if [[ "$secret" == admin_password ]]; then
      { printf 'Aa1!'; openssl rand -hex 24; } > "$dest"
    else
      openssl rand -hex 32 > "$dest"
    fi
  fi
  [[ -s "$dest" ]] || { echo "Secreto $secret vacío; revisar manualmente" >&2; exit 1; }
  # Compose file-backed secrets preserve source mode, not uid/mode overrides.
  # The parent is root-only 0700; inside a granted container the file is readable
  # by its non-root service account. Secrets are mounted read-only.
  chmod 0444 "$dest"
done
if [[ ! -e /etc/sonnet5/platform.env ]]; then
  python3 - "$SCRIPT_DIR" "$DOMAIN" "$EMAIL" "$ADMIN_EMAIL" "$BACKUP_BUCKET" <<'PY'
import sys
from pathlib import Path
sys.path.insert(0,sys.argv[1])
from plataforma import read_env
v={'STACK_NAME':'sonnet5','STACK_DIR':'/opt/sonnet5','STATE_DIR':'/var/lib/sonnet5','BACKUP_DIR':'/var/backups/sonnet5','SECRETS_DIR':'/etc/sonnet5/secrets','DOMAIN':sys.argv[2],'ACME_EMAIL':sys.argv[3],'ADMIN_EMAIL':sys.argv[4],'CUOTA_MENSUAL_USD':'50.00','BACKUP_RETENTION_DAYS':'7','BACKUP_S3_BUCKET':sys.argv[5],'BACKUP_S3_PREFIX':'sonnet5','BIND_ADDRESS':'0.0.0.0','HTTP_PORT':'80','HTTPS_PORT':'443'}
v.update(read_env(Path(sys.argv[1])/'base-images.env'))
Path('/etc/sonnet5/platform.env').write_text(''.join(f'{k}={value}\n' for k,value in v.items()))
PY
fi
if [[ ! -e /etc/sonnet5/condominio.json ]]; then
  printf '{"torres": []}\n' > /etc/sonnet5/condominio.json
  chmod 0444 /etc/sonnet5/condominio.json
fi
chmod 0600 /etc/sonnet5/platform.env
install -m 0700 "$SCRIPT_DIR/plataforma.py" /opt/sonnet5/bin/plataforma.py
cat > /usr/local/bin/sonnet5 <<'WRAPPER'
#!/bin/sh
exec /usr/bin/python3 /opt/sonnet5/bin/plataforma.py "$@"
WRAPPER
chmod 0755 /usr/local/bin/sonnet5
install -m 0644 "$SCRIPT_DIR"/systemd/sonnet5* /etc/systemd/system/
cat > /etc/apt/apt.conf.d/99sonnet5-security-updates <<'APT'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
Unattended-Upgrade::Automatic-Reboot "false";
APT
# Add the current SSH source BEFORE enabling the firewall. No ufw reset.
ufw allow proto tcp from "$SSH_CIDR" to any port 22 comment 'SONNET5 SSH'
ufw allow 80/tcp comment 'SONNET5 HTTP'
ufw allow 443/tcp comment 'SONNET5 HTTPS'
ufw default deny incoming
ufw default allow outgoing
ufw --force enable
systemctl daemon-reload
systemctl enable sonnet5.service
systemctl enable --now sonnet5-backup.timer apt-daily.timer apt-daily-upgrade.timer
printf '\nServidor preparado. No se desplegó ninguna aplicación.\n'
printf 'Revisa DNS y Security Group, y despliega SHA aprobados con sudo sonnet5 deploy.\n'
printf 'La contraseña inicial está en /etc/sonnet5/secrets/admin_password; no se imprime.\n'
printf 'No cambies los secretos de PostgreSQL sobre un volumen existente sin rotar también sus roles.\n'
