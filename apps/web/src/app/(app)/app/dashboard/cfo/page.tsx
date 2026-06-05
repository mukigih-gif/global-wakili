'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatCard } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, DollarSign, TrendingUp, Scale, AlertCircle, Receipt, BarChart2, RefreshCw } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

export default function CFODashboardPage() {
  const { user } = useAuth();
  const [invoices, setInvoices]   = useState<any[]>([]);
  const [trust, setTrust]         = useState<any>({});
  const [loading, setLoading]     = useState(true);
  const [lastRefresh, setRefresh] = useState(new Date().toISOString());

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      api.get<{ data: any[] }>('/billing/invoices?limit=200').then((r) => setInvoices(r.data ?? [])).catch(() => {}),
      api.get<any>('/trust/overview').then((r) => setTrust(r.dashboard ?? {})).catch(() => {}),
    ]).finally(() => { setLoading(false); setRefresh(new Date().toISOString()); });
  };

  useEffect(() => { fetchAll(); }, []);

  // Financial metrics
  const totalBilled      = invoices.reduce((s, i) => s + parseFloat(i.total || '0'), 0);
  const totalCollected   = invoices.reduce((s, i) => s + parseFloat(i.paidAmount || '0'), 0);
  const totalOutstanding = invoices.filter((i) => ['ISSUED','OVERDUE','PARTIALLY_PAID'].includes(i.status)).reduce((s, i) => s + parseFloat(i.balanceDue || i.total || '0'), 0);
  const overdueAmount    = invoices.filter((i) => i.status === 'OVERDUE').reduce((s, i) => s + parseFloat(i.balanceDue || i.total || '0'), 0);
  const trustBalance     = (trust.accounts || []).reduce((s: number, a: any) => s + parseFloat(a.currentBalance || '0'), 0);
  const collectionRate   = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  // Monthly billing trend
  const monthlyData = (() => {
    const months: Record<string, { billed: number; collected: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months[d.toLocaleDateString('en-KE', { month: 'short', year: '2-digit' })] = { billed: 0, collected: 0 };
    }
    invoices.forEach((inv) => {
      const d   = new Date(inv.createdAt);
      const key = d.toLocaleDateString('en-KE', { month: 'short', year: '2-digit' });
      if (key in months) {
        months[key].billed    += parseFloat(inv.total || '0');
        months[key].collected += parseFloat(inv.paidAmount || '0');
      }
    });
    return Object.entries(months).map(([month, v]) => ({ month, ...v }));
  })();

  // Invoice status pie
  const statusPie = [
    { name: 'Paid',     value: invoices.filter((i) => i.status === 'PAID').length,            fill: '#16a34a' },
    { name: 'Issued',   value: invoices.filter((i) => i.status === 'ISSUED').length,          fill: '#3b82f6' },
    { name: 'Overdue',  value: invoices.filter((i) => i.status === 'OVERDUE').length,         fill: '#ef4444' },
    { name: 'Partial',  value: invoices.filter((i) => i.status === 'PARTIALLY_PAID').length,  fill: '#f59e0b' },
    { name: 'Draft',    value: invoices.filter((i) => i.status === 'DRAFT').length,           fill: '#9ca3af' },
  ].filter((d) => d.value > 0);

  // Top outstanding invoices
  const topOutstanding = invoices
    .filter((i) => ['ISSUED','OVERDUE'].includes(i.status))
    .sort((a, b) => parseFloat(b.balanceDue || b.total || '0') - parseFloat(a.balanceDue || a.total || '0'))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/app/dashboard" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CFO Dashboard</h1>
            <p className="text-sm text-gray-500">Financial control centre — {user?.name} · Last refreshed {new Date(lastRefresh).toLocaleTimeString('en-KE')}</p>
          </div>
        </div>
        <button onClick={fetchAll} disabled={loading} className="flex items-center gap-1.5 text-xs text-primary-600 hover:underline disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* KPI row — CFO specific */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <StatCard label="Total Billed"      value={loading ? '—' : formatCurrency(totalBilled)}      icon={<DollarSign className="h-5 w-5 icon-finance" />} />
        <StatCard label="Collected"         value={loading ? '—' : formatCurrency(totalCollected)}   icon={<TrendingUp className="h-5 w-5 icon-success" />} deltaType="up" />
        <StatCard label="Outstanding"       value={loading ? '—' : formatCurrency(totalOutstanding)} icon={<AlertCircle className="h-5 w-5 icon-danger" />} deltaType={totalOutstanding > 0 ? 'down' : 'neutral'} />
        <StatCard label="Overdue"           value={loading ? '—' : formatCurrency(overdueAmount)}    icon={<AlertCircle className="h-5 w-5 icon-danger" />} deltaType={overdueAmount > 0 ? 'down' : 'neutral'} />
        <StatCard label="Trust Balance"     value={loading ? '—' : formatCurrency(trustBalance)}     icon={<Scale className="h-5 w-5 icon-trust" />} />
        <StatCard label="Collection Rate"   value={loading ? '—' : `${collectionRate}%`}             icon={<BarChart2 className="h-5 w-5 icon-finance" />} deltaType={collectionRate > 80 ? 'up' : collectionRate > 60 ? 'neutral' : 'down'} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Billing vs Collection trend */}
        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-gray-900">Billing vs Collections</h2><p className="text-xs text-gray-400">6-month trend (KES)</p></div>
          {monthlyData.some((d) => d.billed > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} />
                <Bar dataKey="billed"    name="Billed"    fill="#1B3A6B" radius={[3,3,0,0]} />
                <Bar dataKey="collected" name="Collected" fill="#16a34a" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-52 flex items-center justify-center text-sm text-gray-400">No billing data yet — create invoices to see trend</div>}
        </div>

        {/* Invoice status pie */}
        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-gray-900">Invoice Status</h2><p className="text-xs text-gray-400">{invoices.length} total invoices</p></div>
          {statusPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {statusPie.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-52 flex items-center justify-center text-sm text-gray-400">No invoices</div>}
        </div>
      </div>

      {/* Trust accounts */}
      {trust.accounts && trust.accounts.length > 0 && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Scale className="h-4 w-4 icon-trust" /> Trust Accounts</h2>
            <Link href="/app/trust" className="text-xs text-primary-600 hover:underline">Manage →</Link>
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
            {trust.accounts.map((a: any) => (
              <div key={a.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs text-gray-500 mb-0.5 truncate">{a.accountName}</p>
                <p className={`text-xl font-bold ${parseFloat(a.currentBalance) < 0 ? 'text-red-700' : 'text-green-700'}`}>{formatCurrency(a.currentBalance)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{a.bankName} · {a.accountNumber}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top outstanding invoices */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Receipt className="h-4 w-4 icon-finance" /> Top Outstanding Invoices</h2>
          <Link href="/app/billing" className="text-xs text-primary-600 hover:underline">All invoices →</Link>
        </div>
        <Table>
          <thead><tr><Th>Invoice</Th><Th>Client</Th><Th>Amount</Th><Th>Status</Th><Th>Due</Th></tr></thead>
          <tbody>
            {loading ? <LoadingRow colSpan={5} /> :
             !topOutstanding.length ? <EmptyRow colSpan={5} message="No outstanding invoices" /> :
             topOutstanding.map((inv) => (
               <tr key={inv.id} className={inv.status === 'OVERDUE' ? 'bg-red-50/30' : ''}>
                 <Td><span className="font-mono text-xs">{inv.invoiceNumber}</span></Td>
                 <Td className="font-medium text-gray-900">{inv.client?.name ?? '—'}</Td>
                 <Td className="font-bold text-amber-700">{formatCurrency(inv.balanceDue || inv.total)}</Td>
                 <Td><StatusBadge status={inv.status} /></Td>
                 <Td className={`text-xs ${inv.status === 'OVERDUE' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>{inv.dueDate ? formatDate(inv.dueDate) : '—'}</Td>
               </tr>
             ))}
          </tbody>
        </Table>
      </div>

      {/* Quick finance actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'New Invoice',        href: '/app/billing/new',             icon: <Receipt className="h-4 w-4 icon-finance" /> },
          { label: 'Billing Overview',   href: '/app/billing',                 icon: <DollarSign className="h-4 w-4 icon-finance" /> },
          { label: 'Tax Compliance',     href: '/app/tax',                     icon: <BarChart2 className="h-4 w-4 icon-finance" /> },
          { label: 'Trust Accounting',   href: '/app/trust',                   icon: <Scale className="h-4 w-4 icon-trust" /> },
          { label: 'Finance Reports',    href: '/app/finance',                 icon: <TrendingUp className="h-4 w-4 icon-finance" /> },
          { label: 'Analytics',          href: '/app/analytics',               icon: <BarChart2 className="h-4 w-4 icon-ai" /> },
          { label: 'Payroll',            href: '/app/hr',                      icon: <DollarSign className="h-4 w-4 icon-hr" /> },
          { label: 'Reconciliation',     href: '/app/finance/reconciliation',  icon: <RefreshCw className="h-4 w-4 icon-finance" /> },
        ].map((item) => (
          <Link key={item.label} href={item.href} className="card p-3 flex items-center gap-2 hover:shadow-sm transition-shadow text-sm font-medium text-gray-700 hover:text-primary-700">
            {item.icon}{item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
