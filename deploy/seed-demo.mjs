import { PrismaClient } from '../dist/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import 'dotenv/config';
import sharp from 'sharp';
if (process.env.SEED_DEMO !== 'true')
  throw Error('Usa SEED_DEMO=true explícitamente para cargar datos ficticios');
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const now = new Date(),
  day = 86400000;
const at = (days, hour = 10) => {
  const d = new Date(now.getTime() - 6 * 3600000 + days * day);
  return new Date(
    d.toISOString().slice(0, 10) +
      `T${String(hour).padStart(2, '0')}:00:00-06:00`,
  );
};
const month = now.toISOString().slice(0, 7);
const previous = new Date(
  Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
)
  .toISOString()
  .slice(0, 7);
const specs = [
  ['admin', 'ADMINISTRADOR', 'Administración QA'],
  ['seguridad', 'SEGURIDAD', 'Seguridad QA'],
  ['aldia', 'RESIDENTE', 'Ana Al Día QA'],
  ['moroso', 'RESIDENTE', 'Mario Moroso QA'],
  ['compartido', 'RESIDENTE', 'Carlos Comparte Unidad QA'],
  ['multitorre', 'RESIDENTE', 'Marta Varias Torres QA'],
  ['limite', 'RESIDENTE', 'Laura Límite Reservas QA'],
  ['sinunidad', 'RESIDENTE', 'Sara Sin Unidad QA'],
  ['inactivo', 'RESIDENTE', 'Iván Inactivo QA'],
];
// Una segunda ejecución conserva los datos y las contraseñas existentes.
const existing = await db.user.findMany({
  where: { email: { in: specs.map(([key]) => key + '@sonnet5.test') } },
  select: { email: true, rol: true },
});
if (existing.length) {
  if (
    existing.length !== specs.length ||
    specs.some(
      ([key, rol]) =>
        !existing.some(
          (x) => x.email === key + '@sonnet5.test' && x.rol === rol,
        ),
    )
  ) {
    await db.$disconnect();
    throw Error('Dataset QA parcial o roles distintos; no se sobrescribe');
  }
  const units = await db.unidad.count({
    where: {
      codigo: {
        in: [
          'QA-1-101',
          'QA-1-201',
          'QA-1-301',
          'QA-2-101',
          'QA-2-201',
          'QA-2-301',
        ],
      },
    },
  });
  if (units !== 6) {
    await db.$disconnect();
    throw Error('Catálogo QA parcial; revisar antes de reintentar');
  }
  await db.$disconnect();
  console.log(
    JSON.stringify({
      estado: 'conservado',
      usuarios: existing.length,
      unidades: units,
    }),
  );
  process.exit(0);
}
const credentialFile = path.resolve(
  process.env.SEED_CREDENTIALS_FILE || '.seed-private/cuentas-qa.json',
);
await mkdir(path.dirname(credentialFile), { recursive: true, mode: 0o700 });
let saved;
try {
  saved = JSON.parse(await readFile(credentialFile, 'utf8'));
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
}
const accounts = await Promise.all(
  specs.map(async ([key, rol, nombre]) => {
    const prior = saved?.users?.find(
      (x) => x.key === key && x.email === key + '@sonnet5.test',
    );
    if (saved && !prior) throw Error('Archivo de credenciales incompleto');
    const password = prior?.password || 'Qa!' + randomBytes(24).toString('hex');
    if (typeof password !== 'string' || password.length < 12)
      throw Error('Contraseña QA inválida');
    return {
      key,
      email: key + '@sonnet5.test',
      rol,
      nombre,
      password,
      hash: await bcrypt.hash(password, 12),
    };
  }),
);
if (!saved)
  await writeFile(
    credentialFile,
    JSON.stringify({ users: accounts.map(({ hash, ...a }) => a) }, null, 2),
    { mode: 0o600, flag: 'wx' },
  );
