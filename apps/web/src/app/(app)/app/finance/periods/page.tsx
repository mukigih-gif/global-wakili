'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { api, type ApiError } from '@/lib/api';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, CalendarRange, Lock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

type Period = { id: string; month: number; year: number; status: string };

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function AccountingPeriodsPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = () =>
    api.get<{ data: Period[] }>('/finance/periods')
      .then((r) => setPeriods(r.data ?? [])).catch(() => setPeriods([])).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const closePeriod = async (p: Period) => {
    if (!window.confirm(`Close period ${p.year}-${String(p.month).padStart(2, '0')}? Posting into a closed period is blocked.`)) return;
    setClosing(p.id); setError('');
    try {
      await api.post('/finance/period-close', { month: p.month, year: p.year });
      await load();
    } catch (err) { setError((err as ApiError)?.message ?? 'Failed to close period'); } finally { setClosing(null); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/app/finance" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><CalendarRange className="h-6 w-6 icon-finance" /> Accounting Periods</h1>
          <p className="text-sm text-gray-500">Month-end close — periods auto-open on first posting; close to lock against further posting</p>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</div>}

      <Table>
        <thead><tr><Th>Period</Th><Th>Status</Th><Th></Th></tr></thead>
        <tbody>
          {loading ? <LoadingRow colSpan={3} /> :
           !periods.length ? <EmptyRow colSpan={3} message="No accounting periods yet — they open automatically on the first posting" /> :
           periods.map((p) => (
             <tr key={p.id}>
               <Td className="font-medium text-gray-900">{MONTHS[p.month]} {p.year}</Td>
               <Td><StatusBadge status={p.status} /></Td>
               <Td>
                 {p.status === 'OPEN' && (
                   <button onClick={() => closePeriod(p)} disabled={closing === p.id}
                     className="text-xs text-primary-600 hover:underline font-medium disabled:opacity-50 inline-flex items-center gap-1">
                     <Lock className="h-3 w-3" /> {closing === p.id ? 'Closing…' : 'Close period'}
                   </button>
                 )}
               </Td>
             </tr>
           ))}
        </tbody>
      </Table>
    </div>
  );
}
