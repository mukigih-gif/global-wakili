'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { StatCard } from '@/components/ui/Card';
import {
  BarChart2, TrendingUp, DollarSign, Clock, Users, Briefcase,
  FileText, Scale, CheckSquare, RefreshCw,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = ['#1B3A6B','#C9A227','#16a34a','#dc2626','#7c3aed','#0891b2','#ea580c','#db2777'];

type InvoiceRaw = { id: string; total: string; status: string; dueDate?: string; createdAt: string; client?: { name: string } };
type MatterRaw  = { id: string; status: string; category: string; wipValue?: string; createdAt: string; leadAdvocate?: { name: string } };
type ClientRaw  = { id: string; status: string; type: string };
type TaskRaw    = { id: string; status: string; priority: string; createdAt: string };
type TimeRaw    = { id: string; durationHours: string; billableAmount: string; status: string; entryDate: string };
type TrustRaw   = { accountName: string; currentBalance: string };

export default function AnalyticsPage() {
  const [invoices, setInvoices] = useState<InvoiceRaw[]>([]);
  const [matters, setMatters]   = useState<MatterRaw[]>([]);
  const [clients, setClients]   = useState<ClientRaw[]>([]);
  const [tasks, setTasks]       = useState<TaskRaw[]>([]);
  const [timeEntries, setTime]  = useState<TimeRaw[]>([]);
  const [trust, setTrust]       = useState<TrustRaw[]>([]);
  const [loading, setLoading]   = useState(true);
  const [lastRefresh, setLast]  = useState(new Date().toISOString());

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      api.get<{ data: InvoiceRaw[] }>('/billing/invoices?limit=500').then((r) => setInvoices(r.data ?? [])).catch(() => {}),
      api.get<{ data: MatterRaw[] }>('/matters?limit=500').then((r) => setMatters(r.data ?? [])).catch(() => {}),
      api.get<{ data: ClientRaw[] }>('/clients?limit=500').then((r) => setClients(r.data ?? [])).catch(() => {}),
      api.get<{ data: TaskRaw[] }>('/tasks/search?limit=500').then((r) => setTasks(r.data ?? [])).catch(() => {}),
      api.get<{ data: TimeRaw[] }>('/time-entries?limit=500').then((r) => setTime(r.data ?? [])).catch(() => {}),
      api.get<any>('/trust/overview').then((r) => setTrust(r.dashboard?.accounts ?? [])).catch(() => {}),
    ]).finally(() => { setLoading(false); setLast(new Date().toISOString()); });
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Computed metrics ─────────────────────────────────────────────────────────
  const totalBilled      = invoices.reduce((s, i) => s + parseFloat(i.total || '0'), 0);
  const totalOutstanding = invoices.filter((i) => ['ISSUED','OVERDUE','PARTIALLY_PAID'].includes(i.status)).reduce((s, i) => s + parseFloat(i.total || '0'), 0);
  const totalTrustBal    = trust.reduce((s, t) => s + parseFloat(t.currentBalance || '0'), 0);
  const totalWIP         = matters.reduce((s, m) => s + parseFloat(m.wipValue || '0'), 0);
  const activeClients    = clients.filter((c) => c.status === 'ACTIVE').length;
  const activeMatters    = matters.filter((m) => m.status === 'ACTIVE').length;
  const totalHours       = timeEntries.reduce((s, t) => s + parseFloat(t.durationHours || '0'), 0);
  const completedTasks   = tasks.filter((t) => t.status === 'DONE').length;
  const taskRate         = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;

  // ── Chart data ───────────────────────────────────────────────────────────────
  // Matter status breakdown
  const matterStatusData = [
    { name: 'Active',    count: matters.filter((m) => m.status === 'ACTIVE').length },
    { name: 'On Hold',   count: matters.filter((m) => m.status === 'ON_HOLD').length },
    { name: 'Completed', count: matters.filter((m) => m.status === 'COMPLETED').length },
    { name: 'Closed',    count: matters.filter((m) => m.status === 'CLOSED').length },
  ].filter((d) => d.count > 0);

  // Invoice status breakdown
  const invoiceStatusData = [
    { name: 'Draft',        value: invoices.filter((i) => i.status === 'DRAFT').length },
    { name: 'Issued',       value: invoices.filter((i) => i.status === 'ISSUED').length },
    { name: 'Partial',      value: invoices.filter((i) => i.status === 'PARTIALLY_PAID').length },
    { name: 'Paid',         value: invoices.filter((i) => i.status === 'PAID').length },
    { name: 'Overdue',      value: invoices.filter((i) => i.status === 'OVERDUE').length },
    { name: 'Cancelled',    value: invoices.filter((i) => i.status === 'CANCELLED').length },
  ].filter((d) => d.value > 0);

  // Monthly revenue trend (last 6 months)
  const monthlyRevenue = (() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('en-KE', { month: 'short', year: '2-digit' });
      months[key] = 0;
    }
    invoices.forEach((inv) => {
      const d = new Date(inv.createdAt);
      const key = d.toLocaleDateString('en-KE', { month: 'short', year: '2-digit' });
      if (key in months) months[key] += parseFloat(inv.total || '0');
    });
    return Object.entries(months).map(([month, revenue]) => ({ month, revenue }));
  })();

  // Client type breakdown
  const clientTypeData = (() => {
    const counts: Record<string, number> = {};
    clients.forEach((c) => { counts[c.type] = (counts[c.type] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace(/_/g,' '), value }));
  })();

  // Matter category breakdown
  const matterCategoryData = (() => {
    const counts: Record<string, number> = {};
    matters.forEach((m) => { counts[m.category] = (counts[m.category] || 0) + 1; });
    return Object.entries(counts).map(([name, count]) => ({ name: name.replace(/_/g,' '), count })).sort((a, b) => b.count - a.count).slice(0, 6);
  })();

  // Task completion trend
  const taskData = [
    { name: 'To Do',       value: tasks.filter((t) => t.status === 'TODO').length,        fill: '#9ca3af' },
    { name: 'In Progress', value: tasks.filter((t) => t.status === 'IN_PROGRESS').length, fill: '#3b82f6' },
    { name: 'Blocked',     value: tasks.filter((t) => t.status === 'BLOCKED').length,     fill: '#ef4444' },
    { name: 'Done',        value: tasks.filter((t) => t.status === 'DONE').length,        fill: '#16a34a' },
    { name: 'Cancelled',   value: tasks.filter((t) => t.status === 'CANCELLED').length,   fill: '#d1d5db' },
  ].filter((d) => d.value > 0);

  const REPORT_LINKS = [
    { label: 'Matter Profitability',  href: '/app/analytics/matter-profitability', icon: <Briefcase className="h-4 w-4 icon-legal" /> },
    { label: 'Billing Summary',       href: '/app/analytics/billing',              icon: <DollarSign className="h-4 w-4 icon-finance" /> },
    { label: 'Time & Attendance',     href: '/app/analytics/time',                 icon: <Clock className="h-4 w-4 icon-ops" /> },
    { label: 'Trust Ledger Report',   href: '/app/analytics/trust',                icon: <Scale className="h-4 w-4 icon-trust" /> },
    { label: 'Client Performance',    href: '/app/analytics/clients',              icon: <Users className="h-4 w-4 icon-legal" /> },
    { label: 'Payroll Report',        href: '/app/analytics/payroll',              icon: <BarChart2 className="h-4 w-4 icon-hr" /> },
    { label: 'Task Completion',       href: '/app/analytics/tasks',                icon: <CheckSquare className="h-4 w-4 icon-tasks" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500">Live business intelligence — {new Date(lastRefresh).toLocaleTimeString('en-KE')}</p>
        </div>
        <button onClick={fetchAll} disabled={loading} className="flex items-center gap-1.5 text-xs text-primary-600 hover:underline disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-8">
        <StatCard label="Active Clients"  value={loading ? '—' : activeClients}                             icon={<Users className="h-5 w-5 icon-legal" />} />
        <StatCard label="Active Matters"  value={loading ? '—' : activeMatters}                             icon={<Briefcase className="h-5 w-5 icon-legal" />} />
        <StatCard label="Total Billed"    value={loading ? '—' : formatCurrency(totalBilled)}               icon={<DollarSign className="h-5 w-5 icon-finance" />} />
        <StatCard label="Outstanding"     value={loading ? '—' : formatCurrency(totalOutstanding)}          icon={<FileText className="h-5 w-5 icon-danger" />} deltaType={totalOutstanding > 0 ? 'down' : 'neutral'} />
        <StatCard label="Total WIP"       value={loading ? '—' : formatCurrency(totalWIP)}                  icon={<Clock className="h-5 w-5 icon-ops" />} />
        <StatCard label="Trust Balance"   value={loading ? '—' : formatCurrency(totalTrustBal)}             icon={<Scale className="h-5 w-5 icon-trust" />} />
        <StatCard label="Hours Logged"    value={loading ? '—' : `${totalHours.toFixed(1)}h`}              icon={<Clock className="h-5 w-5 icon-ops" />} />
        <StatCard label="Task Rate"       value={loading ? '—' : `${taskRate}%`}                            icon={<CheckSquare className="h-5 w-5 icon-tasks" />} deltaType={taskRate > 70 ? 'up' : 'neutral'} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Trend */}
        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-gray-900">Monthly Revenue Trend</h2><p className="text-xs text-gray-400">Last 6 months — KES</p></div>
          {loading ? <div className="h-52 flex items-center justify-center text-sm text-gray-400">Loading…</div> :
           !monthlyRevenue.some((d) => d.revenue > 0) ? <div className="h-52 flex items-center justify-center text-sm text-gray-400">No billing data yet</div> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyRevenue} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs><linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1B3A6B" stopOpacity={0.2} /><stop offset="95%" stopColor="#1B3A6B" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#1B3A6B" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Matter Status */}
        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-gray-900">Matter Status</h2><p className="text-xs text-gray-400">{matters.length} total matters</p></div>
          {loading ? <div className="h-52 flex items-center justify-center text-sm text-gray-400">Loading…</div> :
           !matterStatusData.length ? <div className="h-52 flex items-center justify-center text-sm text-gray-400">No matter data</div> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={matterStatusData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Matters" fill="#C9A227" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Invoice Distribution (Pie) */}
        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-gray-900">Invoice Status</h2><p className="text-xs text-gray-400">{invoices.length} invoices</p></div>
          {loading ? <div className="h-44 flex items-center justify-center text-sm text-gray-400">Loading…</div> :
           !invoiceStatusData.length ? <div className="h-44 flex items-center justify-center text-sm text-gray-400">No invoices</div> : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={invoiceStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''} labelLine={false}>
                  {invoiceStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Matter by Category */}
        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-gray-900">Matters by Category</h2></div>
          {loading ? <div className="h-44 flex items-center justify-center text-sm text-gray-400">Loading…</div> :
           !matterCategoryData.length ? <div className="h-44 flex items-center justify-center text-sm text-gray-400">No data</div> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={matterCategoryData} layout="vertical" margin={{ top: 4, right: 8, left: 50, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={48} />
                <Tooltip />
                <Bar dataKey="count" name="Count" fill="#1B3A6B" radius={[0,3,3,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Task Status */}
        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-gray-900">Task Status</h2><p className="text-xs text-gray-400">{taskRate}% completion rate</p></div>
          {loading ? <div className="h-44 flex items-center justify-center text-sm text-gray-400">Loading…</div> :
           !taskData.length ? <div className="h-44 flex items-center justify-center text-sm text-gray-400">No tasks</div> : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={taskData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => value > 0 ? `${name}(${value})` : ''} labelLine={false}>
                  {taskData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Client type breakdown */}
      {clientTypeData.length > 0 && (
        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-gray-900">Client Type Distribution</h2><p className="text-xs text-gray-400">{clients.length} total clients</p></div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={clientTypeData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Clients" fill="#C9A227" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Report Links */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Detailed Reports</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {REPORT_LINKS.map((r) => (
            <Link key={r.label} href={r.href} className="card p-4 hover:shadow-md transition-shadow group flex items-center gap-3">
              {r.icon}
              <span className="text-sm font-medium text-gray-900 group-hover:text-primary-700">{r.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
