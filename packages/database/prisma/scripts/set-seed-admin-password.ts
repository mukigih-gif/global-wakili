import fs from 'node:fs';
import path from 'node:path';

import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserStatus } from '@prisma/client';
import dotenv from 'dotenv';

const CONFIRM_FLAG = '--confirm-reset';
const BCRYPT_ROUNDS = 12;

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`${name} is required.`);
  }

  return value.trim();
}

function requireEmailEnv(name: string): string {
  const value = requireEnv(name).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error(`${name} must be a valid email address.`);
  }

  return value;
}

function assertRuntimeSafety() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to reset seed admin passwords in production.');
  }

  if (!process.argv.includes(CONFIRM_FLAG)) {
    throw new Error(`Explicit confirmation required. Re-run with ${CONFIRM_FLAG}.`);
  }
}

function validatePlainPassword(password: string) {
  if (password.length < 12) {
    throw new Error('Seed admin password must be at least 12 characters long.');
  }

  const lowered = password.toLowerCase();

  if (
    lowered.includes('password') ||
    lowered.includes('changeme') ||
    lowered.includes('change-this') ||
    lowered.includes('admin123')
  ) {
    throw new Error('Seed admin password appears unsafe. Choose a stronger password.');
  }
}

function readHidden(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    if (!stdin.isTTY) {
      reject(new Error('Secure password prompt requires an interactive terminal.'));
      return;
    }

    let value = '';

    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
    };

    const onData = (chunk: Buffer | string) => {
      const text = chunk.toString('utf8');

      for (const char of text) {
        if (char === '\u0003') {
          cleanup();
          stdout.write('\n');
          reject(new Error('Password prompt cancelled.'));
          return;
        }

        if (char === '\r' || char === '\n') {
          cleanup();
          stdout.write('\n');
          resolve(value);
          return;
        }

        if (char === '\u0008' || char === '\u007f') {
          if (value.length > 0) {
            value = value.slice(0, -1);
            stdout.write('\b \b');
          }
          continue;
        }

        if (char >= ' ') {
          value += char;
          stdout.write('*');
        }
      }
    };

    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.on('data', onData);
  });
}

async function promptForConfirmedPassword(): Promise<string> {
  const password = await readHidden('Enter NEW seed admin plain password: ');
  const confirmation = await readHidden('Confirm NEW seed admin plain password: ');

  if (password !== confirmation) {
    throw new Error('Passwords did not match.');
  }

  validatePlainPassword(password);

  return password;
}

function updateEnvHash(envPath: string, hash: string) {
  if (!fs.existsSync(envPath)) {
    throw new Error(`Root .env file not found at ${envPath}`);
  }

  const current = fs.readFileSync(envPath, 'utf8');
  const line = `SEED_DEFAULT_PASSWORD_HASH="${hash}"`;

  const updated = current.match(/^SEED_DEFAULT_PASSWORD_HASH=.*$/m)
    ? current.replace(/^SEED_DEFAULT_PASSWORD_HASH=.*$/m, line)
    : `${current.trimEnd()}\n${line}\n`;

  fs.writeFileSync(envPath, updated, {
    encoding: 'utf8',
    mode: 0o600,
  });
}

async function main() {
  const rootDir = process.cwd();
  const envPath = path.join(rootDir, '.env');

  dotenv.config({ path: envPath });

  assertRuntimeSafety();

  const password = await promptForConfirmedPassword();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const verified = await bcrypt.compare(password, passwordHash);

  if (!verified) {
    throw new Error('Generated password hash failed verification.');
  }

  updateEnvHash(envPath, passwordHash);

  const pool = new Pool({
    connectionString: requireEnv('DATABASE_URL'),
    max: 3,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });

  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool),
  });

  try {
    const tenant = await prisma.tenant.findUnique({
      where: {
        slug: requireEnv('SEED_TENANT_SLUG'),
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    });

    if (!tenant) {
      throw new Error(`Seed tenant not found for slug ${requireEnv('SEED_TENANT_SLUG')}.`);
    }

    const platformAdminEmail = requireEmailEnv('SEED_PLATFORM_ADMIN_EMAIL');
    const firmAdminEmail = requireEmailEnv('SEED_FIRM_ADMIN_EMAIL');

    const platformAdmin = await prisma.user.findFirst({
      where: {
        tenantId: null,
        email: platformAdminEmail,
      },
      select: {
        id: true,
      },
    });

    if (!platformAdmin) {
      throw new Error(`Platform admin not found: ${platformAdminEmail}`);
    }

    const firmAdmin = await prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        email: firmAdminEmail,
      },
      select: {
        id: true,
      },
    });

    if (!firmAdmin) {
      throw new Error(`Firm admin not found: ${firmAdminEmail}`);
    }

    const resetData = {
      passwordHash,
      failedLoginAttempts: 0,
      isLocked: false,
      lockedUntil: null,
      status: UserStatus.ACTIVE,
    };

    const [updatedPlatformAdmin, updatedFirmAdmin] = await Promise.all([
      prisma.user.update({
        where: {
          id: platformAdmin.id,
        },
        data: resetData,
        select: {
          id: true,
          email: true,
          tenantId: true,
          systemRole: true,
          tenantRole: true,
          status: true,
        },
      }),
      prisma.user.update({
        where: {
          id: firmAdmin.id,
        },
        data: resetData,
        select: {
          id: true,
          email: true,
          tenantId: true,
          systemRole: true,
          tenantRole: true,
          status: true,
        },
      }),
    ]);

    console.log(
      JSON.stringify(
        {
          status: 'seed_admin_password_reset_complete',
          envUpdated: true,
          tenant,
          users: {
            platformAdmin: updatedPlatformAdmin,
            firmAdmin: updatedFirmAdmin,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[set-seed-admin-password:error]', {
    name: error instanceof Error ? error.name : 'UnknownError',
    message: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
});