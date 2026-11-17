#!/bin/sh
set -eu
# Secrets stay in mounted files. Never print them or include them in argv.
if [ -n "${POSTGRES_PASSWORD_FILE:-}" ]; then
  if [ ! -r "$POSTGRES_PASSWORD_FILE" ]; then
    echo 'No se puede leer el secreto de PostgreSQL' >&2
    exit 1
  fi
  POSTGRES_PASSWORD=$(cat "$POSTGRES_PASSWORD_FILE")
  export POSTGRES_PASSWORD
  DATABASE_URL=$(node --input-type=module -e '
    const u = new URL("postgresql://localhost");
    u.hostname = process.env.POSTGRES_HOST || "postgres";
    u.port = process.env.POSTGRES_PORT || "5432";
    u.username = process.env.POSTGRES_USER || "sonnet5";
    u.password = process.env.POSTGRES_PASSWORD;
    u.pathname = "/" + (process.env.POSTGRES_DB || "sonnet5");
    u.searchParams.set("schema", "public");
    process.stdout.write(u.href);
  ')
  export DATABASE_URL
  unset POSTGRES_PASSWORD
fi
if [ -n "${JWT_SECRET_FILE:-}" ]; then
  if [ ! -r "$JWT_SECRET_FILE" ]; then
    echo 'No se puede leer el secreto JWT' >&2
    exit 1
  fi
  JWT_SECRET=$(cat "$JWT_SECRET_FILE")
  export JWT_SECRET
fi
exec "$@"
