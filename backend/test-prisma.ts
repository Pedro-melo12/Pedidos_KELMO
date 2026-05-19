import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Testing connection...');
  try {
    const user = await prisma.usuario.findFirst();
    console.log('User:', user);
  } catch (err) {
    console.error('Error:', err);
  }
}

main().finally(() => prisma.$disconnect());
