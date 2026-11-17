import { spawnSync } from 'node:child_process';
import { Client } from 'pg';
const result = spawnSync('./node_modules/.bin/prisma', ['migrate', 'deploy'], {
  stdio: 'inherit',
});
if (result.error || result.status !== 0) process.exit(result.status ?? 1);
const db = new Client({ connectionString: process.env.DATABASE_URL });
try {
  await db.connect();
  await db.query(
    'REVOKE ALL ON TABLE public._prisma_migrations FROM sonnet5_app',
  );
} finally {
  await db.end();
}
