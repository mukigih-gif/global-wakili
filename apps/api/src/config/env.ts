import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

const ENV_CANDIDATES = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../../../.env'),
  path.resolve(__dirname, '../../../.env'),
];

for (const candidate of ENV_CANDIDATES) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate });
    break;
  }
}

const booleanFromString = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (typeof value === 'boolean') return value;
    return value.toLowerCase() === 'true';
  });

const commaSeparatedList = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );

const portSchema = z.coerce.number().int().min(1).max(65535);

const hex32ByteKeySchema = z
  .string()
  .regex(/^[A-Fa-f0-9]{64}$/, 'ENCRYPTION_KEY must be 64 hex characters (32 bytes)');

const baseSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: portSchema.default(4000),

    DATABASE_URL: z
      .string()
      .url('DATABASE_URL must be a valid URL')
      .refine(
        (u) => u.startsWith('postgresql://') || u.startsWith('postgres://'),
        'DATABASE_URL must be a PostgreSQL connection string',
      ),

    JWT_SECRET: z
      .string()
      .min(32, 'JWT_SECRET must be at least 32 characters')
      .refine((v) => !/password|123456|qwerty|letmein/i.test(v), 'JWT_SECRET is too weak'),

    USE_NEON: booleanFromString.optional().default(false),

    ENCRYPTION_KEY: hex32ByteKeySchema.optional(),
    REDIS_URL: z.string().url('REDIS_URL must be a valid URL').optional(),

    APP_URL: z.string().url('APP_URL must be a valid URL').optional(),
    CORS_ORIGIN: commaSeparatedList.optional(),

    ETIMS_BASE_URL: z.string().url().optional(),
    ETIMS_API_KEY: z.string().min(10).optional(),

    GOAML_BASE_URL: z.string().url().optional(),
    GOAML_API_KEY: z.string().min(10).optional(),

    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    MICROSOFT_CLIENT_ID: z.string().optional(),
    MICROSOFT_CLIENT_SECRET: z.string().optional(),

    MPESA_BASE_URL: z.string().url().optional(),
    MPESA_CONSUMER_KEY: z.string().optional(),
    MPESA_CONSUMER_SECRET: z.string().optional(),
    MPESA_SHORTCODE: z.string().optional(),
    MPESA_PASSKEY: z.string().optional(),

    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    SLOW_QUERY_THRESHOLD_MS: z.coerce.number().int().min(100).default(1000),
  })
  .passthrough();

const productionSchema = baseSchema.extend({
  NODE_ENV: z.literal('production'),
  ENCRYPTION_KEY: hex32ByteKeySchema,
  REDIS_URL: z.string().url('REDIS_URL is required in production'),
  APP_URL: z.string().url('APP_URL is required in production'),
  CORS_ORIGIN: commaSeparatedList.refine((value) => value.length > 0, 'CORS_ORIGIN is required in production'),
});

const developmentSchema = baseSchema.extend({
  NODE_ENV: z.literal('development'),
});

const testSchema = baseSchema.extend({
  NODE_ENV: z.literal('test'),
});

const envSchema =
  process.env.NODE_ENV === 'production'
    ? productionSchema
    : process.env.NODE_ENV === 'test'
      ? testSchema
      : developmentSchema;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const errors = parsed.error.flatten().fieldErrors;

  console.error('\n❌ ENV VALIDATION FAILED\n');

  for (const [key, messages] of Object.entries(errors)) {
    if (!messages?.length) continue;
    console.error(`- ${key}: ${messages.join(', ')}`);
  }

  console.error('\n🛑 APPLICATION BOOT ABORTED\n');
  process.exit(1);
}

export const env = parsed.data;
export type AppEnv = typeof env;