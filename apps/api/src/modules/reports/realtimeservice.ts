import { emitFinanceUpdate } from '../../realtime/socket';
import { getTrialBalance } from './trial-balance.service';
import { getProfitAndLoss } from './report.service';

export const pushRealtimeFinance = async (tenantId: string) => {
  const trial = await getTrialBalance(tenantId);
  const pnl = await getProfitAndLoss(tenantId);

  emitFinanceUpdate(tenantId, {
    trialBalance: trial,
    profitLoss: pnl,
    timestamp: new Date()
  });
};