import { defineConfig } from '@prisma/config';
import 'dotenv/config';

export default defineConfig({
  datasource: {
    // This is required for Prisma Migrate to connect to Neon
    url: process.env.DATABASE_URL,
  },
  migrations: {
    // Pointing specifically to your smoke-test file in the prisma folder
    seed: 'ts-node ./prisma/smoke-test.ts',
  },
});