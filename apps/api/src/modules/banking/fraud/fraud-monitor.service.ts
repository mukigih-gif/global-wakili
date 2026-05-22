import { detectFraud } from './fraudservice';

export const runFraudMonitor = async (tenantId: string) => {
  const alerts = await detectFraud(tenantId);

  return {
    tenantId,
    alertCount: alerts.length,
    alerts,
    checkedAt: new Date().toISOString(),
  };
};

export default runFraudMonitor;
