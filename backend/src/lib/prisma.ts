import { PrismaClient } from '@prisma/client';
import { createClient } from '@libsql/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import * as dotenv from 'dotenv';

// 1. Load the .env file globally for the process
dotenv.config();

// 2. Setup LibSQL
const libsql = createClient({
  url: 'file:prisma/dev.db',
});

const adapter = new PrismaLibSql(libsql);

// 3. Export the Singleton
// The engine will now find DATABASE_URL in the system environment
export const db = new PrismaClient({ adapter });

export default db;