import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import saasRoutes from './routes/saasRoutes';
import firmRoutes from './routes/firmRoutes';
import portalRoutes from './routes/portalRoutes';
// Import controllers for the internal "Power-House" endpoints
import { getAdvocateProductivity } from './controllers/analyticsController';
import { getPendingApprovals, processApproval } from './controllers/financeController';
import { getClientPortfolio } from './controllers/clientController';
import { generateInvoiceController } from './controllers/billingController';

const app = express();

// 1. GLOBAL SECURITY MIDDLEWARE
app.use(helmet()); // Protects against common web vulnerabilities
app.use(cors());   // Enables cross-origin requests for the React/Vue frontend
app.use(express.json()); // Parses incoming JSON payloads

// 2. MODULAR ROUTES (RBAC PROTECTED)
app.use('/api/saas', saasRoutes);   // SaaS Admin & Support
app.use('/api/firms', firmRoutes); // Tenant/Firm Operations
app.use('/api/portal', portalRoutes); // External Client Portal

// 3. LEGACY/DIRECT INTERNAL ENDPOINTS
// Analytics & Productivity
app.get('/api/analytics/productivity', getAdvocateProductivity);

// Finance & DRN Approvals
app.get('/api/finance/approvals', getPendingApprovals);
app.post('/api/finance/approve-drn/:id', processApproval);

// Portfolio & Billing
app.get('/api/clients/:id/portfolio', getClientPortfolio);
app.post('/api/billing/generate-invoice/:matterId', generateInvoiceController);

// 4. SYSTEM HEALTH CHECK
app.get('/health', (req, res) => {
  res.json({ 
    status: 'Global Wakili Systems Operational', 
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});

export default app;