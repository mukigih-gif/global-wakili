import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';

// 1. IMPORT CONTROLLERS & ROUTES
import { getAdvocateProductivity } from './controllers/analyticsController.js';
import { getPendingApprovals, processApproval } from './controllers/financeController.js';
import { getClientPortfolio } from './controllers/clientController.js';
import { generateInvoiceController } from './controllers/billingController.js';
import portalRoutes from './routes/portalRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 2. GLOBAL MIDDLEWARE
app.use(helmet());       // Essential for legal apps (Security headers)
app.use(cors());         // Allows your React frontend to talk to this API
app.use(express.json()); // Essential for processing DRN and Payment bodies

// 3. API ROUTES

// --- Client Portal (External Facing) ---
// Handles login, matter deposits, and document uploads for Rotorjet
app.use('/api/portal', portalRoutes);

// --- Analytics & Productivity (Internal - Stanley's View) ---
app.get('/api/analytics/productivity', getAdvocateProductivity);

// --- Finance & DRNs (Internal - Approval Logic) ---
app.get('/api/finance/approvals', getPendingApprovals);
app.post('/api/finance/approve-drn/:id', processApproval);

// --- Client Management (Internal - Portfolio View) ---
app.get('/api/clients/:id/portfolio', getClientPortfolio);

// --- Billing & Invoicing (Internal - Fee Harvesting) ---
app.post('/api/billing/generate-invoice/:matterId', generateInvoiceController);

// --- System Health Check ---
app.get('/health', (req, res) => {
  res.json({ 
    status: 'Global Wakili Systems Operational', 
    timestamp: new Date() 
  });
});

// 4. START SERVER
app.listen(PORT, () => {
  console.log(`
  🚀 Global Wakili Backend is Intact and Running!
  -----------------------------------------------
  Local URL:   http://localhost:${PORT}
  Environment: ${process.env.NODE_ENV || 'development'}
  -----------------------------------------------
  Ready for Stress Test Scenario: Rotorjet Aviation
  `);
});