/**
 * seed-all.ts — Master Seed Orchestrator
 * Runs all seed modules in dependency order.
 * Run: npx dotenv-cli -e ../../.env -- node --require tsx/cjs src/scripts/seed-all.ts [tenantId]
 */
import { execSync } from 'child_process';
import path from 'path';

const tenantId = process.argv[2] ?? 'cmpy9pg9u00002gom327d94va';
const SCRIPTS_DIR = path.join(__dirname);

function run(script: string, args: string[] = []) {
  const cmd = `node --require tsx/cjs ${path.join(SCRIPTS_DIR, script)} ${args.join(' ')}`;
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`▶ Running: ${script} ${args.join(' ')}`);
  console.log('─'.repeat(60));
  try {
    execSync(cmd, { stdio: 'inherit', env: process.env });
    console.log(`✓ ${script} complete`);
  } catch (err) {
    console.error(`✗ ${script} FAILED`);
    process.exit(1);
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  GLOBAL WAKILI — MASTER SEED EXECUTION                 ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`\n  Tenant: ${tenantId}\n`);

  // Step 1: Seed permissions (pre-requisite)
  run('seed-permissions.ts', [tenantId]);

  // Step 2: Assign permissions to roles
  run('assign-role-permissions.ts', [tenantId]);

  // Step 3: Seed matter lifecycle data
  run('seed-matters.ts', [tenantId]);

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  ALL SEEDS COMPLETE                                     ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('\nNext: Run validation suite with:');
  console.log('  npx dotenv-cli -e .env -- node --require tsx/cjs src/scripts/validate-tenancy.ts', tenantId);
  console.log('  npx dotenv-cli -e .env -- node --require tsx/cjs src/scripts/validate-trust.ts', tenantId);
  console.log('  npx dotenv-cli -e .env -- node --require tsx/cjs src/scripts/validate-finance.ts', tenantId);
  console.log('  npx dotenv-cli -e .env -- node --require tsx/cjs src/scripts/validate-audit.ts', tenantId);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
