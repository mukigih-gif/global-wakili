import { useEffect, useState } from 'react';
import { subscribeFinance } from '../../service/socket';

export function FinanceDashboard({ tenantId }: { tenantId: string }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    subscribeFinance(tenantId, setData);
  }, [tenantId]);

  if (!data) return <div>Loading...</div>;

  return (
    <div>
      <h2>Real-Time Finance</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
