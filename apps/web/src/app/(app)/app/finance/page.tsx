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
import { DollarSign, TrendingUp, FileText, AlertCircle, Plus, BookOpen, CreditCard, ArrowUpRight, ArrowDownLeft, Scale, X } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

type Invoice = { id: string; invoiceNumber: string; total: string; balanceDue: string; status: string; dueDate?: string; matter?: { title: string } | null; client?: { name: string } | null; };
type JournalEntry = { id: string; reference: string; description: string; amount: string; date: string; sourceModule?: string };
type Account = { id: string; accountCode: string; accountName: string; accountType: string; balance: string; currency: string };
type Receipt = { id: string; receiptNumber: string; amount: string; currency: string; paymentMethod: string; receivedAt: string; client?: { name: string } | null };

type Tab = 'overview' | 'invoices' | 'journals' | 'accounts' | 'receipts' | 'statements';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'overview',   label: 'Overview',          icon: <TrendingUp className="h-4 w-4" /> },
  { key: 'invoices',   label: 'Invoices',           icon: <FileText className="h-4 w-4" /> },
  { key: 'journals',   label: 'Journal Entries',    icon: <BookOpen className="h-4 w-4" /> },
  { key: 'accounts',   label: 'Chart of Accounts',  icon: <Scale className="h-4 w-4" /> },
  { key: 'receipts',   label: 'Payment Receipts',   icon: <CreditCard className="h-4 w-4" /> },
  { key: 'statements', label: 'P&L / Balance Sheet', icon: <TrendingUp className="h-4 w-4" /> },
];

