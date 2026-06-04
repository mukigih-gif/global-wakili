'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatCard } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { DollarSign, TrendingUp, FileText, AlertCircle, Plus, BookOpen, CreditCard, ArrowUpRight, ArrowDownLeft, Scale } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

type Invoice = { id: string; invoiceNumber: string; total: string; balanceDue: string; status: string; dueDate?: string; matter?: { title: string } | null; client?: { name: string } | null; };
type JournalEntry = { id: string; reference: string; description: string; amount: string; date: string; sourceModule?: string };
type Account = { id: string; accountCode: string; accountName: string; accountType: string; balance: string; currency: string };
type Receipt = { id: string; receiptNumber: string; amount: string; currency: string; paymentMethod: string; receivedAt: string; client?: { name: string } | null };

type Tab = 'overview' | 'invoices' | 'journals' | 'accounts' | 'receipts';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'overview',  label: 'Overview',       icon: <TrendingUp className="h-4 w-4" /> },
  { key: 'invoices',  label: 'Invoices',        icon: <FileText className="h-4 w-4" /> },
  { key: 'journals',  label: 'Journal Entries', icon: <BookOpen className="h-4 w-4" /> },
  { key: 'accounts',  label: 'Chart of Accounts', icon: <Scale className="h-4 w-4" /> },
  { key: 'receipts',  label: 'Payment Receipts', icon: <CreditCard className="h-4 w-4" /> },
];

