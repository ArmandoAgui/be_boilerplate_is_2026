#!/usr/bin/env python3
"""Operate one dedicated SONNET 5 host. No shell evaluation of configuration."""
from __future__ import annotations

import argparse
import contextlib
import datetime as dt
import fcntl
import hashlib
import ipaddress
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import signal
import ssl
import subprocess
import sys
import tarfile
import time
import urllib.request
import uuid


class DeployError(RuntimeError):
    pass


def read_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for number, line in enumerate(path.read_text().splitlines(), 1):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        match = re.fullmatch(r'([A-Z][A-Z0-9_]*)=(.*)', line)
        if not match:
            raise DeployError(f'Línea {number} inválida en configuración')
        key, value = match.groups()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        if key in values or any(c in value for c in '\n\r\x00$`'):
            raise DeployError(f'Valor repetido o no permitido: {key}')
        values[key] = value
    return values


def valid_release_id(value: str) -> bool:
    return re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]{0,100}', value) is not None


def sha_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def atomic_json(path: Path, data: dict) -> None:
    temp = path.with_name(path.name + '.tmp')
    with open(temp, 'w', opener=lambda p, f: os.open(p, f, 0o600)) as dest:
        json.dump(data, dest, ensure_ascii=False, indent=2)
        dest.write('\n')
    os.replace(temp, path)


