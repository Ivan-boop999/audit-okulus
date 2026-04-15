import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined,
}

function createPrismaClient() {
  return new PrismaClient({
    log: ['query'],
  });
}

export const db = globalForPrisma.prisma ??= createPrismaClient()
