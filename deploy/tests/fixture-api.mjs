// Only used by smoke-docker.py inside an isolated local test stack.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Client } from 'pg';
import sharp from 'sharp';
const base = 'http://api:3000/api/v1/';
const phase = process.env.SMOKE_PHASE ?? 'create';
const password = (
  await readFile(process.env.ADMIN_PASSWORD_FILE, 'utf8')
).trimEnd();
async function api(path, init = {}, token) {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData))
    headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(new URL(path, base), {
    ...init,
    headers,
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok)
    throw new Error(`${init.method ?? 'GET'} ${path}: ${response.status}`);
  return response;
}
const auth = await (
  await api('auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password }),
  })
).json();
const admin = auth.accessToken;
const db = new Client({ connectionString: process.env.DATABASE_URL });
try {
  await db.connect();
  const role = (
    await db.query(
      'SELECT current_user, rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname=current_user',
    )
  ).rows[0];
  if (
    role.current_user !== 'sonnet5_app' ||
    role.rolsuper ||
    role.rolcreatedb ||
    role.rolcreaterole
  )
    throw new Error(
      'La aplicación tiene privilegios administrativos de PostgreSQL',
    );
  for (const query of [
    'CREATE TABLE public.no_debe_crearse (id integer)',
    'SELECT * FROM public._prisma_migrations LIMIT 1',
  ]) {
    let denied = false;
    try {
      await db.query(query);
    } catch (error) {
      if (error.code === '42501') denied = true;
      else throw error;
    }
    if (!denied)
      throw new Error(
        'La aplicación pudo ejecutar una operación reservada al migrador',
      );
  }
  if (phase === 'create') {
    const catalogo = await (
      await api('administracion/vinculos', {}, admin)
    ).json();
    const unidad = catalogo.unidades.find((u) => u.codigo === 'D-101');
    if (!unidad) throw new Error('Falta catálogo de unidades de prueba');
    const user = await (
      await api(
        'users',
        {
          method: 'POST',
          body: JSON.stringify({
            nombre: 'Residente Docker',
            email: 'residente@smoke.test',
            password: 'PruebaDocker123!',
          }),
        },
        admin,
      )
    ).json();
    await api(
      'administracion/vinculos',
      {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, unidadId: unidad.id }),
      },
      admin,
    );
    const session = await (
      await api('auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'residente@smoke.test',
          password: 'PruebaDocker123!',
        }),
      })
    ).json();
    const foto = await sharp({
      create: { width: 4, height: 4, channels: 3, background: '#c0d0e0' },
    })
      .png()
      .toBuffer();
    const form = new FormData();
    form.set('lugarTipo', 'UNIDAD');
    form.set('unidadId', unidad.id);
    form.set('categoria', 'OTRO');
    form.set(
      'descripcion',
      'Reporte privado para probar respaldo y restauración',
    );
    form.append('fotos', new Blob([foto], { type: 'image/png' }), 'prueba.png');
    const creada = await (
      await api(
        'incidencias',
        { method: 'POST', body: form },
        session.accessToken,
      )
    ).json();
    const detalle = await (
      await api(`incidencias/${creada.id}`, {}, session.accessToken)
    ).json();
    const idFoto = detalle.evidencias[0].id;
    const imagen = Buffer.from(
      await (
        await api(
          `incidencias/${creada.id}/evidencias/${idFoto}`,
          {},
          session.accessToken,
        )
      ).arrayBuffer(),
    );
    const count = Number(
      (await db.query('SELECT count(*) FROM users')).rows[0].count,
    );
    if (count !== 2)
      throw new Error('Se cargaron usuarios adicionales de demostración');
    process.stdout.write(
      JSON.stringify({
        incidenciaId: creada.id,
        fotoId: idFoto,
        sha256: createHash('sha256').update(imagen).digest('hex'),
        usuarioId: user.id,
        unidadId: unidad.id,
      }) + '\n',
    );
  } else if (phase === 'verify') {
    const saved = JSON.parse(process.env.SMOKE_SNAPSHOT);
    const session = await (
      await api('auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'residente@smoke.test',
          password: 'PruebaDocker123!',
        }),
      })
    ).json();
    const detalle = await (
      await api(`incidencias/${saved.incidenciaId}`, {}, session.accessToken)
    ).json();
    if (
      detalle.descripcion !==
      'Reporte privado para probar respaldo y restauración'
    )
      throw new Error('La base no fue restaurada');
    const imagen = Buffer.from(
      await (
        await api(
          `incidencias/${saved.incidenciaId}/evidencias/${saved.fotoId}`,
          {},
          session.accessToken,
        )
      ).arrayBuffer(),
    );
    if (createHash('sha256').update(imagen).digest('hex') !== saved.sha256)
      throw new Error('La fotografía no se recuperó íntegramente');
    process.stdout.write(
      JSON.stringify({
        restored: true,
        databasePrivileges: 'restricted',
        photoHashMatches: true,
      }) + '\n',
    );
  } else throw new Error('Fase de prueba desconocida');
} finally {
  await db.end();
}