class Platform:
    def __init__(self, config: Path):
        self.config = config.absolute()
        info = self.config.lstat()
        if self.config.is_symlink() or info.st_uid not in (0, os.geteuid()) or info.st_mode & 0o077:
            raise DeployError('La configuración debe ser un archivo privado (0600), propio o de root')
        self.settings = read_env(self.config)
        for key in ('STACK_NAME', 'STACK_DIR', 'STATE_DIR', 'BACKUP_DIR', 'SECRETS_DIR', 'DOMAIN', 'ACME_EMAIL', 'ADMIN_EMAIL', 'NODE_IMAGE', 'POSTGRES_IMAGE', 'CADDY_IMAGE'):
            if not self.settings.get(key):
                raise DeployError(f'Falta {key}')
        if not re.fullmatch(r'[a-z][a-z0-9_-]{1,39}', self.settings['STACK_NAME']):
            raise DeployError('STACK_NAME inválido')
        self.stack = self.private_path('STACK_DIR')
        self.state = self.private_path('STATE_DIR')
        self.backups = self.private_path('BACKUP_DIR')
        self.secrets = self.private_path('SECRETS_DIR')
        if len({self.stack, self.state, self.backups, self.secrets}) != 4:
            raise DeployError('Los cuatro directorios deben ser distintos')
        self.releases = self.stack / 'releases'
        self.bind = self.settings.get('BIND_ADDRESS', '0.0.0.0')
        ipaddress.IPv4Address(self.bind)
        domain = self.settings['DOMAIN']
        if domain == 'localhost':
            if not ipaddress.ip_address(self.bind).is_loopback:
                raise DeployError('localhost solo se permite escuchando en loopback para pruebas')
        elif not re.fullmatch(r'(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}', domain):
            raise DeployError('DOMAIN debe ser un dominio DNS sin esquema ni puerto')
        for key in ('ACME_EMAIL', 'ADMIN_EMAIL'):
            if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', self.settings[key]):
                raise DeployError(f'{key} inválido')
        for key in ('HTTP_PORT', 'HTTPS_PORT'):
            value = self.settings.get(key, '80' if key == 'HTTP_PORT' else '443')
            if not value.isdecimal() or not 1 <= int(value) <= 65535:
                raise DeployError(f'{key} inválido')
        if self.settings.get('HTTP_PORT', '80') == self.settings.get('HTTPS_PORT', '443'):
            raise DeployError('HTTP y HTTPS requieren puertos distintos')
        for key in ('NODE_IMAGE', 'POSTGRES_IMAGE', 'CADDY_IMAGE'):
            if not re.fullmatch(r'[a-zA-Z0-9./:_-]+@sha256:[a-f0-9]{64}', self.settings[key]):
                raise DeployError(f'{key} requiere un digest inmutable')
        retention = self.settings.get('BACKUP_RETENTION_DAYS', '7')
        if not retention.isdecimal() or not 1 <= int(retention) <= 365:
            raise DeployError('Retención de respaldos inválida')
        bucket = self.settings.get('BACKUP_S3_BUCKET', '')
        if bucket and not re.fullmatch(r'[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]', bucket):
            raise DeployError('Bucket S3 inválido; indicar solo su nombre')
        prefix = self.settings.get('BACKUP_S3_PREFIX', 'sonnet5')
        if not re.fullmatch(r'[A-Za-z0-9/_-]+', prefix):
            raise DeployError('Prefijo S3 inválido')

    def private_path(self, key: str) -> Path:
        p = Path(self.settings[key])
        if not p.is_absolute() or p.is_symlink() or len(p.parts) < 3 or p.resolve() in (Path('/tmp'), Path('/var/lib'), Path('/var/backups')):
            raise DeployError(f'{key} debe ser una ruta absoluta dedicada')
        return p.resolve()

    @contextlib.contextmanager
    def lock(self):
        self.state.mkdir(parents=True, exist_ok=True, mode=0o700)
        with (self.state / 'operation.lock').open('a') as lock:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError as error:
                raise DeployError('Ya hay otra operación de despliegue o respaldo en curso') from error
            yield

    def release(self, release_id: str) -> Path:
        if not valid_release_id(release_id):
            raise DeployError('Identificador de release inválido')
        path = (self.releases / release_id).resolve()
        if path.parent != self.releases.resolve() or not path.is_dir():
            raise DeployError('Release inexistente o fuera del directorio permitido')
        self.manifest(path)
        return path

    def current(self, optional: bool = False) -> Path | None:
        link = self.stack / 'current'
        if not link.is_symlink():
            if optional:
                return None
            raise DeployError('Aún no hay una release desplegada')
        return self.release(link.resolve().name)

    def manifest(self, release: Path) -> dict:
        data = json.loads((release / 'release.json').read_text())
        for key in ('BACKEND_SHA', 'FRONTEND_SHA'):
            if not re.fullmatch(r'[0-9a-f]{40}', data.get(key, '')):
                raise DeployError(f'{key} inválido en release')
        for key in ('API_IMAGE', 'WEB_IMAGE'):
            if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._/:@-]*', data.get(key, '')):
                raise DeployError(f'{key} inválido en release')
        return data

    def environment(self, release: Path) -> dict[str, str]:
        env = {k: v for k, v in os.environ.items() if not k.startswith('COMPOSE_')}
        env.pop('DOCKER_CONTEXT', None)
        env['DOCKER_HOST'] = 'unix:///var/run/docker.sock'
        env.update(self.settings)
        data = self.manifest(release)
        for key in ('API_IMAGE', 'WEB_IMAGE', 'BACKEND_SHA', 'FRONTEND_SHA', 'NODE_IMAGE', 'POSTGRES_IMAGE', 'CADDY_IMAGE'):
            if key in data:
                env[key] = data[key]
        env['BACKEND_CONTEXT'] = str(release / 'backend')
        env['FRONTEND_CONTEXT'] = str(release / 'frontend')
        return env

    def compose(self, release: Path, *args: str, **kwargs):
        command = ['docker', 'compose', '--project-name', self.settings['STACK_NAME'], '--env-file', str(self.config), '-f', str(release / 'backend/deploy/compose.production.yml'), *args]
        return subprocess.run(command, env=self.environment(release), check=True, **kwargs)

    def image_id(self, image: str) -> str:
        return subprocess.check_output(['docker', 'image', 'inspect', '--format', '{{.Id}}', image], text=True, env=self.docker_env()).strip()

    def docker_env(self) -> dict[str, str]:
        env = os.environ.copy()
        env.pop('DOCKER_CONTEXT', None)
        env['DOCKER_HOST'] = 'unix:///var/run/docker.sock'
        return env

    def verify_images(self, release: Path) -> None:
        data = self.manifest(release)
        for key, id_key in [('API_IMAGE', 'API_IMAGE_ID'), ('WEB_IMAGE', 'WEB_IMAGE_ID')]:
            if id_key in data and self.image_id(data[key]) != data[id_key]:
                raise DeployError(f'La imagen {key} cambió: no se inicia una release con tags reemplazados')

    def activate_link(self, name: str, release: Path) -> None:
        temp = self.stack / ('.' + name + '.new')
        temp.unlink(missing_ok=True)
        temp.symlink_to(release)
        os.replace(temp, self.stack / name)

    def up(self, release: Path | None = None) -> None:
        release = release or self.current()
        self.verify_images(release)
        self.compose(release, 'up', '-d', '--wait', '--wait-timeout', '180', 'postgres', 'migrate', 'api', 'web', 'gateway')
        self.probe_https(release)

    def probe_https(self, release: Path) -> None:
        domain = self.settings['DOMAIN']
        port = self.settings.get('HTTPS_PORT', '443')
        url = f'https://{domain}' + (f':{port}' if port != '443' else '') + '/api/health'
        deadline = time.monotonic() + 90
        last_error = None
        while time.monotonic() < deadline:
            try:
                if domain == 'localhost':
                    ca = self.state / 'local-test-ca.crt'
                    self.compose(release, 'cp', 'gateway:/data/caddy/pki/authorities/local/root.crt', str(ca), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    context = ssl.create_default_context(cafile=str(ca))
                else:
                    context = ssl.create_default_context()
                with urllib.request.urlopen(url, context=context, timeout=5) as response:
                    if response.status == 200 and json.load(response) == {'status': 'ok'}:
                        print(f'HTTPS y frontend disponibles: {url}')
                        return
            except (OSError, ValueError, subprocess.CalledProcessError) as error:
                last_error = error
            time.sleep(2)
        raise DeployError(f'Los contenedores iniciaron pero HTTPS no está listo: revisa DNS, 80/443 y logs de gateway ({type(last_error).__name__})')

    def init_admin(self, release: Path | None = None) -> None:
        self.compose(release or self.current(), '--profile', 'tools', 'run', '--rm', '-T', '--no-deps', 'admin')

    def init_condominio(self) -> None:
        self.compose(self.current(), '--profile', 'tools', 'run', '--rm', '-T', '--no-deps', 'catalogo')

    def deploy(self, args) -> None:
        for value in (args.backend_sha, args.frontend_sha):
            if not re.fullmatch(r'[0-9a-f]{40}', value):
                raise DeployError('Indica SHA completos aprobados de ambos repositorios')
        if args.build:
            if args.api_image or args.web_image:
                raise DeployError('No mezclar --build con imágenes precompiladas')
            total_kib = int(next(line.split()[1] for line in Path('/proc/meminfo').read_text().splitlines() if line.startswith('MemTotal:')))
            if total_kib < 3 * 1024 * 1024:
                raise DeployError('Compilar requiere al menos 3 GiB de RAM disponibles en la máquina; usa imágenes precompiladas')
        elif not all(re.fullmatch(r'[A-Za-z0-9./:_-]+@sha256:[a-f0-9]{64}', value or '') for value in (args.api_image, args.web_image)):
            raise DeployError('Usa --build o dos imágenes precompiladas con @sha256')
        self.releases.mkdir(parents=True, exist_ok=True, mode=0o700)
        release_id = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + args.backend_sha[:7] + '-' + args.frontend_sha[:7] + '-' + uuid.uuid4().hex[:6]
        candidate = self.releases / release_id
        candidate.mkdir(mode=0o700)
        for folder, repo, sha in [('backend', 'be_boilerplate_is_2026', args.backend_sha), ('frontend', 'fe_boilerplate_is_2026', args.frontend_sha)]:
            dest = candidate / folder
            subprocess.run(['git', 'init', '-q', str(dest)], check=True)
            subprocess.run(['git', '-C', str(dest), 'remote', 'add', 'origin', f'https://github.com/ArmandoAgui/{repo}.git'], check=True)
            subprocess.run(['git', '-C', str(dest), 'fetch', '--depth', '1', 'origin', sha], check=True)
            subprocess.run(['git', '-C', str(dest), 'checkout', '--detach', '-q', 'FETCH_HEAD'], check=True)
            actual = subprocess.check_output(['git', '-C', str(dest), 'rev-parse', 'HEAD'], text=True).strip()
            if actual != sha:
                raise DeployError('El commit obtenido no coincide con el solicitado')
        data = {key: self.settings[key] for key in ('NODE_IMAGE', 'POSTGRES_IMAGE', 'CADDY_IMAGE')}
        data.update({'BACKEND_SHA': args.backend_sha, 'FRONTEND_SHA': args.frontend_sha, 'API_IMAGE': args.api_image or f'sonnet5-api:{release_id}', 'WEB_IMAGE': args.web_image or f'sonnet5-web:{release_id}', 'created_at': dt.datetime.now(dt.timezone.utc).isoformat()})
        atomic_json(candidate / 'release.json', data)
        self.compose(candidate, 'config', '--quiet')
        if args.build:
            # Deliberately sequential: avoid two simultaneous Node builds on a small VM.
            self.compose(candidate, 'build', 'api')
            self.compose(candidate, 'build', 'web')
        else:
            self.compose(candidate, 'pull', 'api', 'web')
        for key in ('API_IMAGE', 'WEB_IMAGE'):
            label = subprocess.check_output(['docker', 'image', 'inspect', '--format', '{{index .Config.Labels "org.opencontainers.image.revision"}}', data[key]], text=True, env=self.docker_env()).strip()
            if label != data['BACKEND_SHA' if key == 'API_IMAGE' else 'FRONTEND_SHA']:
                raise DeployError(f'La etiqueta de revisión de {key} no coincide con la release')
            data[key + '_ID'] = self.image_id(data[key])
        atomic_json(candidate / 'release.json', data)
        current = self.current(optional=True)
        if current:
            self.backup(current)
            self.compose(current, 'stop', 'gateway', 'web', 'api')
            self.activate_link('previous', current)
        # A failed migration/deploy remains the current candidate. Never silently start
        # an old application against a schema that may already have changed.
        self.activate_link('current', candidate)
        self.up(candidate)
        self.init_admin(candidate)
        print(f'Release desplegada: {release_id}')

    def backup(self, release: Path | None = None) -> Path:
        release = release or self.current()
        self.backups.mkdir(parents=True, exist_ok=True, mode=0o700)
        backup_id = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:6]
        pending = self.backups / (backup_id + '.incomplete')
        pending.mkdir(mode=0o700)
        running = self.compose(release, 'ps', '--status', 'running', '--services', capture_output=True, text=True).stdout.splitlines()
        writers = [name for name in ('web', 'api') if name in running]
        try:
            if writers:
                self.compose(release, 'stop', *writers)
            with (pending / 'database.dump').open('wb') as dest:
                self.compose(release, 'exec', '-T', 'postgres', 'pg_dump', '-U', 'postgres', '-d', 'sonnet5', '--format=custom', '--no-owner', stdout=dest)
            with (pending / 'uploads.tar.gz').open('wb') as dest:
                self.compose(release, 'run', '--rm', '-T', '--no-deps', '--entrypoint', 'tar', 'api', '-czf', '-', '-C', '/uploads', '.', stdout=dest)
            atomic_json(pending / 'manifest.json', {'release': release.name, 'images': self.manifest(release), 'created_at': dt.datetime.now(dt.timezone.utc).isoformat()})
            files = ('database.dump', 'uploads.tar.gz', 'manifest.json')
            (pending / 'checksums.txt').write_text(''.join(f'{sha_file(pending / name)}  {name}\n' for name in files))
            complete = self.backups / backup_id
            os.replace(pending, complete)
        finally:
            if writers:
                self.compose(release, 'up', '-d', '--no-deps', '--wait', '--wait-timeout', '180', 'api', 'web')
        self.upload_backup(complete)
        self.prune_backups()
        print(f'Respaldo completo: {complete}')
        return complete

    def upload_backup(self, backup: Path) -> None:
        bucket = self.settings.get('BACKUP_S3_BUCKET')
        if not bucket:
            print('Copia local creada; S3 no está configurado. Conserva una copia fuera del servidor.')
            return
        try:
            import boto3  # Host package python3-boto3; AWS instance role, never embedded keys.
        except ImportError as error:
            raise DeployError('Falta python3-boto3 para la copia a S3') from error
        prefix = self.settings.get('BACKUP_S3_PREFIX', 'sonnet5').strip('/')
        try:
            client = boto3.client('s3')
            for file in sorted(backup.iterdir()):
                client.upload_file(str(file), bucket, f'{prefix}/{backup.name}/{file.name}', ExtraArgs={'ServerSideEncryption': 'AES256'})
        except Exception as error:
            raise DeployError(f'Falló la copia S3 ({type(error).__name__}); el respaldo local se conserva y no se aplica retención') from None
        print(f'Respaldo copiado a S3 privado: {bucket}/{prefix}/{backup.name}')

    def prune_backups(self) -> None:
        cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=int(self.settings.get('BACKUP_RETENTION_DAYS', '7')))
        for backup in self.backups.iterdir():
            if not backup.is_dir() or backup.is_symlink() or not re.fullmatch(r'\d{8}T\d{6}Z-[a-f0-9]{6}', backup.name):
                continue
            manifest = json.loads((backup / 'manifest.json').read_text())
            if dt.datetime.fromisoformat(manifest['created_at']) < cutoff:
                shutil.rmtree(backup)

    @staticmethod
    def validate_backup(backup: Path) -> dict:
        expected = {'database.dump', 'uploads.tar.gz', 'manifest.json'}
        found = set()
        for line in (backup / 'checksums.txt').read_text().splitlines():
            match = re.fullmatch(r'([a-f0-9]{64})  ([A-Za-z0-9_.-]+)', line)
            if not match or match[2] not in expected or match[2] in found:
                raise DeployError('Índice de respaldo inválido')
            file = backup / match[2]
            if file.is_symlink() or sha_file(file) != match[1]:
                raise DeployError('Respaldo dañado o modificado')
            found.add(match[2])
        if found != expected:
            raise DeployError('Respaldo incompleto')
        with tarfile.open(backup / 'uploads.tar.gz', 'r:gz') as archive:
            for member in archive.getmembers():
                path = PurePosixPath(member.name)
                if path.is_absolute() or '..' in path.parts or not (member.isfile() or member.isdir()):
                    raise DeployError('Archivo de fotografías contiene rutas o enlaces no permitidos')
        return json.loads((backup / 'manifest.json').read_text())

    def restore(self, backup: Path) -> None:
        backup = backup.resolve()
        manifest = self.validate_backup(backup)
        release = self.current()
        self.compose(release, 'stop', 'gateway', 'web', 'api')
        with (backup / 'database.dump').open('rb') as source:
            self.compose(release, 'exec', '-T', 'postgres', 'pg_restore', '-U', 'postgres', '-d', 'sonnet5', '--role=sonnet5_owner', '--clean', '--if-exists', '--no-owner', '--single-transaction', '--exit-on-error', stdin=source)
        # PostgreSQL default privileges also apply while restoring objects.
        # Explicitly re-establish reserved permissions before reopening traffic.
        self.compose(release, 'exec', '-T', 'postgres', 'psql', '-U', 'postgres', '-d', 'sonnet5', '-v', 'ON_ERROR_STOP=1', '-c', 'REVOKE ALL ON TABLE public._prisma_migrations FROM sonnet5_app; REVOKE CREATE ON SCHEMA public FROM sonnet5_app, PUBLIC;')
        with (backup / 'uploads.tar.gz').open('rb') as source:
            self.compose(release, 'run', '--rm', '-T', '--no-deps', '--user', '1000:1000', '--entrypoint', 'sh', 'api', '-c', 'set -eu; find /uploads -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +; tar -xzf - -C /uploads --no-same-owner; chmod 750 /uploads', stdin=source)
        print(f'Datos restaurados. La aplicación permanece detenida. Release del respaldo: {manifest["release"]}')
        print('Selecciona una release compatible con rollback --schema-compatible antes de reabrir tráfico.')

    def rollback(self, release_id: str) -> None:
        release = self.release(release_id)
        self.verify_images(release)
        current = self.current()
        self.compose(current, 'stop', 'gateway', 'web', 'api')
        # No migrations: operator explicitly attests schema compatibility or restored DB.
        self.activate_link('previous', current)
        self.activate_link('current', release)
        self.compose(release, 'up', '-d', '--no-deps', '--wait', '--wait-timeout', '180', 'api', 'web', 'gateway')
        self.probe_https(release)
        print(f'Aplicación activada: {release_id}. No se deshicieron migraciones.')


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, default=Path('/etc/sonnet5/platform.env'))
    commands = parser.add_subparsers(dest='command', required=True)
    for name in ('up', 'stop', 'status', 'backup', 'init-admin', 'init-condominio'):
        commands.add_parser(name)
    deploy = commands.add_parser('deploy')
    deploy.add_argument('--backend-sha', required=True)
    deploy.add_argument('--frontend-sha', required=True)
    deploy.add_argument('--build', action='store_true')
    deploy.add_argument('--api-image')
    deploy.add_argument('--web-image')
    restore = commands.add_parser('restore')
    restore.add_argument('backup', type=Path)
    restore.add_argument('--confirm-restore', action='store_true', required=True)
    rollback = commands.add_parser('rollback')
    rollback.add_argument('release')
    rollback.add_argument('--schema-compatible', action='store_true', required=True)
    logs = commands.add_parser('logs')
    logs.add_argument('service', choices=['api', 'web', 'gateway', 'postgres', 'migrate'])
    args = parser.parse_args(argv)
    os.umask(0o077)
    def interrupted(_signum, _frame):
        raise DeployError('Operación interrumpida; revisar el estado antes de reintentar')
    signal.signal(signal.SIGTERM, interrupted)
    try:
        app = Platform(args.config)
        if args.command == 'status':
            app.compose(app.current(), 'ps', '--all')
        elif args.command == 'logs':
            app.compose(app.current(), 'logs', '--tail', '100', args.service)
        else:
            with app.lock():
                if args.command == 'deploy':
                    app.deploy(args)
                elif args.command == 'up':
                    app.up()
                elif args.command == 'stop':
                    app.compose(app.current(), 'stop')
                elif args.command == 'backup':
                    app.backup()
                elif args.command == 'init-admin':
                    app.init_admin()
                elif args.command == 'init-condominio':
                    app.init_condominio()
                elif args.command == 'restore':
                    app.restore(args.backup)
                elif args.command == 'rollback':
                    app.rollback(args.release)
        return 0
    except (DeployError, OSError, ValueError, subprocess.SubprocessError) as error:
        print(f'ERROR: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