export default function FinancePage() {
  const [tab, setTab]           = useState<Tab>('overview');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading]   = useState(false);
  const [statusFilter, setStatus] = useState('');

  useEffect(() => {
    setLoading(true);
    if (tab === 'overview' || tab === 'invoices') {
      const p = new URLSearchParams();
      if (statusFilter) p.set('status', statusFilter);
      api.get<{ data: Invoice[] }>(`/billing/invoices?${p}&limit=50`)
        .then((r) => setInvoices(r.data ?? [])).catch(() => {}).finally(() => setLoading(false));
    } else if (tab === 'journals') {
      api.get<{ data: JournalEntry[] }>('/finance/journals?limit=50')
        .then((r) => setJournals(r.data ?? [])).catch(() => {}).finally(() => setLoading(false));
    } else if (tab === 'accounts') {
      api.get<{ data: Account[] }>('/finance/accounts?limit=200')
        .then((r) => setAccounts(r.data ?? [])).catch(() => setAccounts([])).finally(() => setLoading(false));
    } else if (tab === 'receipts') {
      api.get<{ data: Receipt[] }>('/billing/receipts?limit=50')
        .then((r) => setReceipts(r.data ?? [])).catch(() => {}).finally(() => setLoading(false));
    }
  }, [tab, statusFilter]);

  const outstanding   = invoices.filter((i) => ['ISSUED','OVERDUE','PARTIALLY_PAID'].includes(i.status)).reduce((s, i) => s + parseFloat(i.balanceDue || i.total || '0'), 0);
  const totalBilled   = invoices.reduce((s, i) => s + parseFloat(i.total || '0'), 0);
  const overdueCount  = invoices.filter((i) => i.status === 'OVERDUE').length;
  const paidCount     = invoices.filter((i) => i.status === 'PAID').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
          <p className="text-sm text-gray-500">Invoicing, journals, chart of accounts, and payment receipts</p>
        </div>
        <div className="flex gap-2">
          <Link href="/app/billing/new"><Button size="sm" variant="secondary"><Plus className="h-4 w-4" /> New Invoice</Button></Link>
          <Link href="/app/billing"><Button size="sm"><FileText className="h-4 w-4" /> Billing</Button></Link>
          <Link href="/app/tax"><Button size="sm" variant="secondary"><Scale className="h-4 w-4" /> Tax</Button></Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Billed" value={loading ? '—' : formatCurrency(totalBilled)} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard label="Outstanding" value={loading ? '—' : formatCurrency(outstanding)} icon={<AlertCircle className="h-5 w-5" />} deltaType={outstanding > 0 ? 'down' : 'neutral'} />
        <StatCard label="Overdue" value={loading ? '—' : overdueCount} icon={<AlertCircle className="h-5 w-5" />} deltaType={overdueCount > 0 ? 'down' : 'neutral'} />
        <StatCard label="Paid Invoices" value={loading ? '—' : paidCount} icon={<TrendingUp className="h-5 w-5" />} deltaType="up" />
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setStatus(''); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === t.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="card">
              <div className="card-header"><h2 className="font-semibold text-gray-900">Invoice Status Breakdown</h2></div>
              {invoices.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[
                    { name: 'Draft',     count: invoices.filter(i => i.status==='DRAFT').length },
                    { name: 'Issued',    count: invoices.filter(i => i.status==='ISSUED').length },
                    { name: 'Partial',   count: invoices.filter(i => i.status==='PARTIALLY_PAID').length },
                    { name: 'Paid',      count: invoices.filter(i => i.status==='PAID').length },
                    { name: 'Overdue',   count: invoices.filter(i => i.status==='OVERDUE').length },
                  ]} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1B3A6B" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-52 flex items-center justify-center text-sm text-gray-400">No invoice data</div>}
            </div>
            <div className="card">
              <div className="card-header"><h2 className="font-semibold text-gray-900">Quick Links</h2></div>
              <div className="p-4 grid grid-cols-2 gap-3">
                {[
                  { label: 'Chart of Accounts', href: '#', onClick: () => setTab('accounts'), icon: <Scale className="h-4 w-4" /> },
                  { label: 'Journal Entries', href: '#', onClick: () => setTab('journals'), icon: <BookOpen className="h-4 w-4" /> },
                  { label: 'Payment Receipts', href: '#', onClick: () => setTab('receipts'), icon: <CreditCard className="h-4 w-4" /> },
                  { label: 'VAT & Tax', href: '/app/tax', icon: <ArrowUpRight className="h-4 w-4" /> },
                  { label: 'Trust Accounting', href: '/app/trust', icon: <ArrowUpRight className="h-4 w-4" /> },
                  { label: 'Billing', href: '/app/billing', icon: <ArrowUpRight className="h-4 w-4" /> },
                  { label: 'Reports', href: '/app/reports', icon: <ArrowUpRight className="h-4 w-4" /> },
                  { label: 'Bank Reconciliation', href: '/app/finance/reconciliation', icon: <ArrowDownLeft className="h-4 w-4" /> },
                ].map((item) => (
                  item.onClick
                    ? <button key={item.label} onClick={item.onClick} className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-left">
                        <span className="text-primary-600">{item.icon}</span>{item.label}
                      </button>
                    : <Link key={item.label} href={item.href} className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                        <span className="text-primary-600">{item.icon}</span>{item.label}
                      </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoices */}
      {tab === 'invoices' && (
        <>
          <div className="flex gap-3">
            <select value={statusFilter} onChange={(e) => setStatus(e.target.value)} className="form-select w-44">
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option><option value="ISSUED">Issued</option>
              <option value="PARTIALLY_PAID">Partially Paid</option><option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option><option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <Table>
            <thead><tr><Th>Invoice</Th><Th>Client</Th><Th>Matter</Th><Th>Total</Th><Th>Balance Due</Th><Th>Status</Th><Th>Due</Th><Th></Th></tr></thead>
            <tbody>
              {loading ? <LoadingRow colSpan={8} /> :
               !invoices.length ? <EmptyRow colSpan={8} message="No invoices found" /> :
               invoices.map((inv) => (
                 <tr key={inv.id} className={inv.status === 'OVERDUE' ? 'bg-red-50/30' : ''}>
                   <Td><span className="font-mono text-xs">{inv.invoiceNumber}</span></Td>
                   <Td className="text-sm text-gray-900">{inv.client?.name ?? '—'}</Td>
                   <Td className="text-xs text-gray-500">{inv.matter?.title?.slice(0,25) ?? '—'}</Td>
                   <Td className="font-medium">{formatCurrency(inv.total)}</Td>
                   <Td className={`font-medium ${parseFloat(inv.balanceDue) > 0 ? 'text-amber-700' : 'text-green-700'}`}>{formatCurrency(inv.balanceDue)}</Td>
                   <Td><StatusBadge status={inv.status} /></Td>
                   <Td className="text-xs text-gray-500">{inv.dueDate ? formatDate(inv.dueDate) : '—'}</Td>
                   <Td><Link href={`/app/billing`} className="text-xs text-primary-600 hover:underline">View</Link></Td>
                 </tr>
               ))}
            </tbody>
          </Table>
        </>
      )}

      {/* Journal Entries */}
      {tab === 'journals' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Posted journal entries from all modules</p>
            <Button size="sm" variant="secondary"><Plus className="h-4 w-4" /> Manual Journal</Button>
          </div>
          <Table>
            <thead><tr><Th>Reference</Th><Th>Description</Th><Th>Amount</Th><Th>Source</Th><Th>Date</Th></tr></thead>
            <tbody>
              {loading ? <LoadingRow colSpan={5} /> :
               !journals.length ? <EmptyRow colSpan={5} message="No journal entries found. Post invoices and receipts to generate entries." /> :
               journals.map((j) => (
                 <tr key={j.id}>
                   <Td><span className="font-mono text-xs">{j.reference}</span></Td>
                   <Td className="text-sm text-gray-900">{j.description}</Td>
                   <Td className="font-medium">{formatCurrency(j.amount)}</Td>
                   <Td className="text-xs text-gray-500">{j.sourceModule?.replace(/_/g,' ') ?? '—'}</Td>
                   <Td className="text-xs text-gray-500">{formatDate(j.date)}</Td>
                 </tr>
               ))}
            </tbody>
          </Table>
        </div>
      )}

      {/* Chart of Accounts */}
      {tab === 'accounts' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">General ledger chart of accounts</p>
            <Button size="sm" variant="secondary"><Plus className="h-4 w-4" /> Add Account</Button>
          </div>
          <Table>
            <thead><tr><Th>Code</Th><Th>Account Name</Th><Th>Type</Th><Th>Balance</Th><Th>Currency</Th></tr></thead>
            <tbody>
              {loading ? <LoadingRow colSpan={5} /> :
               !accounts.length ? <EmptyRow colSpan={5} message="No accounts in chart. Run seed-finance.ts or add accounts manually." /> :
               accounts.map((a) => (
                 <tr key={a.id}>
                   <Td><span className="font-mono text-xs text-gray-600">{a.accountCode}</span></Td>
                   <Td className="font-medium text-gray-900">{a.accountName}</Td>
                   <Td className="text-xs text-gray-500">{a.accountType?.replace(/_/g,' ')}</Td>
                   <Td className={`font-medium ${parseFloat(a.balance) < 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatCurrency(a.balance, a.currency)}</Td>
                   <Td className="text-xs text-gray-400">{a.currency}</Td>
                 </tr>
               ))}
            </tbody>
          </Table>
        </div>
      )}

      {/* Payment Receipts */}
      {tab === 'receipts' && (
        <Table>
          <thead><tr><Th>Receipt No.</Th><Th>Client</Th><Th>Amount</Th><Th>Method</Th><Th>Date</Th></tr></thead>
          <tbody>
            {loading ? <LoadingRow colSpan={5} /> :
             !receipts.length ? <EmptyRow colSpan={5} message="No payment receipts found" /> :
             receipts.map((r) => (
               <tr key={r.id}>
                 <Td><span className="font-mono text-xs">{r.receiptNumber}</span></Td>
                 <Td className="text-gray-900 text-sm">{r.client?.name ?? '—'}</Td>
                 <Td className="font-medium text-green-700">{formatCurrency(r.amount, r.currency)}</Td>
                 <Td className="text-xs text-gray-600">{r.paymentMethod?.replace(/_/g,' ')}</Td>
                 <Td className="text-xs text-gray-500">{formatDate(r.receivedAt)}</Td>
               </tr>
             ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
