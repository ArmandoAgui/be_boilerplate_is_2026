#!/usr/bin/env python3
"""Arranca la plataforma local con el mismo Compose y seed del despliegue."""
import argparse
import os
from pathlib import Path
import secrets
import subprocess

ROOT = Path(__file__).resolve().parents[1]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--frontend', type=Path, required=True)
    parser.add_argument('--build', action='store_true')
    parser.add_argument('--seed', action='store_true')
    args = parser.parse_args()
    frontend = args.frontend.resolve()
    if not (frontend / 'Dockerfile').is_file():
        parser.error('El frontend debe contener su Dockerfile')
    os.umask(0o077)
    state = ROOT / '.local-platform'
    state.mkdir(mode=0o700, exist_ok=True)
    for folder in ['secrets', 'seed-private']:
        (state / folder).mkdir(mode=0o700, exist_ok=True)
    for name in ['postgres_password', 'db_owner_password', 'db_app_password', 'jwt_secret', 'admin_password']:
        file = state / 'secrets' / name
        if not file.exists():
            file.write_text('Aa1!' + secrets.token_hex(32))
            file.chmod(0o444)
    values = dict(line.split('=', 1) for line in (ROOT/'deploy/base-images.env').read_text().splitlines() if line and not line.startswith('#'))
    values.update(STACK_NAME='sonnet5-local', SECRETS_DIR=str(state/'secrets'), DOMAIN='localhost',
                  ACME_EMAIL='local@sonnet5.test', ADMIN_EMAIL='bootstrap@sonnet5.test',
                  BIND_ADDRESS='127.0.0.1', HTTP_PORT='8080', HTTPS_PORT='8443',
                  CORS_ORIGIN='https://localhost:8443', BACKEND_CONTEXT=str(ROOT), FRONTEND_CONTEXT=str(frontend),
                  API_IMAGE='sonnet5-api:local', WEB_IMAGE='sonnet5-web:local')
    config = state / 'platform.env'
    config.write_text(''.join(f'{k}={v}\n' for k, v in values.items()))
    config.chmod(0o600)
    command = ['docker', 'compose', '--env-file', str(config), '-f', str(ROOT/'deploy/compose.production.yml')]
    if args.build:
        for service in ['api', 'web']:
            subprocess.run(command + ['build', service], check=True)
    subprocess.run(command + ['up', '-d', '--wait', '--wait-timeout', '180', 'postgres', 'migrate', 'api', 'web', 'gateway'], check=True)
    if args.seed:
        subprocess.run(command + ['--profile', 'tools', 'run', '--rm', '-T', '--no-deps',
                       '-e', 'SEED_DEMO=true', '-e', 'SEED_CREDENTIALS_FILE=/seed-private/cuentas-qa.json',
                       '-v', str(state/'seed-private')+':/seed-private', 'api', 'node', 'deploy/seed-demo.mjs'], check=True)
    print('Plataforma: https://localhost:8443 — CA local de Caddy; ver docs/05-instalacion-local.md')
    print('Credenciales privadas, si se creó el dataset: .local-platform/seed-private/cuentas-qa.json')

if __name__ == '__main__':
    main()
