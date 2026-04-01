const fs = require('fs');
const { Client } = require('pg');
(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) { console.error('TEST_DATABASE_URL not set'); process.exit(2); }
  const client = new Client({ connectionString: url });
  await client.connect();
  const files = [
    'packages/database/prisma/migration/0001_phaseA_add_tenantmembership_and_nullable_tenantid/migration.sql',
    'packages/database/prisma/script/backfill_tenant_membership.sql',
    'packages/database/prisma/migration/0002_phaseB_enforce_constraints/migration.sql'
  ];
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    const sql = fs.readFileSync(f, 'utf8');
    console.log('RUNNING', f);
    await client.query(sql);
  }
  await client.end();
  console.log('DONE');
})();
