import { PrismaClient } from '@prisma/client';

// Vérifie si on est en mode développement pour éviter les fuites de connexions
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}