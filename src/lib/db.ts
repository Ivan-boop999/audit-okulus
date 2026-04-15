import { config } from 'dotenv'
config();

import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { Pool, neonConfig } from '@neondatabase/serverless'

// Enable WebSocket support in Node.js (needed for Neon serverless)
if (typeof globalThis.WebSocket === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  neonConfig.webSocketConstructor = require('ws');
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined,
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!;
  const url = new URL(connectionString);

  const pool = new Pool({
    host: url.hostname,
    port: parseInt(url.port) || 5432,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    ssl: true,
  });

  const adapter = new PrismaNeon(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
  });
}

export const db = globalForPrisma.prisma ??= createPrismaClient()
