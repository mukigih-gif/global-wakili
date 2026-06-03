'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { StatCard } from '@/components/ui/Card';
import { BarChart2, TrendingUp, DollarSign, Clock, Users, Briefcase } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

type AnalyticsSummary = {
  totalRevenue: string;
  totalHoursBilled: string;
  realisationRate: number;
  utilizationRate: number;
  activeClients?: number;
  openMatters?: number;
  revenueByMonth?: Array<{ month: string; revenue: number; target?: number }>;
  billingByCategory?: Array<{ category: string; amount: number }>;
  topMatters?: Array<{ title: string; billedAmount: string }>;
  hoursPerLawyer?: Array<{ name: string; hours: number; target: number }>;
};

const COLORS = ['#1B3A6B', '#C9A227', '#16a34a', '#dc2626', '#7c3aed', '#0891b2'];

export default function AnalyticsPage() {
  const [data, setData]     = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<AnalyticsSummary>('/reporting/analytics/summary')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const revenueData  = data?.revenueByMonth ?? [];
  const categoryData = data?.billingByCategory ?? [];
  const hoursData    = data?.hoursPerLawyer ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500">Business intelligence and performance insights</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Revenue"     value={loading ? '—' : formatCurrency(data?.totalRevenue ?? 0)}     icon={<DollarSign className="h-5 w-5" />} />
        <StatCard label="Hours Billed"      value={loading ? '—' : `${data?.totalHoursBilled ?? '—'}h`}         icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Realisation Rate"  value={loading ? '—' : `${data?.realisationRate ?? '—'}%`}          icon={<TrendingUp className="h-5 w-5" />} deltaType="up" />
        <StatCard label="Utilisation Rate"  value={loading ? '—' : `${data?.utilizationRate ?? '—'}%`}          icon={<BarChart2 className="h-5 w-5" />} />
        <StatCard label="Active Clients"    value={loading ? '—' : (data?.activeClients ?? '—')}                icon={<Users className="h-5 w-5" />} />
        <StatCard label="Open Matters"      value={loading ? '—' : (data?.openMatters ?? '—')}                  icon={<Briefcase className="h-5 w-5" />} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue vs Target */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900">Revenue vs Target</h2>
            <p className="text-xs text-gray-400">Monthly billed revenue (KES)</p>
          </div>
          {loading ? (
            <div className="h-52 flex items-center justify-center text-sm text-gray-400">Loading…</div>
          ) : !revenueData.length ? (
            <div className="h-52 flex items-center justify-center text-sm text-gray-400">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="revenue" name="Revenue" fill="#1B3A6B" radius={[3,3,0,0]} />
                {revenueData.some((d) => d.target) && (
                  <Bar dataKey="target" name="Target" fill="#C9A227" radius={[3,3,0,0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Billing by category */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900">Billing by Category</h2>
            <p className="text-xs text-gray-400">Revenue distribution across practice areas</p>
          </div>
          {loading ? (
            <div className="h-52 flex items-center justify-center text-sm text-gray-400">Loading…</div>
          ) : !categoryData.length ? (
            <div className="h-52 flex items-center justify-center text-sm text-gray-400">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryData} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={85} label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Hours per lawyer */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900">Hours per Advocate</h2>
            <p className="text-xs text-gray-400">Billed vs target hours</p>
          </div>
          {loading ? (
            <div className="h-52 flex items-center justify-center text-sm text-gray-400">Loading…</div>
          ) : !hoursData.length ? (
            <div className="h-52 flex items-center justify-center text-sm text-gray-400">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hoursData} layout="vertical" margin={{ top: 4, right: 8, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={55} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="hours"  name="Billed"  fill="#1B3A6B" radius={[0,3,3,0]} />
                <Bar dataKey="target" name="Target"  fill="#C9A227" radius={[0,3,3,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top matters */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900">Top Matters by Revenue</h2>
            <p className="text-xs text-gray-400">Highest billed matters this period</p>
          </div>
          {loading ? (
            <div className="h-52 flex items-center justify-center text-sm text-gray-400">Loading…</div>
          ) : !data?.topMatters?.length ? (
            <div className="h-52 flex items-center justify-center text-sm text-gray-400">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={data.topMatters.map((m) => ({ name: m.title.slice(0, 18), amount: parseFloat(m.billedAmount) || 0 }))}
                margin={{ top: 4, right: 8, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} />
                <Bar dataKey="amount" name="Billed" fill="#16a34a" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
