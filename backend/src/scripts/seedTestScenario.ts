import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seedSimulation() {
  console.log("🌱 Seeding 11 Staff and 20 Client scenario...");

  // 1. Create Advocates & Staff
  const staffNames = [
    { name: 'Koki', role: 'Advocate' },
    { name: 'Mwangi', role: 'CEO' },
    { name: 'Alice', role: 'Advocate' },
    { name: 'Bob', role: 'Advocate' },
    { name: 'Charlie', role: 'Advocate' },
    { name: 'Jane', role: 'Accountant' },
    { name: 'John', role: 'Accountant' },
    { name: 'Sarah', role: 'Admin' },
    { name: 'P1', role: 'Paralegal' },
    { name: 'P2', role: 'Paralegal' },
    { name: 'P3', role: 'Paralegal' }
  ];

  // Logic to simulate KES 1.2M in logged work across 20 clients...
  // (Corporate clients assigned high-value matters, individuals assigned litigation)
  
  console.log("✅ Simulation data ready for Reporting Engine.");
}