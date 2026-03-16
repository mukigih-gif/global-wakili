import express from 'express';
import { processClientDeposit, getClientDashboard } from '../controllers/portalController.js';
// import { authenticateClient } from '../middleware/auth.js'; // If you have auth ready

const router = express.Router();

// Route for the client to top up their matter deposit
router.post('/deposit', processClientDeposit);

// Route for the dashboard data
router.get('/dashboard', getClientDashboard);

export default router;