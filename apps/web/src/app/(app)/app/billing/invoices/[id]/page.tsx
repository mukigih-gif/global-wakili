'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table';
import { ArrowLeft, FileText, Building, Briefcase } from 'lucide-react';

type InvoiceLine = {
  id: string;
  description?: string | null;
  quantity?: number | string | null;
  unitPrice?: number | string | null;
  total?: number | string | null;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  client?: { name?: string } | null;
  matter?: { matterCode?: string; title?: string } | null;
  total?: number | string;
  totalAmount?: number | string;
  subTotal?: number | string;
  taxAmount?: number | string;
  paidAmount?: number | string;
  balanceDue?: number | string;
  currency?: string;
  status: string;
  dueDate?: string | null;
  issuedDate?: string | null;
  createdAt?: string;
  lines?: InvoiceLine[];
};

const num = (v: unknown) => parseFloat(String(v ?? 0)) || 0;

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    // No single-fetch endpoint yet — resolve from the tenant invoice list.
    api.get<{ data: Invoice[] }>('/billing/invoices?limit=500')
      .then((r) => setInvoice((r.data ?? []).find((i) => i.id === id) ?? null))
      .catch(() => setInvoice(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-40 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-16 text-gray-400">
        Invoice not found. <Link href="/app/billing" className="text-primary-600 underline">Back to Billing</Link>
      </div>
    );
  }

  const total = num(invoice.total ?? invoice.totalAmount);
  const paid = num(invoice.paidAmount);
  const balance = invoice.balanceDue != null ? num(invoice.balanceDue) : total - paid;
  const cur = invoice.currency ?? 'KES';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/app/billing" className="mt-1 text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary-600" /> {invoice.invoiceNumber}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-3 flex-wrap">
              {invoice.client?.name && <span className="flex items-center gap-1"><Building className="h-3.5 w-3.5" /> {invoice.client.name}</span>}
              {invoice.matter?.matterCode && <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {invoice.matter.matterCode}</span>}
            </p>
          </div>
        </div>
        <StatusBadge status={invoice.status} />
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(total, cur)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Paid</p>
          <p className="text-xl font-bold text-green-700">{formatCurrency(paid, cur)}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-xs text-amber-600">Balance Due</p>
          <p className="text-xl font-bold text-amber-800">{formatCurrency(balance, cur)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Due Date</p>
          <p className="text-lg font-bold text-gray-900">{invoice.dueDate ? formatDate(invoice.dueDate) : '—'}</p>
        </div>
      </div>

      {/* Line items */}
      <div className="card">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Line Items</h2>
        </div>
        <Table>
          <thead><tr><Th>Description</Th><Th>Qty</Th><Th>Unit Price</Th><Th>Amount</Th></tr></thead>
          <tbody>
            {!invoice.lines?.length ? <EmptyRow colSpan={4} message="No line items on this invoice" /> :
             invoice.lines.map((l) => (
               <tr key={l.id}>
                 <Td className="text-sm text-gray-900">{l.description ?? '—'}</Td>
                 <Td className="text-xs text-gray-600">{num(l.quantity).toLocaleString()}</Td>
                 <Td className="text-xs text-gray-600">{formatCurrency(num(l.unitPrice), cur)}</Td>
                 <Td className="font-medium text-gray-900">{formatCurrency(num(l.total), cur)}</Td>
               </tr>
             ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
