export const dynamic = 'force-dynamic';
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatCard } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { DollarSign, TrendingUp, FileText, AlertCircle, Plus } from 'lucide-react';

type Invoice = {
  id: string;
  invoiceNumber: string;
  total: string;
  balanceDue: string;
  status: string;
  dueDate?: string;
  matter?: { title: string } | null;
  client?: { name: string } | null;
};

type FinanceSummary = {
  totalBilled: string;
  totalReceived: string;
  totalOutstanding: string;
  overdueCount: number;
};

export default function FinancePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ data: Invoice[] }>('/billing/invoices?limit=20'),
      api.get<FinanceSummary>('/billing/summary').catch(() => null),
    ]).then(([inv, sum]) => {
      setInvoices(inv.data ?? []);
      setSummary(sum);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
          <p className="text-sm text-gray-500">Invoicing, payments, and accounting</p>
        </div>
        <div className="flex gap-2">
          <Link href="/app/finance/invoices/new">
            <Button size="sm"><Plus className="h-4 w-4" /> New Invoice</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Billed" value={formatCurrency(summary?.totalBilled ?? 0)} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard label="Received" value={formatCurrency(summary?.totalReceived ?? 0)} icon={<TrendingUp className="h-5 w-5" />} deltaType="up" />
        <StatCard label="Outstanding" value={formatCurrency(summary?.totalOutstanding ?? 0)} icon={<FileText className="h-5 w-5" />} />
        <StatCard label="Overdue" value={summary?.overdueCount ?? 0} icon={<AlertCircle className="h-5 w-5" />} deltaType="down" />
      </div>

      {/* Sub-navigation */}
      <div className="flex gap-4 border-b border-gray-200 text-sm">
        {['Invoices', 'Journals', 'Payments', 'Chart of Accounts', 'Bank Statements'].map((tab) => (
          <Link
            key={tab}
            href={`/app/finance/${tab.toLowerCase().replace(/\s+/g, '-')}`}
            className="pb-2 text-gray-500 hover:text-gray-800 border-b-2 border-transparent hover:border-gray-400 transition-colors"
          >
            {tab}
          </Link>
        ))}
      </div>

      <Table>
        <thead>
          <tr><Th>Invoice #</Th><Th>Client</Th><Th>Matter</Th><Th>Total</Th><Th>Balance</Th><Th>Status</Th><Th>Due</Th><Th></Th></tr>
        </thead>
        <tbody>
          {loading ? <LoadingRow colSpan={8} /> :
           !invoices.length ? <EmptyRow colSpan={8} message="No invoices found" /> :
           invoices.map((inv) => (
             <tr key={inv.id}>
               <Td><span className="font-mono text-xs">{inv.invoiceNumber}</span></Td>
               <Td className="text-gray-700">{inv.client?.name ?? '—'}</Td>
               <Td className="text-gray-600 text-xs">{inv.matter?.title ?? '—'}</Td>
               <Td className="font-medium">{formatCurrency(inv.total)}</Td>
               <Td className={parseFloat(inv.balanceDue) > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                 {formatCurrency(inv.balanceDue)}
               </Td>
               <Td><StatusBadge status={inv.status} /></Td>
               <Td className="text-gray-500 text-xs">{formatDate(inv.dueDate)}</Td>
               <Td>
                 <Link href={`/app/finance/invoices/${inv.id}`} className="text-xs text-primary-600 hover:underline">View</Link>
               </Td>
             </tr>
           ))
          }
        </tbody>
      </Table>
    </div>
  );
}
