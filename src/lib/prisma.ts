import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as Record<string, PrismaClient | undefined>;

export const prisma = globalForPrisma['prisma'] ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma['prisma'] = prisma;
}