const photo = {
  filename: randomUUID() + '.png',
  buffer: await sharp({
    create: { width: 240, height: 160, channels: 3, background: '#607080' },
  })
    .png()
    .toBuffer(),
};
const photoDir = path.resolve(
  process.env.UPLOADS_DIR || './uploads',
  'incidencias',
);
await mkdir(photoDir, { recursive: true, mode: 0o750 });
await writeFile(path.join(photoDir, photo.filename), photo.buffer, {
  mode: 0o640,
  flag: 'wx',
});
let committed = false;
try {
  const result = await db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(17002026)`;
      if (
        await tx.user.count({
          where: { email: { in: accounts.map((a) => a.email) } },
        })
      )
        throw Error('Ya existen cuentas QA: se rechaza sobrescribirlas');
      const users = {};
      for (const a of accounts)
        users[a.key] = await tx.user.create({
          data: {
            email: a.email,
            nombre: a.nombre,
            rol: a.rol,
            passwordHash: a.hash,
            isActive: a.key !== 'inactivo',
            telefono: '70000000',
          },
        });
      const towers = [],
        units = [];
      for (const name of ['Torre QA Norte', 'Torre QA Sur']) {
        const t = await tx.torre.create({ data: { nombre: name } });
        towers.push(t);
        const s = await tx.seccion.create({
          data: { nombre: 'Sección QA', torreId: t.id },
        });
        for (let n = 1; n <= 3; n++)
          units.push(
            await tx.unidad.create({
              data: {
                codigo: `QA-${towers.length}-${n}01`,
                torreId: t.id,
                seccionId: s.id,
                cuotaMensual: '50.00',
              },
            }),
          );
      }
      const links = {
        aldia: [0],
        compartido: [0],
        moroso: [1],
        multitorre: [2, 3],
        limite: [4],
        inactivo: [5],
      };
      for (const [key, indices] of Object.entries(links))
        for (const i of indices)
          await tx.usuarioUnidad.create({
            data: { userId: users[key].id, unidadId: units[i].id },
          });
      for (const [i, key] of [
        'aldia',
        'compartido',
        'moroso',
        'multitorre',
        'limite',
      ].entries())
        await tx.preferenciaDirectorio.create({
          data: {
            userId: users[key].id,
            visible: key !== 'compartido',
            mostrarCorreo: true,
            mostrarTelefono: key === 'aldia',
            mostrarUnidad: true,
          },
        });
      const areas = [];
      for (const [nombre, capacidad] of [
        ['Salón QA', 40],
        ['Piscina QA', 30],
        ['Asador QA', 12],
        ['Área inactiva QA', 5],
      ])
        areas.push(
          await tx.areaComun.create({
            data: {
              nombre,
              capacidad,
              activa: capacidad !== 5,
              horarios: {
                create: Array.from({ length: 7 }, (_, diaSemana) => ({
                  diaSemana,
                  horaInicio: '06:00',
                  horaFin: '22:00',
                })),
              },
            },
          }),
        );
      for (let i = 0; i < units.length; i++)
        await tx.cuota.create({
          data: {
            unidadId: units[i].id,
            concepto: 'Cuota de mantenimiento',
            periodo: month,
            monto: '50.00',
            fechaVencimiento: at(10, 0),
            estado: 'PENDIENTE',
          },
        });
      const deuda = await tx.cuota.create({
        data: {
          unidadId: units[1].id,
          periodo: previous,
          monto: '50.00',
          fechaVencimiento: at(-15, 0),
          concepto: 'Cuota de mantenimiento',
          estado: 'PENDIENTE',
        },
      });
      const pagada = await tx.cuota.create({
        data: {
          unidadId: units[0].id,
          periodo: previous,
          monto: '50.00',
          fechaVencimiento: at(-20, 0),
          estado: 'PAGADA',
          fechaPago: at(-10),
          recargoAplicado: '2.50',
        },
      });
      await tx.pago.create({
        data: {
          referencia: 'PAG-QA-' + Date.now().toString().slice(-10),
          cuotaId: pagada.id,
          userId: users.aldia.id,
          monto: '52.50',
          ultimos4: '4242',
          idempotencyKey: randomUUID(),
          estado: 'APROBADO',
        },
      });
      await tx.cuota.create({
        data: {
          unidadId: units[2].id,
          periodo: previous,
          concepto: 'Cuota de mantenimiento',
          monto: '50.00',
          fechaVencimiento: at(-20, 0),
          estado: 'ANULADA',
        },
      });
      const reservas = [];
      for (const [key, area, days, hour, estado] of [
        ['aldia', 0, 3, 10, 'PENDIENTE'],
        ['aldia', 1, 0, 20, 'CONFIRMADA'],
        ['limite', 0, 4, 10, 'CONFIRMADA'],
        ['limite', 1, 5, 10, 'CONFIRMADA'],
        ['multitorre', 2, 3, 12, 'CONFIRMADA'],
        ['compartido', 0, -3, 10, 'CONFIRMADA'],
        ['multitorre', 0, 6, 10, 'CANCELADA'],
      ])
        reservas.push(
          await tx.reserva.create({
            data: {
              userId: users[key].id,
              areaId: areas[area].id,
              inicio: at(days, hour),
              fin: at(days, hour + 1),
              asistentes: 2,
              estado,
              canceladaAt: estado === 'CANCELADA' ? now : null,
            },
          }),
        );
      for (const [i, estado] of [
        'ABIERTA',
        'ASIGNADA',
        'EN_PROCESO',
        'RESUELTA',
      ].entries()) {
        const inc = await tx.incidencia.create({
          data: {
            residenteId: users[i % 2 ? 'multitorre' : 'aldia'].id,
            lugarTipo: i % 2 ? 'AREA_COMUN' : 'UNIDAD',
            unidadId: i % 2 ? null : units[0].id,
            areaId: i % 2 ? areas[0].id : null,
            categoria: 'LIMPIEZA',
            descripcion: `[QA] Caso ${estado}: suciedad ficticia para comprobar seguimiento privado.`,
            estado,
            prioridad: i ? 'MEDIA' : null,
            responsableId: i ? users.seguridad.id : null,
          },
        });
        if (i)
          await tx.historialIncidencia.create({
            data: {
              incidenciaId: inc.id,
              campo: 'ESTADO',
              valorAnterior: 'ABIERTA',
              valorNuevo: estado,
              actorId: users.admin.id,
            },
          });
        if (!i)
          await tx.evidenciaIncidencia.create({
            data: {
              incidenciaId: inc.id,
              ruta: photo.filename,
              mime: 'image/png',
              tamanoBytes: photo.buffer.length,
            },
          });
      }
      for (const [i, estado] of [
        'VIGENTE',
        'PENDIENTE',
        'CANCELADA',
        'VIGENTE',
      ].entries()) {
        const a = await tx.autorizacionVisita.create({
          data: {
            residenteId: users.aldia.id,
            unidadId: units[0].id,
            visitanteNombre: `Visitante Ficticio QA ${i + 1}`,
            visitanteDocumento: 'QA-' + i,
            inicio: at(i === 3 ? -3 : -1, 6),
            fin: at(i === 3 ? -2 : 2, 22),
            estado,
            canceladaAt: estado === 'CANCELADA' ? now : null,
          },
        });
        if (!i) {
          await tx.movimientoVisita.create({
            data: {
              autorizacionId: a.id,
              unidadId: units[0].id,
              visitanteNombre: a.visitanteNombre,
              visitanteDocumento: a.visitanteDocumento,
              condicion: 'PREAUTORIZADA',
              ingresoPorId: users.seguridad.id,
              ingresoAt: at(0, 6),
              salidaAt: at(0, 7),
              salidaPorId: users.seguridad.id,
            },
          });
          await tx.movimientoVisita.create({
            data: {
              autorizacionId: a.id,
              unidadId: units[0].id,
              visitanteNombre: a.visitanteNombre,
              visitanteDocumento: a.visitanteDocumento,
              condicion: 'PREAUTORIZADA',
              ingresoPorId: users.seguridad.id,
            },
          });
        }
      }
      const pending = [];
      for (const [i, estado] of [
        'PENDIENTE',
        'PENDIENTE',
        'ENTREGADO',
        'ANULADO',
      ].entries()) {
        const p = await tx.paquete.create({
          data: {
            codigo: 'QA-PQ-' + (i + 1),
            unidadId: units[i % 2].id,
            empresa: 'Mensajería Ficticia QA',
            descripcion: '[QA] Paquete sintético ' + estado,
            estado,
            registradoPorId: users.seguridad.id,
            ...(estado === 'ENTREGADO'
              ? {
                  entregadoAt: now,
                  entregadoPorId: users.seguridad.id,
                  retiraResidenteId: users.aldia.id,
                  retiraNombre: users.aldia.nombre,
                }
              : {}),
            ...(estado === 'ANULADO'
              ? { correccionMotivo: '[QA] Registro duplicado ficticio' }
              : {}),
          },
        });
        if (estado === 'PENDIENTE') pending.push(p);
      }
      for (const [i, alcance] of [
        'TODOS',
        'TORRE',
        'TORRE',
        'SECCION',
      ].entries())
        await tx.comunicado.create({
          data: {
            titulo: `[QA] Comunicado de prueba ${i + 1}`,
            contenido:
              'Contenido ficticio: comprobar segmentación, consulta histórica y publicación sin confirmación de lectura.',
            alcance,
            autorId: users.admin.id,
            ...(alcance === 'TORRE'
              ? { torreId: towers[i === 1 ? 0 : 1].id }
              : {}),
            ...(alcance === 'SECCION' ? { seccionId: units[0].seccionId } : {}),
          },
        });
      for (const [i, state] of [
        'BORRADOR',
        'PUBLICADA',
        'PUBLICADA',
        'PUBLICADA',
      ].entries()) {
        const assembly = await tx.asamblea.create({
          data: {
            titulo: `[QA] Asamblea ${['borrador', 'votación abierta', 'cerrada con resultados', 'próxima'][i]}`,
            fechaAt: at(i === 2 ? -3 : 2),
            estado: state,
            creadorId: users.admin.id,
            publicadaAt: state === 'PUBLICADA' ? at(-4) : null,
            descripcion: 'Datos ficticios para testing',
          },
        });
        const topic = await tx.temaVotacion.create({
          data: {
            asambleaId: assembly.id,
            pregunta: '¿Aprobar la propuesta ficticia QA?',
            aperturaAt: at(i === 2 ? -3 : i === 3 ? 3 : -1),
            cierreAt: at(i === 2 ? -2 : 5),
            notificadoApertura: i !== 3,
            opciones: {
              create: [{ texto: 'A favor' }, { texto: 'En contra' }],
            },
          },
          include: { opciones: true },
        });
        if (i === 2) {
          await tx.participacionVoto.create({
            data: {
              unidadId: units[0].id,
              temaId: topic.id,
              opcionId: topic.opciones[0].id,
            },
          });
          await tx.voto.create({
            data: { temaId: topic.id, opcionId: topic.opciones[0].id },
          });
        }
      }
      for (const key of ['aldia', 'moroso', 'multitorre'])
        await tx.notificacion.create({
          data: {
            userId: users[key].id,
            moduloOrigen: 'COMUNICADOS',
            tipoEvento: 'COMUNICADO_NUEVO',
            titulo: '[QA] Bienvenido al testing',
            mensaje:
              'Datos ficticios. Consulta comunicados, incidencias y tus unidades.',
            claveEvento: 'qa-testing-bienvenida-20261116',
          },
        });
      return {
        units: units.map((u) => u.codigo),
        users: accounts.map(({ password, hash, ...a }) => a),
        counts: {
          users: accounts.length,
          units: units.length,
          areas: areas.length,
          reservas: reservas.length,
        },
        createdAt: now.toISOString(),
        deudaId: deuda.id,
      };
    },
    { timeout: 60000 },
  );
  committed = true;
  console.log(JSON.stringify({ ...result, credentialFile }, null, 2));
} finally {
  if (!committed) await unlink(path.join(photoDir, photo.filename));
  await db.$disconnect();
}
