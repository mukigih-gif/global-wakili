// apps/api/src/app.ts
import express from 'express';
import { registerMiddlewares } from './middleware'; // index exports registration
import v1Router from './routes/v1';

const app = express();
// core middleware
registerMiddlewares(app);

// mount API
app.use('/api/v1', v1Router);

export default app;