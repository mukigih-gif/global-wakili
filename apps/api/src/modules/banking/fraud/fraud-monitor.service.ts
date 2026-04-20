import { detectFraud } from './fraud.service';

export const runFraudMonitor = async (tenantId: string) => {
  const alerts = await detectFraud(tenantId);

  if (alerts.length > 0) {
    console.error('🚨 FRAUD ALERTS:', alerts);
  }

  return alerts;
};