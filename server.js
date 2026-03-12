// 1. IMPORTS (Cleaned & Consolidated)
import { PrismaClient } from '@prisma/client';
import { syncEfilingStatus } from './services/courtService.js';
import { getMatter360, updateMatterProgress } from './services/matterService.js';

const prisma = new PrismaClient();

// 2. THE SEARCH ENGINE
async function globalSearch(searchTerm, moduleFilter = null, statusFilter = null) {
  const results = {};
  const searchMap = {
    client: ['name', 'phone', 'email'],
    matter: ['title', 'reference'],
    staff: ['name', 'role'],
    transaction: ['reference', 'description']
  };

  const modulesToSearch = moduleFilter ? [moduleFilter] : Object.keys(searchMap);

  for (const model of modulesToSearch) {
    let queryOptions = {
      where: {
        AND: [
          { 
            OR: searchMap[model].map(field => ({ 
              [field]: { 
                contains: searchTerm,
                mode: 'insensitive' // Professional Fuzzy Search
              } 
            })) 
          }
        ]
      }
    };

    // Apply Status Filter specifically for Matters (Open/Archived)
    if (model === 'matter' && statusFilter) {
      queryOptions.where.AND.push({ status: statusFilter });
    }

    results[model] = await prisma[model].findMany({
      ...queryOptions,
      // Include linked matters when searching for a client
      include: model === 'client' ? { matters: true } : {}
    });
  }

  console.log(`\n🔎 Search Results for "${searchTerm}":`);
  console.log(JSON.stringify(results, null, 2));
}

// 3. THE WORKFLOW ENGINE
async function triggerWorkflowActions(matterId, newStage) {
  switch(newStage) {
    case 'INTAKE':
      console.log("🛠 Workflow: Generating Initial Client Care Letter...");
      break;
    case 'HEARING':
      console.log("📅 Workflow: Adding 'Prepare Brief' task to Calendar...");
      break;
    case 'CLOSED':
      console.log("💰 Workflow: Flagging for Final Billing Review.");
      break;
    default:
      console.log(`ℹ️ System: Matter updated to ${newStage}. No automated tasks.`);
  }
}

// 4. MAIN EXECUTION BLOCK
async function run() {
  console.log("🚀 Global Wakili System Active");

  // TEST 1: Fuzzy Search for a client
  await globalSearch('stanley', 'client');

  // TEST 2: View 360 Dashboard for a specific case
  const dashboard = await getMatter360('GW-2026-001');
  
  if (dashboard && !dashboard.error) {
    console.log(`\n--- MATTER 360: ${dashboard.title} ---`);
    console.log(`📍 Court: ${dashboard.courtStation || 'Not Assigned'}`);
    console.log(`👤 Client: ${dashboard.client.name}`);
    console.log(`📅 Next Hearing: ${dashboard.nextHearing?.date || 'None scheduled'}`);
    console.log(`📄 Filings: ${dashboard.documents.length} records found`);
  } else if (dashboard?.error) {
    console.log(`⚠️ Alert: ${dashboard.error} (Ensure you have run the Seed Script)`);
  }
}

run().catch(e => {
  console.error("❌ System Error:", e);
  process.exit(1);
});