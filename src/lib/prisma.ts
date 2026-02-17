import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';

// 1. Setup the Prisma adapter with SQLite URL
const adapter = new PrismaBetterSqlite3({ url: 'dev.db' });

// 2. Pass adapter to Client
export const prisma = new PrismaClient({ adapter });
