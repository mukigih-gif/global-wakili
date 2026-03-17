import { createClient } from '@libsql/client';

const client = createClient({
  url: 'file:prisma/dev.db',
});

async function run() {
  console.log("🛠️  Global Wakili: Bypassing Prisma Engine for Direct Injection...");

  const staff = [
    ['Mwangi', 'ceo@globalsites.com', 15000, 'CEO'],
    ['Koki', 'koki@globalsites.com', 7500, 'Advocate'],
    ['Alice', 'alice@globalsites.com', 7500, 'Advocate'],
    ['Bob', 'bob@globalsites.com', 7500, 'Advocate'],
    ['Charlie', 'charlie@globalsites.com', 7500, 'Advocate'],
    ['Jane', 'jane@globalsites.com', 0, 'Accountant'],
    ['John', 'john@globalsites.com', 0, 'Accountant'],
    ['Sarah', 'sarah@globalsites.com', 0, 'Admin'],
    ['P1', 'p1@globalsites.com', 3500, 'Paralegal'],
    ['P2', 'p2@globalsites.com', 3500, 'Paralegal'],
    ['P3', 'p3@globalsites.com', 3500, 'Paralegal'],
  ];

  try {
    for (const [name, email, rate, role] of staff) {
      // Direct SQL injection (Safe for local dev)
      await client.execute({
        sql: `INSERT INTO "User" (name, email, defaultRate, role, status) 
              VALUES (?, ?, ?, ?, 'ACTIVE')
              ON CONFLICT(email) DO UPDATE SET 
              name=excluded.name, defaultRate=excluded.defaultRate, role=excluded.role`,
        args: [name, email, rate, role]
      });
      console.log(`✅ Injected: ${name}`);
    }
    console.log("\n🚀 THE CIRCUS IS OVER. All 11 staff members are live in dev.db.");
  } catch (err: any) {
    console.error("❌ Direct Injection Failed:", err.message);
  }
}

run();