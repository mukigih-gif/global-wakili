export const dynamic = 'force-dynamic';
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatCard } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Briefcase, DollarSign, Clock, FileText } from 'lucide-react';

type DashboardSummary = {
  openMatters: number;
  draftInvoices: number;
  unpaidAmount: string;
  pendingTimeEntries: number;
  recentMatters: Array<{ id: string; title: string; matterCode: string; status: string; createdAt: string }>;
  recentInvoices: Array<{ id: string; invoiceNumber: string; total: string; status: string; dueDate: string }>;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<DashboardSummary>('/matters/dashboard/summary')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your firm's activity</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Open Matters"
          value={loading ? '—' : (data?.openMatters ?? 0)}
          icon={<Briefcase className="h-5 w-5" />}
        />
        <StatCard
          label="Unpaid Invoices"
          value={loading ? '—' : formatCurrency(data?.unpaidAmount ?? 0)}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          label="Draft Invoices"
          value={loading ? '—' : (data?.draftInvoices ?? 0)}
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          label="Pending Time Entries"
          value={loading ? '—' : (data?.pendingTimeEntries ?? 0)}
          icon={<Clock className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Matters */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Matters</h2>
            <a href="/app/matters" className="text-xs text-primary-600 hover:underline">View all</a>
          </div>
          <Table>
            <thead>
              <tr><Th>Matter</Th><Th>Code</Th><Th>Status</Th><Th>Opened</Th></tr>
            </thead>
            <tbody>
              {loading ? <LoadingRow colSpan={4} /> :
               !data?.recentMatters?.length ? <EmptyRow colSpan={4} /> :
               data.recentMatters.map((m) => (
                 <tr key={m.id}>
                   <Td><a href={`/app/matters/${m.id}`} className="font-medium text-primary-700 hover:underline">{m.title}</a></Td>
                   <Td className="text-gray-500 font-mono text-xs">{m.matterCode}</Td>
                   <Td><StatusBadge status={m.status} /></Td>
                   <Td className="text-gray-500">{formatDate(m.createdAt)}</Td>
                 </tr>
               ))
              }
            </tbody>
          </Table>
        </div>

        {/* Recent Invoices */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Invoices</h2>
            <a href="/app/finance/invoices" className="text-xs text-primary-600 hover:underline">View all</a>
          </div>
          <Table>
            <thead>
              <tr><Th>Invoice</Th><Th>Amount</Th><Th>Status</Th><Th>Due</Th></tr>
            </thead>
            <tbody>
              {loading ? <LoadingRow colSpan={4} /> :
               !data?.recentInvoices?.length ? <EmptyRow colSpan={4} /> :
               data.recentInvoices.map((inv) => (
                 <tr key={inv.id}>
                   <Td><span className="font-mono text-xs font-medium">{inv.invoiceNumber}</span></Td>
                   <Td className="font-medium">{formatCurrency(inv.total)}</Td>
                   <Td><StatusBadge status={inv.status} /></Td>
                   <Td className="text-gray-500">{formatDate(inv.dueDate)}</Td>
                 </tr>
               ))
              }
            </tbody>
          </Table>
        </div>
      </div>
    </div>
  );
}
