#!/bin/sh
set -eu
# Official PostgreSQL entrypoint runs this once, only on an empty volume.
SONNET5_OWNER_PASSWORD=$(cat /run/secrets/db_owner_password)
SONNET5_APP_PASSWORD=$(cat /run/secrets/db_app_password)
export SONNET5_OWNER_PASSWORD SONNET5_APP_PASSWORD
psql -v ON_ERROR_STOP=1 --username postgres --dbname postgres <<'SQL'
\getenv owner_password SONNET5_OWNER_PASSWORD
\getenv app_password SONNET5_APP_PASSWORD
CREATE ROLE sonnet5_owner LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD :'owner_password';
CREATE ROLE sonnet5_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD :'app_password';
CREATE DATABASE sonnet5 OWNER sonnet5_owner;
\connect sonnet5
ALTER SCHEMA public OWNER TO sonnet5_owner;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO sonnet5_app;
ALTER DEFAULT PRIVILEGES FOR ROLE sonnet5_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sonnet5_app;
ALTER DEFAULT PRIVILEGES FOR ROLE sonnet5_owner IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO sonnet5_app;
ALTER DEFAULT PRIVILEGES FOR ROLE sonnet5_owner IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO sonnet5_app;
SQL
unset SONNET5_OWNER_PASSWORD SONNET5_APP_PASSWORD
