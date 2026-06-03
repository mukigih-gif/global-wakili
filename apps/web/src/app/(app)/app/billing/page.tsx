'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Plus, Search, FileText, ArrowRight, DollarSign, Clock, CheckCircle } from 'lucide-react';

type Quotation = {
  id: string;
  quotationNumber: string;
  client?: { name: string } | null;
  matter?: { matterCode: string } | null;
  totalAmount: number;
  currency: string;
  status: string;
  validUntil?: string | null;
  createdAt: string;
};

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
  quotationId?: string | null;
  createdAt: string;
};

type Tab = 'quotations' | 'invoices';

const fmt = (amount: number | string, currency = 'KES') => formatCurrency(amount, currency);

export default function BillingPage() {
  const router = useRouter();
  const [tab, setTab]             = useState<Tab>('quotations');
  const [quotations, setQuotes]   = useState<Quotation[]>([]);
  const [invoices, setInvoices]   = useState<Invoice[]>([]);
  const [loading, setLoading]     = useState(true);
  const [query, setQuery]         = useState('');
  const [statusFilter, setStatus] = useState('');
  const [converting, setConverting] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('search', query);
    if (statusFilter) params.set('status', statusFilter);

    if (tab === 'quotations') {
      api.get<{ data: Quotation[] }>(`/billing/quotations?${params}`)
        .then((r) => setQuotes(r.data ?? [])).catch(() => setQuotes([]))
        .finally(() => setLoading(false));
    } else {
      api.get<{ data: Invoice[] }>(`/billing/invoices?${params}`)
        .then((r) => setInvoices(r.data ?? [])).catch(() => setInvoices([]))
        .finally(() => setLoading(false));
    }
  }, [tab, query, statusFilter]);

  const convertToInvoice = async (quotationId: string) => {
    setConverting(quotationId);
    try {
      const inv = await api.post<Invoice>(`/billing/quotations/${quotationId}/convert`, {});
      router.push(`/app/billing/invoices/${inv.id}`);
    } catch {
      // show error inline — for now reload to show updated status
      setConverting(null);
    }
  };

  // Summary metrics
  const outstanding = invoices.filter((i) => ['ISSUED','OVERDUE','PARTIALLY_PAID'].includes(i.status)).reduce((s, i) => s + i.totalAmount, 0);
  const pendingQuotes = quotations.filter((q) => ['DRAFT','SENT'].includes(q.status)).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-sm text-gray-500">Quotations → Invoices → Payments lifecycle</p>
        </div>
        <div className="flex gap-2">
          {tab === 'quotations' && (
            <Link href="/app/billing/quotations/new">
              <Button size="sm"><Plus className="h-4 w-4" /> New Quotation</Button>
            </Link>
          )}
          {tab === 'invoices' && (
            <Link href="/app/billing/new">
              <Button size="sm"><Plus className="h-4 w-4" /> New Invoice</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Lifecycle banner */}
      <div className="flex items-center gap-3 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-xs text-gray-600">
        <span className="flex items-center gap-1.5 font-medium"><FileText className="h-3.5 w-3.5 text-primary-500" /> Quotation</span>
        <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
        <span className="flex items-center gap-1.5 font-medium"><CheckCircle className="h-3.5 w-3.5 text-amber-500" /> Accepted</span>
        <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
        <span className="flex items-center gap-1.5 font-medium"><FileText className="h-3.5 w-3.5 text-blue-500" /> Invoice Issued</span>
        <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
        <span className="flex items-center gap-1.5 font-medium"><Clock className="h-3.5 w-3.5 text-orange-500" /> Partially Paid</span>
        <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
        <span className="flex items-center gap-1.5 font-medium"><DollarSign className="h-3.5 w-3.5 text-green-500" /> Paid</span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">Total Invoices</p>
          <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-xs text-amber-600 mb-1">Outstanding</p>
          <p className="text-xl font-bold text-amber-800">{fmt(outstanding)}</p>
        </div>
        <div className="rounded-xl border border-green-100 bg-green-50 p-4">
          <p className="text-xs text-green-700 mb-1">Paid Invoices</p>
          <p className="text-2xl font-bold text-green-800">{invoices.filter((i) => i.status === 'PAID').length}</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs text-blue-700 mb-1">Open Quotations</p>
          <p className="text-2xl font-bold text-blue-800">{pendingQuotes}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { key: 'quotations', label: 'Quotations', icon: <FileText className="h-4 w-4" /> },
          { key: 'invoices',   label: 'Invoices',   icon: <DollarSign className="h-4 w-4" /> },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setQuery(''); setStatus(''); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="search" placeholder={`Search ${tab}…`} value={query}
            onChange={(e) => setQuery(e.target.value)} className="form-input pl-9 w-full" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatus(e.target.value)} className="form-select w-44">
          <option value="">All Statuses</option>
          {tab === 'quotations' ? (
            <>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent to Client</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Rejected</option>
              <option value="EXPIRED">Expired</option>
              <option value="CONVERTED">Converted to Invoice</option>
            </>
          ) : (
            <>
              <option value="DRAFT">Draft</option>
              <option value="ISSUED">Issued</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="VOID">Void</option>
            </>
          )}
        </select>
      </div>

      {/* Quotations table */}
      {tab === 'quotations' && (
        <Table>
          <thead>
            <tr>
              <Th>Quotation No.</Th>
              <Th>Client</Th>
              <Th>Matter</Th>
              <Th>Total</Th>
              <Th>Status</Th>
              <Th>Valid Until</Th>
              <Th>Created</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow colSpan={8} /> :
             !quotations.length ? <EmptyRow colSpan={8} message="No quotations yet — create your first quotation above" /> :
             quotations.map((q) => (
               <tr key={q.id} className={q.status === 'ACCEPTED' ? 'bg-green-50/30' : ''}>
                 <Td>
                   <div className="flex items-center gap-2">
                     <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                     <span className="font-mono text-xs text-gray-700">{q.quotationNumber}</span>
                   </div>
                 </Td>
                 <Td className="font-medium text-gray-900">{q.client?.name ?? '—'}</Td>
                 <Td className="text-gray-600 text-xs">{q.matter?.matterCode ?? '—'}</Td>
                 <Td className="font-medium text-gray-900">{fmt(q.totalAmount, q.currency)}</Td>
                 <Td><StatusBadge status={q.status} /></Td>
                 <Td className={`text-xs ${q.validUntil && new Date(q.validUntil) < new Date() ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                   {q.validUntil ? formatDate(q.validUntil) : '—'}
                 </Td>
                 <Td className="text-gray-500 text-xs">{formatDate(q.createdAt)}</Td>
                 <Td>
                   <div className="flex items-center gap-2">
                     <button className="text-xs text-primary-600 hover:underline">View</button>
                     {q.status === 'ACCEPTED' && (
                       <button
                         onClick={() => convertToInvoice(q.id)}
                         disabled={converting === q.id}
                         className="text-xs text-green-700 font-medium hover:underline flex items-center gap-1 disabled:opacity-50"
                       >
                         {converting === q.id ? 'Converting…' : <><ArrowRight className="h-3 w-3" /> Convert to Invoice</>}
                       </button>
                     )}
                     {q.status === 'DRAFT' && (
                       <button className="text-xs text-blue-600 hover:underline">Send</button>
                     )}
                   </div>
                 </Td>
               </tr>
             ))}
          </tbody>
        </Table>
      )}

      {/* Invoices table */}
      {tab === 'invoices' && (
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
               <tr key={inv.id} className={inv.status === 'OVERDUE' ? 'bg-red-50/30' : ''}>
                 <Td>
                   <div className="flex items-center gap-2">
                     <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                     <span className="font-mono text-xs text-gray-700">{inv.invoiceNumber}</span>
                   </div>
                 </Td>
                 <Td className="font-medium text-gray-900">{inv.client?.name ?? '—'}</Td>
                 <Td className="text-gray-600 text-xs">{inv.matter?.matterCode ?? '—'}</Td>
                 <Td className="font-medium text-gray-900">{fmt(inv.totalAmount, inv.currency)}</Td>
                 <Td><StatusBadge status={inv.status} /></Td>
                 <Td className={`text-xs ${inv.status === 'OVERDUE' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                   {inv.dueDate ? formatDate(inv.dueDate) : '—'}
                 </Td>
                 <Td className="text-gray-500 text-xs">{inv.issuedAt ? formatDate(inv.issuedAt) : '—'}</Td>
                 <Td>
                   <div className="flex items-center gap-2">
                     <button className="text-xs text-primary-600 hover:underline">View</button>
                     {inv.quotationId && (
                       <span className="text-[10px] text-gray-400 italic">from quote</span>
                     )}
                   </div>
                 </Td>
               </tr>
             ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
