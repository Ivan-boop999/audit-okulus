import { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined,
}

// Always create a fresh client in development to avoid stale schema issues after migrations
function createPrismaClient() {
  return new PrismaClient({
    log: ['query'],
  });
}

export const db =
  globalForPrisma.prisma ??
  createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
