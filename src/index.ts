import express from 'express';
import financeRoutes from './routes/financeRoutes';

const app = express();
app.use(express.json()); // Essential for reading the drawdown body!

// Mount the finance routes under the "/api/finance" prefix
app.use('/api/finance', financeRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Global Wakili Server running on port ${PORT}`);
});