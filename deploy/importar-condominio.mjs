import { readFile } from 'node:fs/promises';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../dist/generated/prisma/client.js';

const source = JSON.parse(
  await readFile(
    process.env.CONDOMINIO_FILE ?? '/run/config/condominio.json',
    'utf8',
  ),
);
const nombre = (value) =>
  typeof value === 'string' &&
  value.trim().length >= 1 &&
  value.trim().length <= 30;
if (
  !source ||
  !Array.isArray(source.torres) ||
  !source.torres.length ||
  source.torres.length > 100
)
  throw new Error(
    'Se requieren de 1 a 100 torres reales en el archivo de configuración',
  );
const torres = new Set(),
  unidades = new Set();
let cantidad = 0;
for (const t of source.torres) {
  if (
    !nombre(t.nombre) ||
    torres.has(t.nombre.trim()) ||
    !Array.isArray(t.secciones) ||
    !t.secciones.length
  )
    throw new Error('Torre inválida o repetida');
  torres.add(t.nombre.trim());
  const secciones = new Set();
  for (const s of t.secciones) {
    if (
      !nombre(s.nombre) ||
      secciones.has(s.nombre.trim()) ||
      !Array.isArray(s.unidades) ||
      !s.unidades.length
    )
      throw new Error('Sección inválida o repetida');
    secciones.add(s.nombre.trim());
    for (const u of s.unidades) {
      if (
        !u ||
        typeof u.codigo !== 'string' ||
        !/^[A-Za-z0-9][A-Za-z0-9_-]{0,29}$/.test(u.codigo) ||
        unidades.has(u.codigo)
      )
        throw new Error('Código de unidad inválido o repetido');
      unidades.add(u.codigo);
      if (++cantidad > 10000)
        throw new Error('El catálogo supera las 10000 unidades');
    }
  }
}
const tarifa = process.env.CUOTA_MENSUAL_USD ?? '50.00';
if (!/^\d{1,8}(\.\d{1,2})?$/.test(tarifa) || Number(tarifa) <= 0)
  throw new Error('Tarifa mensual inválida');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
try {
  await prisma.$transaction(
    async (tx) => {
      for (const t of source.torres) {
        const torre = await tx.torre.upsert({
          where: { nombre: t.nombre.trim() },
          create: { nombre: t.nombre.trim() },
          update: {},
        });
        for (const s of t.secciones) {
          const seccion = await tx.seccion.upsert({
            where: {
              torreId_nombre: { torreId: torre.id, nombre: s.nombre.trim() },
            },
            create: { torreId: torre.id, nombre: s.nombre.trim() },
            update: {},
          });
          for (const u of s.unidades) {
            const actual = await tx.unidad.findUnique({
              where: { codigo: u.codigo },
            });
            if (
              actual &&
              (actual.torreId !== torre.id || actual.seccionId !== seccion.id)
            )
              throw new Error(
                'Una unidad ya pertenece a otra ubicación; se revierte toda la importación',
              );
            if (!actual)
              await tx.unidad.create({
                data: {
                  codigo: u.codigo,
                  torreId: torre.id,
                  seccionId: seccion.id,
                  cuotaMensual: new Prisma.Decimal(tarifa),
                },
              });
          }
        }
      }
    },
    { timeout: 120000 },
  );
  console.log(
    `Catálogo validado: ${torres.size} torres y ${cantidad} unidades. No se duplicaron ni movieron registros existentes.`,
  );
} finally {
  await prisma.$disconnect();
}
