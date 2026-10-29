import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Rol } from '../src/generated/prisma/client.js';

// Solo datos de demostración del PDF; nunca ejecutar en producción.
if (process.env.NODE_ENV === 'production')
  throw new Error('Seed de pruebas deshabilitado en producción');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
async function main() {
  const passwordHash = await bcrypt.hash('Prueba123!', 12);
  const unidades = new Map<string, string>();
  for (const letra of ['A', 'B']) {
    const torre = await prisma.torre.upsert({
      where: { nombre: `Torre ${letra}` },
      update: {},
      create: { nombre: `Torre ${letra}` },
    });
    for (const [seccionNombre, codigos] of [
      ['Norte', ['101', '102']],
      ['Sur', ['201', '202']],
    ] as const) {
      const seccion = await prisma.seccion.upsert({
        where: { torreId_nombre: { torreId: torre.id, nombre: seccionNombre } },
        update: {},
        create: { torreId: torre.id, nombre: seccionNombre },
      });
      for (const numero of codigos) {
        const codigo = `${letra}-${numero}`;
        const cuotaMensual =
          letra === 'A'
            ? seccionNombre === 'Norte'
              ? '50.00'
              : '55.00'
            : seccionNombre === 'Norte'
              ? '45.00'
              : '50.00';
        const u = await prisma.unidad.upsert({
          where: { codigo },
          update: {},
          create: {
            codigo,
            torreId: torre.id,
            seccionId: seccion.id,
            cuotaMensual,
          },
        });
        unidades.set(codigo, u.id);
      }
    }
  }
  const usuarios: [string, Rol, string[]][] = [
    ['admin', 'ADMINISTRADOR', []],
    ['seguridad', 'SEGURIDAD', []],
    ['residente1', 'RESIDENTE', ['A-101', 'A-102']],
    ['residente2', 'RESIDENTE', ['A-101']],
    ['residente3', 'RESIDENTE', ['A-201']],
    ['residente4', 'RESIDENTE', ['B-101']],
    ['residente5', 'RESIDENTE', ['B-102', 'B-201']],
  ];
  for (const [nombre, rol, codigos] of usuarios) {
    const user = await prisma.user.upsert({
      where: { email: `${nombre}@condominio.test` },
      update: {},
      create: { email: `${nombre}@condominio.test`, nombre, rol, passwordHash },
    });
    for (const codigo of codigos) {
      const unidadId = unidades.get(codigo)!;
      await prisma.usuarioUnidad.upsert({
        where: { userId_unidadId: { userId: user.id, unidadId } },
        update: {},
        create: { userId: user.id, unidadId },
      });
    }
  }
  for (const [nombre, capacidad] of [
    ['Salón de eventos', 40],
    ['Alberca', 30],
    ['Gimnasio', 15],
    ['Asador', 12],
  ] as const) {
    await prisma.areaComun.upsert({
      where: { nombre },
      update: {},
      create: {
        nombre,
        capacidad,
        horarios: {
          create: Array.from({ length: 7 }, (_, diaSemana) => ({
            diaSemana,
            horaInicio: '06:00',
            horaFin: '22:00',
          })),
        },
      },
    });
  }
  console.log(
    'Datos de prueba H5–H8 listos. Se conservaron los registros existentes.',
  );
}
try {
  await main();
} finally {
  await prisma.$disconnect();
}
