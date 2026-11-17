#!/usr/bin/env python3
"""Build and verify only an isolated localhost stack; never uses production env."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import secrets
import re
import shutil
import socket
import subprocess
import tempfile
import uuid

DEPLOY = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('plataforma', DEPLOY/'plataforma.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def free_port():
    with socket.socket() as connection:
        connection.bind(('127.0.0.1', 0))
        return connection.getsockname()[1]


def fixture(app, phase, snapshot=None):
    args = ['--profile', 'tools', 'run', '--rm', '-T', '--no-deps', '--env', f'SMOKE_PHASE={phase}']
    if snapshot:
        args += ['--env', 'SMOKE_SNAPSHOT='+json.dumps(snapshot)]
    args += ['admin', 'node', '--input-type=module']
    try:
        result = app.compose(app.current(), *args, input=(DEPLOY/'tests/fixture-api.mjs').read_text(), capture_output=True, text=True)
    except subprocess.CalledProcessError as error:
        raise RuntimeError('Falló la sonda de API: '+error.stderr) from None
    return json.loads(result.stdout.strip().splitlines()[-1])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--frontend', type=Path)
    parser.add_argument('--cleanup', type=Path, help='Eliminar exclusivamente un stack conservado por este smoke')
    parser.add_argument('--build', action='store_true')
    parser.add_argument('--api-image', default='sonnet5-api:docker-test')
    parser.add_argument('--web-image', default='sonnet5-web:docker-test')
    parser.add_argument('--keep', action='store_true', help='Conservar solo el stack aislado para pruebas de navegador')
    args = parser.parse_args()
    os.umask(0o077)
    if args.cleanup:
        root = args.cleanup.resolve()
        if root.parent != Path('/tmp') or not re.fullmatch(r'sonnet5-smoke-[a-f0-9]{8}-[a-z0-9_]{8}', root.name):
            raise RuntimeError('Solo se limpian directorios aleatorios creados por este smoke')
        app = module.Platform(root / 'platform.env')
        project = root.name.rsplit('-', 1)[0]
        if app.settings['STACK_NAME'] != project or app.stack != root / 'stack':
            raise RuntimeError('La configuración no corresponde al proyecto temporal')
        with app.lock():
            app.compose(app.current(), 'down', '--volumes', '--remove-orphans')
        shutil.rmtree(root)
        print(f'Proyecto temporal eliminado: {project}')
        return 0
    if not args.frontend:
        parser.error('--frontend es obligatorio salvo al usar --cleanup')
    backend = DEPLOY.parent.resolve()
    frontend = args.frontend.resolve()
    if not (frontend/'Dockerfile').is_file():
        raise RuntimeError('Falta Dockerfile frontend')
    unique = 'sonnet5-smoke-'+uuid.uuid4().hex[:8]
    root = Path(tempfile.mkdtemp(prefix=unique+'-'))
    app = None
    try:
        if args.build:
            for source, image in [(backend,args.api_image),(frontend,args.web_image)]:
                subprocess.run(['docker','build','-t',image,str(source)],check=True)
        for folder in ['stack','state','backups','secrets']:
            (root/folder).mkdir(mode=0o700)
        for name in ['postgres_password','db_owner_password','db_app_password','jwt_secret','admin_password']:
            value='Aa1!'+secrets.token_hex(24) if name=='admin_password' else secrets.token_hex(32)
            (root/'secrets'/name).write_text(value+'\n')
            (root/'secrets'/name).chmod(0o444)
        base_images=module.read_env(DEPLOY/'base-images.env')
        config={'STACK_NAME':unique,'STACK_DIR':str(root/'stack'),'STATE_DIR':str(root/'state'),'BACKUP_DIR':str(root/'backups'),'SECRETS_DIR':str(root/'secrets'),'DOMAIN':'localhost','ACME_EMAIL':'ops@smoke.test','ADMIN_EMAIL':'admin@smoke.test','BIND_ADDRESS':'127.0.0.1','HTTP_PORT':str(free_port()),'HTTPS_PORT':str(free_port()),'BACKUP_RETENTION_DAYS':'7','BACKUP_S3_BUCKET':'','CUOTA_MENSUAL_USD':'50.00','CONDOMINIO_FILE':str(root/'condominio.json'),**base_images}
        file=root/'platform.env'
        file.write_text(''.join(f'{k}={v}\n' for k,v in config.items()))
        file.chmod(0o600)
        (root/'condominio.json').write_text(json.dumps({'torres':[{'nombre':'Torre Smoke','secciones':[{'nombre':'Norte','unidades':[{'codigo':'D-101'},{'codigo':'D-102'}]}]}]}))
        (root/'condominio.json').chmod(0o444)
        release=root/'stack/releases/smoke'
        release.mkdir(parents=True)
        (release/'backend').symlink_to(backend)
        (release/'frontend').symlink_to(frontend)
        data={'BACKEND_SHA':subprocess.check_output(['git','-C',str(backend),'rev-parse','HEAD'],text=True).strip(),'FRONTEND_SHA':subprocess.check_output(['git','-C',str(frontend),'rev-parse','HEAD'],text=True).strip(),'API_IMAGE':args.api_image,'WEB_IMAGE':args.web_image,**base_images}
        module.atomic_json(release/'release.json',data)
        (root/'stack/current').symlink_to(release)
        app=module.Platform(file)
        with app.lock():
            app.up()
            for _ in range(2):
                app.init_admin()
                app.init_condominio()
            snapshot=fixture(app,'create')
            module.atomic_json(root/'snapshot.json',snapshot)
            for service in ['postgres','api','web','gateway']:
                container=app.compose(release,'ps','-q',service,capture_output=True,text=True).stdout.strip()
                info=json.loads(subprocess.check_output(['docker','inspect',container],text=True))[0]
                bindings=info['HostConfig'].get('PortBindings') or {}
                if service!='gateway' and bindings:
                    raise RuntimeError('Se publicaron puertos internos: '+service)
                if service in ['api','web']:
                    if info['Config']['User'] not in ['node','1000','1000:1000'] or not info['HostConfig']['ReadonlyRootfs']:
                        raise RuntimeError('Aplicaciones deben correr sin root y con filesystem de solo lectura')
                env=info['Config'].get('Env',[])
                if service=='api' and any(s.startswith('JWT_SECRET=') or s.startswith('DATABASE_URL=') for s in env):
                    raise RuntimeError('Secretos visibles en configuración del contenedor')
            backup=app.backup()
            app.compose(release,'stop','gateway','web','api')
            mutation="import {Client} from 'pg';import {rm} from 'node:fs/promises';const db=new Client({connectionString:process.env.DATABASE_URL});await db.connect();await db.query(\"UPDATE incidencias SET descripcion='Dato alterado para probar recuperación'\");await db.end();await rm('/uploads/incidencias',{recursive:true,force:true});"
            app.compose(release,'run','--rm','-T','--no-deps','api','node','--input-type=module',input=mutation,text=True)
            app.restore(backup)
            app.rollback('smoke')
            verified=fixture(app,'verify',snapshot)
        print(json.dumps({'result':'passed','project':unique,'root':str(root),'https':f'https://localhost:{config["HTTPS_PORT"]}','verification':verified},ensure_ascii=False))
        return 0
    finally:
        if app and not args.keep:
            # This destructive cleanup exists ONLY in tests, for a fresh random project.
            if not app.settings['STACK_NAME'].startswith('sonnet5-smoke-') or not str(root).startswith('/tmp/sonnet5-smoke-'):
                raise RuntimeError('Se rechaza limpiar un proyecto ajeno a las pruebas')
            app.compose(app.current(),'down','--volumes','--remove-orphans')
        if args.keep:
            print(f'Stack de prueba conservado en {root}; nunca usar su configuración en producción.')


if __name__=='__main__':
    raise SystemExit(main())
