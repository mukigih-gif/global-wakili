import Queue from 'bull';

export const etimsQueue = new Queue('etims-sync', process.env.REDIS_URL!);
export const bankQueue = new Queue('bank-payouts', process.env.REDIS_URL!);

etimsQueue.process(async (job) => {
  // Logic to call KRAEtimsAdapter
});