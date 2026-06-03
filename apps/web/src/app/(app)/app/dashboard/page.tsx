'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { StatCard } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { useAuth } from '@/context/AuthContext';
import {
  Briefcase, DollarSign, Clock, FileText, TrendingUp, Users,
  AlertCircle, Scale, Activity, CheckSquare,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

type DashboardSummary = {
  openMatters?: number; draftInvoices?: number; unpaidAmount?: string;
  pendingTimeEntries?: number; activeClients?: number;
  recentMatters?: Array<{ id: string; title: string; matterCode: string; status: string; createdAt: string }>;
  recentInvoices?: Array<{ id: string; invoiceNumber: string; total: string; status: string; dueDate: string }>;
  revenueByMonth?: Array<{ month: string; revenue: number }>;
  mattersByStatus?: Array<{ status: string; count: number }>;
  wipTotal?: string; arAging?: { current: number; days30: number; days60: number; days90plus: number };
  pendingApprovals?: number; pendingTasks?: number;
};

type ActivityEntry = { id: string; action: string; entity: string; entityId?: string; actor?: string; createdAt: string };

const CHART_COLORS = { primary: '#1B3A6B', gold: '#C9A227' };

// Roles that see financial data
const FINANCE_ROLES = ['FIRM_ADMIN', 'MANAGING_PARTNER', 'PARTNER', 'CFO', 'ACCOUNTANT', 'SUPER_ADMIN', 'SYSTEM_ADMIN'];
const LAWYER_ROLES  = ['ASSOCIATE', 'PUPIL', 'PARTNER', 'MANAGING_PARTNER'];
const HR_ROLES      = ['HR', 'FIRM_ADMIN', 'MANAGING_PARTNER'];

function ARAgingCard({ aging }: { aging: DashboardSummary['arAging'] }) {
  if (!aging) return null;
  const total = aging.current + aging.days30 + aging.days60 + aging.days90plus;
  return (
    <div className="card">
      <div className="card-header"><h2 className="font-semibold text-gray-900">AR Aging</h2><p className="text-xs text-gray-400">Outstanding receivables by age</p></div>
      <div className="p-4 space-y-3">
        {[
          { label: 'Current (0–30 days)', value: aging.current, color: 'bg-green-500' },
          { label: '31–60 days',          value: aging.days30,  color: 'bg-yellow-400' },
          { label: '61–90 days',          value: aging.days60,  color: 'bg-orange-500' },
          { label: '90+ days',            value: aging.days90plus, color: 'bg-red-500' },
        ].map((row) => (
          <div key={row.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">{row.label}</span>
              <span className="font-medium text-gray-900">{formatCurrency(row.value)}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${row.color} rounded-full`} style={{ width: total ? `${(row.value / total) * 100}%` : '0%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WIPCard({ wipTotal }: { wipTotal?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-9 w-9 rounded-lg bg-primary-100 flex items-center justify-center">
          <Clock className="h-5 w-5 text-primary-700" />
        </div>
        <div>
          <p className="text-xs text-gray-500">WIP Summary</p>
          <p className="text-xl font-bold text-gray-900">{wipTotal ? formatCurrency(wipTotal) : '—'}</p>
        </div>
      </div>
      <p className="text-xs text-gray-400">Unbilled work in progress awaiting conversion to invoices</p>
    </div>
  );
}

function RecentActivities({ activities, loading }: { activities: ActivityEntry[]; loading: boolean }) {
  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Activity className="h-4 w-4 text-primary-600" /> Recent Activity</h2>
      </div>
      <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
        {loading ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">Loading…</div>
        ) : !activities.length ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">No recent activity</div>
        ) : (
          activities.map((a) => (
            <div key={a.id} className="px-4 py-2.5 flex items-start gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-primary-400 mt-2 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-800 truncate">
                  <span className="font-medium">{a.actor ?? 'System'}</span> {a.action} <span className="text-primary-600">{a.entity}</span>
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">{formatDateTime(a.createdAt)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user }  = useAuth();
  const role      = user?.role?.toUpperCase() ?? '';
  const showFin   = FINANCE_ROLES.includes(role);
  const showLegal = LAWYER_ROLES.includes(role);

  const [data, setData]         = useState<DashboardSummary | null>(null);
  const [activities, setActs]   = useState<ActivityEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [actsLoading, setAL]    = useState(true);

  useEffect(() => {
    api.get<DashboardSummary>('/matters/dashboard/summary')
      .then(setData).catch(() => setData(null)).finally(() => setLoading(false));
    api.get<{ data: ActivityEntry[] }>('/audit/recent?limit=15')
      .then((r) => setActs(r.data ?? [])).catch(() => setActs([])).finally(() => setAL(false));
  }, []);

  const revenueData = data?.revenueByMonth ?? [];
  const statusData  = data?.mattersByStatus ?? [];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const roleLabel: Record<string, string> = {
    FIRM_ADMIN: 'Firm Administrator', MANAGING_PARTNER: 'Managing Partner',
    PARTNER: 'Partner', ASSOCIATE: 'Associate', PUPIL: 'Pupil',
    CLERK: 'Clerk', OFFICE_ADMIN: 'Office Admin', HR: 'HR Manager',
    CFO: 'Chief Financial Officer', ACCOUNTANT: 'Accountant',
    SUPER_ADMIN: 'Platform Administrator',
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{greeting()}, {user?.name?.split(' ')[0] ?? 'there'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{roleLabel[role] ?? role} · {user?.tenantName ?? 'Global Wakili'}</p>
        </div>
        <button onClick={() => window.location.reload()} className="text-xs text-primary-600 hover:underline">Refresh</button>
      </div>

      {/* KPI row — role-dependent */}
      <div className={`grid gap-4 ${showFin ? 'grid-cols-2 lg:grid-cols-4 xl:grid-cols-6' : 'grid-cols-2 lg:grid-cols-4'}`}>
        {(showFin || showLegal || role === 'CLERK' || role === 'OFFICE_ADMIN') && (
          <StatCard label="Open Matters" value={loading ? '—' : (data?.openMatters ?? 0)} icon={<Briefcase className="h-5 w-5" />} />
        )}
        {showFin && (
          <StatCard label="Active Clients" value={loading ? '—' : (data?.activeClients ?? '—')} icon={<Users className="h-5 w-5" />} />
        )}
        {showFin && (
          <StatCard label="Unpaid Invoices" value={loading ? '—' : formatCurrency(data?.unpaidAmount ?? 0)} icon={<DollarSign className="h-5 w-5" />} />
        )}
        {showFin && (
          <StatCard label="Draft Invoices" value={loading ? '—' : (data?.draftInvoices ?? 0)} icon={<FileText className="h-5 w-5" />} />
        )}
        {(showLegal || showFin) && (
          <StatCard label="Pending Time" value={loading ? '—' : (data?.pendingTimeEntries ?? 0)} icon={<Clock className="h-5 w-5" />} />
        )}
        {(showFin || role === 'FIRM_ADMIN') && (
          <StatCard label="Pending Approvals" value={loading ? '—' : (data?.pendingApprovals ?? 0)} icon={<AlertCircle className="h-5 w-5" />} />
        )}
        {(showLegal || role === 'CLERK' || role === 'OFFICE_ADMIN') && (
          <StatCard label="My Tasks" value={loading ? '—' : (data?.pendingTasks ?? 0)} icon={<CheckSquare className="h-5 w-5" />} />
        )}
        {role === 'HR' && (
          <StatCard label="Pending Leave" value={loading ? '—' : '—'} icon={<Users className="h-5 w-5" />} />
        )}
      </div>

      {/* Finance-only charts row */}
      {showFin && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="card lg:col-span-2">
            <div className="card-header"><h2 className="font-semibold text-gray-900">Revenue Trend</h2><p className="text-xs text-gray-400">Monthly billed revenue (KES)</p></div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={CHART_COLORS.primary} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} />
                <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.primary} strokeWidth={2} fill="url(#rg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <WIPCard wipTotal={data?.wipTotal} />
        </div>
      )}

      {/* Middle row: AR Aging + Matters by Status (finance) OR just matters table */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {showFin && <ARAgingCard aging={data?.arAging} />}

        {(showFin || showLegal) && statusData.length > 0 && (
          <div className="card">
            <div className="card-header"><h2 className="font-semibold text-gray-900">Matter Performance</h2><p className="text-xs text-gray-400">Active vs closed matters</p></div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill={CHART_COLORS.gold} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Bottom tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {(showFin || showLegal || role === 'CLERK') && (
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
                     <Td className="text-gray-500 text-xs">{formatDate(m.createdAt)}</Td>
                   </tr>
                 ))}
              </tbody>
            </Table>
          </div>
        )}

        {showFin && (
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
                     <Td className="text-gray-500 text-xs">{formatDate(inv.dueDate)}</Td>
                   </tr>
                 ))}
              </tbody>
            </Table>
          </div>
        )}

        {/* Recent Activities — all roles */}
        <RecentActivities activities={activities} loading={actsLoading} />
      </div>
    </div>
  );
}
