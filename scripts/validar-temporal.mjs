import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
function git(...args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 30000,
  });
}
function json(path) {
  return JSON.parse(
    readFileSync(new URL(path, new URL('../', import.meta.url)), 'utf8'),
  );
}

try {
  const manifest = json('package.json');
  const lock = json('package-lock.json');
  if (manifest.name !== lock.name || manifest.version !== lock.version) {
    throw new Error(
      'Nombre o versión no coinciden entre package.json y package-lock.json.',
    );
  }
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--base')) {
    throw new Error('Uso: node scripts/validar-temporal.mjs [--base SHA]');
  }
  let base = args[1];
  if (!base && process.env.GITHUB_EVENT_PATH) {
    const event = JSON.parse(
      readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'),
    );
    base = event.pull_request?.base?.sha;
  }
  if (base) {
    if (!/^[0-9a-f]{40,64}$/i.test(base))
      throw new Error('La base debe ser un SHA de commit.');
    git('rev-parse', '--verify', `${base}^{commit}`);
    git('diff', '--check', `${base}...HEAD`);
  }
  git('diff', '--check');
  git('diff', '--cached', '--check');
  console.log(
    'Validación temporal aprobada: JSON de paquetes y formato del diff.',
  );
  console.log(
    'Alcance limitado: no ejecuta instalación, lint, build, tests ni base de datos.',
  );
} catch (error) {
  console.error('Validación temporal fallida:', error.message);
  if (error.stdout) console.error(String(error.stdout));
  if (error.stderr) console.error(String(error.stderr));
  process.exitCode = 1;
}
