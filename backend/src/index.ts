import app from './app';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

async function startPowerHouse() {
  try {
    console.log('📡 [System] Initializing Power-House Connectivity...');
    
    // 1. VALIDATE DATABASE
    await prisma.$connect();
    console.log('✅ [Database] Connection established successfully.');

    // 2. START LISTENING
    const server = app.listen(PORT, () => {
      console.log(`
      🚀 Global Wakili 2026 is LIVE!
      -----------------------------------------------
      Port:         ${PORT}
      Status:       Active & RBAC Protected
      Ready for:    Rotorjet Aviation Stress Test
      -----------------------------------------------
      `);
    });

    // 3. GRACEFUL SHUTDOWN (SIGINT/SIGTERM)
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 [${signal}] Received. Closing Power-House...`);
      await prisma.$disconnect();
      server.close(() => {
        console.log('👋 [System] Power-House offline. Database disconnected.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('❌ [Critical] Power-House Startup Failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

startPowerHouse();