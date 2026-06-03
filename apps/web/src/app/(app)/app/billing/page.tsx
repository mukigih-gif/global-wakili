'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Plus, Search, FileText } from 'lucide-react';

type Invoice = {
  id: string;
  invoiceNumber: string;
  client?: { name: string } | null;
  matter?: { matterCode: string } | null;
  totalAmount: number;
  currency: string;
  status: string;
  dueDate?: string | null;
  issuedAt?: string | null;
  createdAt: string;
};

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('search', query);
    if (status) params.set('status', status);
    api.get<{ data: Invoice[] }>(`/billing/invoices?${params}`)
      .then((r) => setInvoices(r.data ?? []))
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, [query, status]);

  const totalOutstanding = invoices
    .filter((i) => ['ISSUED', 'OVERDUE', 'PARTIALLY_PAID'].includes(i.status))
    .reduce((sum, i) => sum + i.totalAmount, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-sm text-gray-500">Invoices, payments and client billing</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4" /> New Invoice</Button>
      </div>

      {/* Summary card */}
      {!loading && invoices.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500 mb-1">Total Invoices</p>
            <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500 mb-1">Outstanding</p>
            <p className="text-2xl font-bold text-amber-600">
              KES {totalOutstanding.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500 mb-1">Paid</p>
            <p className="text-2xl font-bold text-green-600">
              {invoices.filter((i) => i.status === 'PAID').length}
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search invoices…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="form-input pl-9 w-full"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="form-select w-44">
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ISSUED">Issued</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="PAID">Paid</option>
          <option value="OVERDUE">Overdue</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="VOID">Void</option>
        </select>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Invoice No.</Th>
            <Th>Client</Th>
            <Th>Matter</Th>
            <Th>Amount</Th>
            <Th>Status</Th>
            <Th>Due Date</Th>
            <Th>Issued</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {loading ? <LoadingRow colSpan={8} /> :
           !invoices.length ? <EmptyRow colSpan={8} message="No invoices found" /> :
           invoices.map((inv) => (
             <tr key={inv.id}>
               <Td>
                 <div className="flex items-center gap-2">
                   <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                   <span className="font-mono text-xs text-gray-700">{inv.invoiceNumber}</span>
                 </div>
               </Td>
               <Td className="font-medium text-gray-900">{inv.client?.name ?? '—'}</Td>
               <Td className="text-gray-600 text-xs">{inv.matter?.matterCode ?? '—'}</Td>
               <Td className="font-medium text-gray-900">{inv.currency} {inv.totalAmount.toLocaleString()}</Td>
               <Td><StatusBadge status={inv.status} /></Td>
               <Td className="text-gray-500 text-xs">{inv.dueDate ? formatDate(inv.dueDate) : '—'}</Td>
               <Td className="text-gray-500 text-xs">{inv.issuedAt ? formatDate(inv.issuedAt) : '—'}</Td>
               <Td>
                 <button className="text-xs text-primary-600 hover:underline">View</button>
               </Td>
             </tr>
           ))
          }
        </tbody>
      </Table>
    </div>
  );
}
