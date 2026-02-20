import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// 1. Initialize the SQLite adapter with your connection string
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./dev.db"
});

// 2. Pass the adapter directly into the PrismaClient constructor
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter, // <-- This is the magic key for Prisma 7!
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;