export default function FinancePage() {
  const [tab, setTab]           = useState<Tab>('overview');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading]   = useState(false);
  const [statusFilter, setStatus] = useState('');
  const [statements, setStatements] = useState<{ pnl: any; balanceSheet: any } | null>(null);
  const [stmtYear, setStmtYear]     = useState(new Date().getFullYear());
  const [showJournal, setShowJournal] = useState(false);
  const [journalSaving, setJournalSaving] = useState(false);
  const [journalError, setJournalError]   = useState('');
  const [journalForm, setJournalForm] = useState({
    description: '', reference: '', date: new Date().toISOString().slice(0, 10),
    drAccountId: '', crAccountId: '', amount: '', notes: '',
  });

  useEffect(() => {
    setLoading(true);
    if (tab === 'overview' || tab === 'invoices') {
      const p = new URLSearchParams();
      if (statusFilter) p.set('status', statusFilter);
      api.get<{ data: Invoice[] }>(`/billing/invoices?${p}&limit=50`)
        .then((r) => setInvoices(r.data ?? [])).catch(() => {}).finally(() => setLoading(false));
    } else if (tab === 'journals') {
      Promise.all([
        api.get<{ data: JournalEntry[] }>('/finance/journals?limit=50').then((r) => setJournals(r.data ?? [])).catch(() => {}),
        accounts.length === 0 ? api.get<{ data: Account[] }>('/finance/accounts?limit=200').then((r) => setAccounts(r.data ?? [])).catch(() => {}) : Promise.resolve(),
      ]).finally(() => setLoading(false));
    } else if (tab === 'accounts') {
      api.get<{ data: Account[] }>('/finance/accounts?limit=200')
        .then((r) => setAccounts(r.data ?? [])).catch(() => setAccounts([])).finally(() => setLoading(false));
    } else if (tab === 'receipts') {
      api.get<{ data: Receipt[] }>('/billing/receipts?limit=50')
        .then((r) => setReceipts(r.data ?? [])).catch(() => {}).finally(() => setLoading(false));
    } else if (tab === 'statements') {
      api.get<any>(`/finance/statements?year=${stmtYear}`)
        .then((r) => setStatements(r))
        .catch(() => setStatements(null))
        .finally(() => setLoading(false));
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
            <Button size="sm" variant="secondary" onClick={() => { setShowJournal(true); setJournalError(''); }}>
              <Plus className="h-4 w-4" /> Manual Journal
            </Button>
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

      {/* Financial Statements */}
      {tab === 'statements' && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 font-medium">Year:</label>
            <select className="form-select w-28" value={stmtYear} onChange={(e) => setStmtYear(parseInt(e.target.value))}>
              {[0, 1, 2, 3].map((i) => {
                const y = new Date().getFullYear() - i;
                return <option key={y} value={y}>{y}</option>;
              })}
            </select>
            <Button size="sm" variant="secondary" onClick={() => {
              setLoading(true);
              api.get<any>(`/finance/statements?year=${stmtYear}`).then(setStatements).catch(() => setStatements(null)).finally(() => setLoading(false));
            }}>Load Statements</Button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading financial statements…</div>
          ) : !statements ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
              <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Financial statements not available.</p>
              <p className="text-xs text-gray-400 mt-1">Post journal entries and invoice payments to generate P&L and Balance Sheet.</p>
              <Button size="sm" variant="secondary" className="mt-3" onClick={() => { setTab('journals'); }}>Go to Journal Entries</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* P&L Statement */}
              <div className="card">
                <div className="card-header flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">Profit & Loss Statement</h2>
                  <span className="text-xs text-gray-400">FY {stmtYear}</span>
                </div>
                <div className="p-4 space-y-1 text-sm">
                  {statements.pnl ? (
                    <>
                      <div className="flex justify-between font-semibold text-gray-800 bg-gray-50 px-2 py-1.5 rounded"><span>Revenue</span><span>{formatCurrency(statements.pnl.totalRevenue ?? 0)}</span></div>
                      {(statements.pnl.revenueLines ?? []).map((l: any) => (
                        <div key={l.account} className="flex justify-between text-gray-600 px-4 py-0.5"><span>{l.account}</span><span>{formatCurrency(l.amount)}</span></div>
                      ))}
                      <div className="flex justify-between font-semibold text-gray-800 bg-gray-50 px-2 py-1.5 rounded mt-2"><span>Expenses</span><span className="text-red-600">{formatCurrency(statements.pnl.totalExpenses ?? 0)}</span></div>
                      {(statements.pnl.expenseLines ?? []).map((l: any) => (
                        <div key={l.account} className="flex justify-between text-gray-600 px-4 py-0.5"><span>{l.account}</span><span className="text-red-500">{formatCurrency(l.amount)}</span></div>
                      ))}
                      <div className={`flex justify-between font-bold text-base border-t-2 border-gray-300 pt-2 mt-2 px-2 ${parseFloat(statements.pnl.netProfit ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        <span>Net {parseFloat(statements.pnl.netProfit ?? 0) >= 0 ? 'Profit' : 'Loss'}</span>
                        <span>{formatCurrency(Math.abs(parseFloat(statements.pnl.netProfit ?? 0)))}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-400 text-center py-4">P&L data not available for {stmtYear}</p>
                  )}
                </div>
              </div>

              {/* Balance Sheet */}
              <div className="card">
                <div className="card-header flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">Balance Sheet</h2>
                  <span className="text-xs text-gray-400">As at 31 Dec {stmtYear}</span>
                </div>
                <div className="p-4 space-y-1 text-sm">
                  {statements.balanceSheet ? (
                    <>
                      <div className="flex justify-between font-semibold text-gray-800 bg-gray-50 px-2 py-1.5 rounded"><span>Assets</span><span>{formatCurrency(statements.balanceSheet.totalAssets ?? 0)}</span></div>
                      {(statements.balanceSheet.assetLines ?? []).map((l: any) => (
                        <div key={l.account} className="flex justify-between text-gray-600 px-4 py-0.5"><span>{l.account}</span><span>{formatCurrency(l.amount)}</span></div>
                      ))}
                      <div className="flex justify-between font-semibold text-gray-800 bg-gray-50 px-2 py-1.5 rounded mt-2"><span>Liabilities</span><span className="text-red-600">{formatCurrency(statements.balanceSheet.totalLiabilities ?? 0)}</span></div>
                      {(statements.balanceSheet.liabilityLines ?? []).map((l: any) => (
                        <div key={l.account} className="flex justify-between text-gray-600 px-4 py-0.5"><span>{l.account}</span><span className="text-red-500">{formatCurrency(l.amount)}</span></div>
                      ))}
                      <div className="flex justify-between font-semibold text-gray-800 bg-gray-50 px-2 py-1.5 rounded mt-2"><span>Equity</span><span className="text-blue-700">{formatCurrency(statements.balanceSheet.equity ?? 0)}</span></div>
                      <div className={`flex justify-between font-bold text-base border-t-2 border-gray-300 pt-2 mt-2 px-2 ${Math.abs((statements.balanceSheet.totalAssets ?? 0) - (statements.balanceSheet.totalLiabilities ?? 0) - (statements.balanceSheet.equity ?? 0)) < 0.01 ? 'text-green-700' : 'text-red-700'}`}>
                        <span>Balanced</span>
                        <span>{Math.abs((statements.balanceSheet.totalAssets ?? 0) - (statements.balanceSheet.totalLiabilities ?? 0) - (statements.balanceSheet.equity ?? 0)) < 0.01 ? '✓' : '⚠ Imbalanced'}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-400 text-center py-4">Balance sheet not available for {stmtYear}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Journal Entry Modal */}
      {showJournal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowJournal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary-600" /> Manual Journal Entry</h3>
              <button onClick={() => setShowJournal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-xs text-gray-500">Double-entry: select the Debit account and Credit account. Must be equal and opposite.</p>
            {journalError && <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{journalError}</div>}
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!journalForm.drAccountId || !journalForm.crAccountId || !journalForm.amount || parseFloat(journalForm.amount) <= 0) {
                setJournalError('All required fields must be filled'); return;
              }
              setJournalSaving(true); setJournalError('');
              try {
                await api.post('/finance/journals', {
                  description: journalForm.description,
                  reference:   journalForm.reference || `MJE-${Date.now().toString(36).toUpperCase()}`,
                  date:        new Date(journalForm.date).toISOString(),
                  lines: [
                    { accountId: journalForm.drAccountId, debit: parseFloat(journalForm.amount), credit: 0, description: journalForm.notes || journalForm.description },
                    { accountId: journalForm.crAccountId, debit: 0, credit: parseFloat(journalForm.amount), description: journalForm.notes || journalForm.description },
                  ],
                });
                setShowJournal(false);
                setJournalForm({ description: '', reference: '', date: new Date().toISOString().slice(0, 10), drAccountId: '', crAccountId: '', amount: '', notes: '' });
                // Reload journals
                api.get<{ data: JournalEntry[] }>('/finance/journals?limit=50').then((r) => setJournals(r.data ?? [])).catch(() => {});
              } catch (err: unknown) {
                setJournalError(err instanceof Error ? err.message : 'Failed to post journal entry');
              } finally { setJournalSaving(false); }
            }} className="space-y-3">
              <div>
                <label className="form-label">Description *</label>
                <input required value={journalForm.description} onChange={(e) => setJournalForm((f) => ({ ...f, description: e.target.value }))} className="form-input w-full" placeholder="e.g. Accrual for legal fees — January" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Reference</label>
                  <input value={journalForm.reference} onChange={(e) => setJournalForm((f) => ({ ...f, reference: e.target.value }))} className="form-input w-full" placeholder="Auto-generated if blank" />
                </div>
                <div>
                  <label className="form-label">Date *</label>
                  <input required type="date" value={journalForm.date} onChange={(e) => setJournalForm((f) => ({ ...f, date: e.target.value }))} className="form-input w-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label text-green-700">Debit Account (DR) *</label>
                  <select required value={journalForm.drAccountId} onChange={(e) => setJournalForm((f) => ({ ...f, drAccountId: e.target.value }))} className="form-select w-full">
                    <option value="">Select account…</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.accountCode} — {a.accountName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label text-red-700">Credit Account (CR) *</label>
                  <select required value={journalForm.crAccountId} onChange={(e) => setJournalForm((f) => ({ ...f, crAccountId: e.target.value }))} className="form-select w-full">
                    <option value="">Select account…</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.accountCode} — {a.accountName}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Amount *</label>
                <input required type="number" min="0.01" step="0.01" value={journalForm.amount} onChange={(e) => setJournalForm((f) => ({ ...f, amount: e.target.value }))} className="form-input w-full" placeholder="0.00" />
              </div>
              <div>
                <label className="form-label">Line Notes</label>
                <input value={journalForm.notes} onChange={(e) => setJournalForm((f) => ({ ...f, notes: e.target.value }))} className="form-input w-full" placeholder="Optional per-line note" />
              </div>
              <div className="flex gap-2 pt-1 border-t border-gray-100">
                <Button type="submit" loading={journalSaving}>Post Journal Entry</Button>
                <Button type="button" variant="secondary" onClick={() => setShowJournal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
