'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
type Reconciliation = { id: string; period: string; status: string; difference: string; currency: string; runAt: string };
export default function ReconciliationPage() {
  const [reconciliations, setRecons] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    api.get<{ data: Reconciliation[] }>('/finance/reconciliations?limit=50')
      .then((r) => setRecons(r.data ?? [])).catch(() => setRecons([])).finally(() => setLoading(false));
  }, []);
  const runReconciliation = async () => {
    setRunning(true);
    try {
      await api.post('/finance/reconciliations/run', { period: new Date().toISOString().slice(0,7) });
      const r = await api.get<{ data: Reconciliation[] }>('/finance/reconciliations?limit=50');
      setRecons(r.data ?? []);
    } catch { } finally { setRunning(false); }
  };
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/app/finance" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1 flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><RefreshCw className="h-6 w-6 icon-finance" /> Bank Reconciliation</h1><p className="text-sm text-gray-500">Match bank statements to ledger entries</p></div>
          <Button size="sm" loading={running} onClick={runReconciliation}><RefreshCw className="h-4 w-4" /> Run Reconciliation</Button>
        </div>
      </div>
      <Table>
        <thead><tr><Th>Period</Th><Th>Status</Th><Th>Difference</Th><Th>Run At</Th></tr></thead>
        <tbody>
          {loading ? <LoadingRow colSpan={4} /> :
           !reconciliations.length ? <EmptyRow colSpan={4} message="No reconciliations run yet — click Run Reconciliation" /> :
           reconciliations.map((r) => (
             <tr key={r.id}>
               <Td className="font-medium text-gray-900">{r.period}</Td>
               <Td><StatusBadge status={r.status} /></Td>
               <Td className={parseFloat(r.difference) === 0 ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                 {formatCurrency(r.difference, r.currency)}
               </Td>
               <Td className="text-xs text-gray-500">{formatDate(r.runAt)}</Td>
             </tr>
           ))}
        </tbody>
      </Table>
    </div>
  );
}
