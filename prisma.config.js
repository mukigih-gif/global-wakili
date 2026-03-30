import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';

// Force load the .env file from the current directory
dotenv.config();

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    // Explicitly pull the loaded variable
    url: process.env.DATABASE_URL,
  },
});