'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { StatCard } from '@/components/ui/Card';
import { BarChart2, TrendingUp, DollarSign, Clock } from 'lucide-react';

type AnalyticsSummary = {
  totalRevenue: string;
  totalHoursBilled: string;
  realisationRate: number;
  utilizationRate: number;
  revenueByMonth: Array<{ month: string; revenue: string }>;
  topMatters: Array<{ title: string; billedAmount: string }>;
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<AnalyticsSummary>('/reporting/analytics/summary')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics & Reporting</h1>
        <p className="text-sm text-gray-500">Business intelligence and performance insights</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Revenue" value={formatCurrency(data?.totalRevenue ?? 0)} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard label="Hours Billed" value={`${data?.totalHoursBilled ?? '—'}h`} icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Realisation Rate" value={data ? `${data.realisationRate}%` : '—'} icon={<TrendingUp className="h-5 w-5" />} deltaType="up" />
        <StatCard label="Utilisation Rate" value={data ? `${data.utilizationRate}%` : '—'} icon={<BarChart2 className="h-5 w-5" />} />
      </div>

      {/* Report links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { title: 'Matter Profitability', desc: 'Revenue vs. cost per matter', href: '/app/analytics/matter-profitability' },
          { title: 'Billing Summary', desc: 'Invoiced and outstanding by period', href: '/app/analytics/billing' },
          { title: 'Time & Attendance', desc: 'Hours logged per advocate', href: '/app/analytics/time' },
          { title: 'Trust Ledger Report', desc: 'Three-way reconciliation summary', href: '/app/analytics/trust' },
          { title: 'Client Performance', desc: 'Revenue by client', href: '/app/analytics/clients' },
          { title: 'Payroll Report', desc: 'PAYE, NHIF, NSSF summary', href: '/app/analytics/payroll' },
        ].map((r) => (
          <a key={r.title} href={r.href} className="card p-5 hover:shadow-md transition-shadow group">
            <h3 className="font-semibold text-gray-900 group-hover:text-primary-700">{r.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{r.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
