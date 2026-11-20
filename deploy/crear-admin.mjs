import { readFile } from 'node:fs/promises';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/generated/prisma/client.js';

const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  throw new Error('ADMIN_EMAIL inválido');
if (!process.env.ADMIN_PASSWORD_FILE)
  throw new Error('Falta ADMIN_PASSWORD_FILE');
const password = (
  await readFile(process.env.ADMIN_PASSWORD_FILE, 'utf8')
).trimEnd();
if (password.length < 16 || Buffer.byteLength(password) > 72)
  throw new Error('La contraseña inicial debe tener entre 16 y 72 bytes');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
try {
  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) {
    if (existente.rol !== 'ADMINISTRADOR' || !existente.isActive)
      throw new Error(
        'La cuenta existe con otro rol o inactiva; requiere revisión manual',
      );
    console.log(
      'La cuenta administradora ya existe. No se cambió su contraseña.',
    );
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        email,
        nombre: 'Administrador',
        rol: 'ADMINISTRADOR',
        passwordHash,
      },
    });
    console.log(
      'Cuenta administradora inicial creada. No se generaron usuarios ni datos de demostración.',
    );
  }
} finally {
  await prisma.$disconnect();
}
