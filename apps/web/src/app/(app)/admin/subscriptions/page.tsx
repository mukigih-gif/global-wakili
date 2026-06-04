'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { DollarSign } from 'lucide-react';
type Sub = { id: string; tenantName?: string; plan: string; status: string; amount?: number; currency?: string; currentPeriodEnd?: string };
export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get<{ data: Sub[] }>('/platform/subscriptions?limit=100').then((r) => setSubs(r.data ?? [])).catch(() => setSubs([])).finally(() => setLoading(false));
  }, []);
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><DollarSign className="h-6 w-6 text-green-600" /> Subscriptions</h1><p className="text-sm text-gray-500">Tenant billing plans and subscription management</p></div>
      <Table>
        <thead><tr><Th>Firm</Th><Th>Plan</Th><Th>Status</Th><Th>Amount</Th><Th>Period End</Th></tr></thead>
        <tbody>
          {loading ? <LoadingRow colSpan={5} /> : !subs.length ? <EmptyRow colSpan={5} message="No subscriptions found" /> :
           subs.map((s) => (
             <tr key={s.id}>
               <Td className="font-medium text-gray-900">{s.tenantName ?? '—'}</Td>
               <Td><span className="badge-blue">{s.plan}</span></Td>
               <Td><StatusBadge status={s.status} /></Td>
               <Td>{s.amount ? formatCurrency(s.amount, s.currency ?? 'KES') : '—'}</Td>
               <Td className="text-xs text-gray-500">{s.currentPeriodEnd ? formatDate(s.currentPeriodEnd) : '—'}</Td>
             </tr>
           ))}
        </tbody>
      </Table>
    </div>
  );
}
