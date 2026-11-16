import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
import types
import unittest
from unittest.mock import patch

DEPLOY = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('plataforma', DEPLOY / 'plataforma.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
Platform, DeployError = module.Platform, module.DeployError


class DeploymentControls(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='sonnet5-unit-')
        self.root = Path(self.temp.name)
        self.config = self.root / 'platform.env'
        self.values = {
            'STACK_NAME': 'sonnet5-unit', 'STACK_DIR': str(self.root / 'stack'),
            'STATE_DIR': str(self.root / 'state'), 'BACKUP_DIR': str(self.root / 'backups'),
            'SECRETS_DIR': str(self.root / 'secrets'), 'DOMAIN': 'localhost',
            'BIND_ADDRESS': '127.0.0.1', 'ACME_EMAIL': 'ops@example.com',
            'ADMIN_EMAIL': 'admin@example.com', 'NODE_IMAGE': 'node@sha256:' + 'a' * 64,
            'POSTGRES_IMAGE': 'postgres@sha256:' + 'b' * 64, 'CADDY_IMAGE': 'caddy@sha256:' + 'c' * 64,
        }
        self.write_config()
        self.app = Platform(self.config)
        self.release = self.root / 'stack/releases/test'
        self.release.mkdir(parents=True)
        self.manifest = {'BACKEND_SHA': 'a' * 40, 'FRONTEND_SHA': 'b' * 40, 'API_IMAGE': 'sonnet5-api:test', 'WEB_IMAGE': 'sonnet5-web:test'}
        (self.release / 'release.json').write_text(json.dumps(self.manifest))
        (self.root / 'stack/current').symlink_to(self.release)

    def tearDown(self):
        self.temp.cleanup()

    def write_config(self):
        self.config.write_text(''.join(f'{key}={value}\n' for key, value in self.values.items()))
        self.config.chmod(0o600)

    def backup_fixture(self, malicious=False):
        path = self.root / 'backup'
        path.mkdir()
        (path / 'database.dump').write_bytes(b'dummy PG dump')
        (path / 'manifest.json').write_text(json.dumps({'release': 'test'}))
        with tarfile.open(path / 'uploads.tar.gz', 'w:gz') as archive:
            entry = tarfile.TarInfo('../outside' if malicious else './picture.webp')
            entry.size = 3
            archive.addfile(entry, io.BytesIO(b'pic'))
        (path / 'checksums.txt').write_text(''.join(f'{module.sha_file(path/name)}  {name}\n' for name in ['database.dump', 'uploads.tar.gz', 'manifest.json']))
        return path

    def test_atomic_manifest_is_private_and_replaces_previous_content(self):
        file = self.root / 'manifest.json'
        module.atomic_json(file, {'version': 1})
        module.atomic_json(file, {'version': 2})
        self.assertEqual(json.loads(file.read_text()), {'version': 2})
        self.assertEqual(file.stat().st_mode & 0o777, 0o600)
        self.assertFalse((self.root / 'manifest.json.tmp').exists())

    def test_s3_failure_keeps_local_backup_and_returns_error(self):
        self.app.settings['BACKUP_S3_BUCKET'] = 'backup-private'
        backup = self.backup_fixture()
        fake = types.SimpleNamespace(client=lambda _service: types.SimpleNamespace(upload_file=lambda *a, **k: (_ for _ in ()).throw(RuntimeError('failed'))))
        with patch.dict('sys.modules', {'boto3': fake}):
            with self.assertRaisesRegex(DeployError, 'respaldo local se conserva'):
                self.app.upload_backup(backup)
        self.assertTrue((backup / 'database.dump').exists())

    def test_s3_upload_is_encrypted_and_contains_no_secret_files(self):
        self.app.settings['BACKUP_S3_BUCKET'] = 'backup-private'
        backup = self.backup_fixture()
        uploads = []
        fake = types.SimpleNamespace(client=lambda _service: types.SimpleNamespace(upload_file=lambda *a, **k: uploads.append((a, k))))
        with patch.dict('sys.modules', {'boto3': fake}), contextlib.redirect_stdout(io.StringIO()):
            self.app.upload_backup(backup)
        self.assertEqual(len(uploads), 4)
        self.assertTrue(all(options['ExtraArgs'] == {'ServerSideEncryption': 'AES256'} for _args, options in uploads))
        self.assertEqual({Path(args[0]).name for args, _ in uploads}, {'database.dump', 'uploads.tar.gz', 'manifest.json', 'checksums.txt'})

    def test_configuration_is_data_not_shell(self):
        self.config.write_text('DOMAIN=$(touch /tmp/not-allowed)\n')
        with self.assertRaises(DeployError):
            module.read_env(self.config)

    def test_refuses_public_localhost_test_configuration(self):
        self.values['BIND_ADDRESS'] = '0.0.0.0'
        self.write_config()
        with self.assertRaises(DeployError):
            Platform(self.config)

    def test_refuses_world_readable_configuration(self):
        self.config.chmod(0o644)
        with self.assertRaises(DeployError):
            Platform(self.config)

    def test_lock_prevents_concurrent_backup_and_deployment(self):
        with self.app.lock():
            with self.assertRaises(DeployError):
                with Platform(self.config).lock():
                    self.fail('La segunda operación no debía entrar')

    def test_release_cannot_escape_by_path_or_symlink(self):
        with self.assertRaises(DeployError):
            self.app.release('../other')
        (self.root / 'stack/releases/escape').symlink_to(self.root)
        with self.assertRaises(DeployError):
            self.app.release('escape')

    def test_resume_writers_when_dump_fails(self):
        calls = []
        def compose(release, *args, **kwargs):
            calls.append(args)
            if args[0] == 'ps':
                return types.SimpleNamespace(stdout='postgres\nweb\napi\n')
            if args[0] == 'exec':
                raise subprocess.CalledProcessError(1, ['pg_dump'])
        with patch.object(self.app, 'compose', side_effect=compose):
            with self.assertRaises(subprocess.CalledProcessError):
                self.app.backup(self.release)
        self.assertTrue(any(c[0] == 'stop' for c in calls))
        self.assertTrue(any(c[0] == 'up' and '--no-deps' in c and c[-2:] == ('api', 'web') for c in calls))

    def test_restore_rejects_modified_backup_before_stopping_application(self):
        backup = self.backup_fixture()
        (backup / 'database.dump').write_bytes(b'modified')
        with patch.object(self.app, 'compose') as compose:
            with self.assertRaises(DeployError):
                self.app.restore(backup)
            compose.assert_not_called()

    def test_restore_rejects_path_traversal_in_uploaded_files(self):
        with self.assertRaises(DeployError):
            self.app.validate_backup(self.backup_fixture(malicious=True))

    def test_restore_requires_explicit_flag(self):
        with contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit) as exit_code:
                module.main(['--config', str(self.config), 'restore', '/tmp/backup'])
        self.assertEqual(exit_code.exception.code, 2)

    def test_mutated_image_tag_cannot_be_started(self):
        self.manifest['API_IMAGE_ID'] = 'sha256:original'
        (self.release / 'release.json').write_text(json.dumps(self.manifest))
        with patch.object(self.app, 'image_id', return_value='sha256:changed'):
            with self.assertRaises(DeployError):
                self.app.verify_images(self.release)

    def test_dry_run_does_not_need_root_or_write_host_configuration(self):
        env = os.environ.copy()
        env.pop('SSH_CONNECTION', None)
        command = ['bash', str(DEPLOY/'bootstrap-ubuntu.sh'), '--domain', 'sonnet5.example.com', '--email', 'ops@example.com', '--ssh-cidr', '203.0.113.7/32', '--dry-run']
        result = subprocess.run(command, text=True, capture_output=True, env=env)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('PLAN SIN CAMBIOS', result.stdout)

    def test_bootstrap_refuses_firewall_lockout(self):
        env = os.environ.copy()
        env['SSH_CONNECTION'] = '198.51.100.22 5566 10.0.0.1 22'
        command = ['bash', str(DEPLOY/'bootstrap-ubuntu.sh'), '--domain', 'sonnet5.example.com', '--email', 'ops@example.com', '--ssh-cidr', '203.0.113.7/32', '--dry-run']
        result = subprocess.run(command, text=True, capture_output=True, env=env)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('bloquear el acceso', result.stderr)


if __name__ == '__main__':
    unittest.main()
