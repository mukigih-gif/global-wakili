import { defineConfig } from '@prisma/config';

export default defineConfig({
  datasource: {
    // This bridges the terminal variable to the Prisma engine
    url: process.env.DATABASE_URL,
  },
});