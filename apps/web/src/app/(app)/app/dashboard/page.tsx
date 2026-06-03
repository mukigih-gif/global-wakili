'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatCard } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Briefcase, DollarSign, Clock, FileText, TrendingUp, Users } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

type DashboardSummary = {
  openMatters: number;
  draftInvoices: number;
  unpaidAmount: string;
  pendingTimeEntries: number;
  activeClients?: number;
  recentMatters: Array<{ id: string; title: string; matterCode: string; status: string; createdAt: string }>;
  recentInvoices: Array<{ id: string; invoiceNumber: string; total: string; status: string; dueDate: string }>;
  revenueByMonth?: Array<{ month: string; revenue: number }>;
  mattersByStatus?: Array<{ status: string; count: number }>;
};

const CHART_COLORS = { primary: '#1B3A6B', gold: '#C9A227', green: '#16a34a', red: '#dc2626' };

export default function DashboardPage() {
  const [data, setData]     = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<DashboardSummary>('/matters/dashboard/summary')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  // Fallback chart data when API has none
  const revenueData = data?.revenueByMonth?.length
    ? data.revenueByMonth
    : ['Jan','Feb','Mar','Apr','May','Jun'].map((month) => ({ month, revenue: 0 }));

  const statusData = data?.mattersByStatus?.length
    ? data.mattersByStatus
    : [
        { status: 'Active',   count: data?.openMatters ?? 0 },
        { status: 'Pending',  count: 0 },
        { status: 'Closed',   count: 0 },
      ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Live overview of your firm&apos;s activity</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-primary-600 hover:underline"
        >
          Refresh
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-6">
        <StatCard label="Open Matters"        value={loading ? '—' : (data?.openMatters ?? 0)}             icon={<Briefcase className="h-5 w-5" />} />
        <StatCard label="Active Clients"      value={loading ? '—' : (data?.activeClients ?? '—')}          icon={<Users className="h-5 w-5" />} />
        <StatCard label="Unpaid Invoices"     value={loading ? '—' : formatCurrency(data?.unpaidAmount ?? 0)} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard label="Draft Invoices"      value={loading ? '—' : (data?.draftInvoices ?? 0)}            icon={<FileText className="h-5 w-5" />} />
        <StatCard label="Pending Time"        value={loading ? '—' : (data?.pendingTimeEntries ?? 0)}       icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Realisation"         value={loading ? '—' : '—'}                                  icon={<TrendingUp className="h-5 w-5" />} deltaType="up" />
      </div>

      {/* Live charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue trend */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900">Revenue Trend</h2>
            <p className="text-xs text-gray-400">Monthly billed revenue (KES)</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={CHART_COLORS.primary} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`KES ${v.toLocaleString()}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.primary} strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Matters by status */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900">Matters by Status</h2>
            <p className="text-xs text-gray-400">Current matter distribution</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={statusData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="status" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill={CHART_COLORS.gold} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Matters</h2>
            <a href="/app/matters" className="text-xs text-primary-600 hover:underline">View all</a>
          </div>
          <Table>
            <thead><tr><Th>Matter</Th><Th>Code</Th><Th>Status</Th><Th>Opened</Th></tr></thead>
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
               ))}
            </tbody>
          </Table>
        </div>

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Invoices</h2>
            <a href="/app/billing" className="text-xs text-primary-600 hover:underline">View all</a>
          </div>
          <Table>
            <thead><tr><Th>Invoice</Th><Th>Amount</Th><Th>Status</Th><Th>Due</Th></tr></thead>
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
               ))}
            </tbody>
          </Table>
        </div>
      </div>
    </div>
  );
}
