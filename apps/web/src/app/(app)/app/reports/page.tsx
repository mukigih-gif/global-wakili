'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  BarChart2, FileText, DollarSign, Users, Scale, UserCheck,
  Globe, Play, Download, RefreshCw, Database,
} from 'lucide-react';

type ReportRun = {
  id: string;
  reportName: string;
  status: string;
  createdAt: string;
  completedAt?: string | null;
  exportUrl?: string | null;
};

const REPORT_CATEGORIES = [
  {
    label: 'Financial Reports',
    icon: <DollarSign className="h-5 w-5 text-green-600" />,
    reports: [
      { key: 'billing_summary',     name: 'Billing Summary',          desc: 'Total invoiced and outstanding by period' },
      { key: 'revenue_by_matter',   name: 'Revenue by Matter',        desc: 'Breakdown of revenue per matter' },
      { key: 'trust_reconciliation',name: 'Trust Reconciliation',     desc: 'Three-way reconciliation summary' },
      { key: 'trial_balance',       name: 'Trial Balance',            desc: 'General ledger trial balance' },
    ],
  },
  {
    label: 'Matter Reports',
    icon: <BarChart2 className="h-5 w-5 text-blue-600" />,
    reports: [
      { key: 'matter_status',       name: 'Matter Status Report',     desc: 'Open, closed and pending matters' },
      { key: 'matter_profitability',name: 'Matter Profitability',     desc: 'Revenue vs cost per matter' },
      { key: 'time_utilisation',    name: 'Time Utilisation',         desc: 'Hours logged vs target per advocate' },
    ],
  },
  {
    label: 'Client Reports',
    icon: <Users className="h-5 w-5 text-purple-600" />,
    reports: [
      { key: 'client_ledger',       name: 'Client Ledger',            desc: 'Balance and transaction history per client' },
      { key: 'client_ageing',       name: 'Client Ageing',            desc: 'Outstanding balances by age bucket' },
      { key: 'kyc_status',          name: 'KYC Status Report',        desc: 'Client KYC and compliance status' },
    ],
  },
  {
    label: 'HR & Payroll',
    icon: <UserCheck className="h-5 w-5 text-amber-600" />,
    reports: [
      { key: 'payroll_summary',     name: 'Payroll Summary',          desc: 'PAYE, NHIF, NSSF and net pay' },
      { key: 'leave_report',        name: 'Leave Report',             desc: 'Leave taken vs entitlement' },
    ],
  },
  {
    label: 'Trust Accounting',
    icon: <Scale className="h-5 w-5 text-red-600" />,
    reports: [
      { key: 'trust_statement',     name: 'Trust Statement',          desc: 'Client trust account transactions' },
      { key: 'trust_compliance',    name: 'Trust Compliance',         desc: 'Regulatory compliance check' },
    ],
  },
];

const BI_CONNECTORS = [
  { name: 'Power BI',     status: 'AVAILABLE', desc: 'Connect via OData endpoint',        icon: '📊' },
  { name: 'Tableau',      status: 'AVAILABLE', desc: 'REST API data source',               icon: '📈' },
  { name: 'Google Looker',status: 'AVAILABLE', desc: 'BigQuery connector via data export', icon: '🔍' },
  { name: 'Metabase',     status: 'COMING_SOON', desc: 'Self-hosted BI integration',       icon: '📉' },
  { name: 'Superset',     status: 'COMING_SOON', desc: 'Apache Superset connector',        icon: '⚡' },
];

export default function ReportsPage() {
  const [runs, setRuns]     = useState<ReportRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [tab, setTab]       = useState<'reports' | 'runs' | 'bi'>('reports');

  useEffect(() => {
    api.get<{ data: ReportRun[] }>('/reporting/runs?limit=20')
      .then((r) => setRuns(r.data ?? []))
      .catch(() => setRuns([]))
      .finally(() => setLoading(false));
  }, []);

  const runReport = async (key: string, name: string) => {
    setRunning(key);
    try {
      const run = await api.post<ReportRun>('/reporting/runs', { reportKey: key, reportName: name });
      setRuns((prev) => [run, ...prev]);
      setTab('runs');
    } catch {
      /* silent */
    } finally {
      setRunning(null);
    }
  };

  const downloadReport = async (key: string) => {
    // Map report keys to finance export endpoints where available
    const EXPORT_ENDPOINTS: Record<string, string> = {
      trial_balance:        '/finance/export?reportType=trial-balance&format=csv',
      billing_summary:      '/billing/invoices?limit=500',
      trust_reconciliation: '/trust/overview',
    };
    const ep = EXPORT_ENDPOINTS[key];
    if (ep) {
      window.open(`${process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1'}${ep}`, '_blank');
    } else {
      // Fall back to run + switch to runs tab
      runReport(key, key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500">Run, schedule and export firm reports</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { key: 'reports', label: 'Report Library', icon: <FileText className="h-4 w-4" /> },
          { key: 'runs',    label: 'Recent Runs',    icon: <RefreshCw className="h-4 w-4" /> },
          { key: 'bi',      label: 'BI Connectors',  icon: <Database className="h-4 w-4" /> },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'reports' && (
        <div className="space-y-6">
          {REPORT_CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <div className="flex items-center gap-2 mb-3">
                {cat.icon}
                <h2 className="font-semibold text-gray-900">{cat.label}</h2>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {cat.reports.map((r) => (
                  <div key={r.key} className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow flex flex-col gap-3">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{r.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
                    </div>
                    <div className="flex gap-2 mt-auto">
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={running === r.key}
                        onClick={() => runReport(r.key, r.name)}
                        className="flex-1"
                      >
                        <Play className="h-3 w-3" /> Run
                      </Button>
                      <Button size="sm" variant="ghost" title="Download / Export" onClick={() => downloadReport(r.key)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'runs' && (
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8 text-sm text-gray-400">Loading runs…</div>
          ) : !runs.length ? (
            <div className="text-center py-8 text-sm text-gray-400">No report runs yet — run a report from the library.</div>
          ) : (
            runs.map((run) => (
              <div key={run.id} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
                <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{run.reportName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Started {formatDate(run.createdAt)}</p>
                </div>
                <StatusBadge status={run.status} />
                {run.exportUrl && (
                  <a href={run.exportUrl} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                    <Download className="h-3 w-3" /> Download
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'bi' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Connect your preferred BI tool to Global Wakili data via secure API or data export.
            Platform admins can generate API keys from Settings → Integrations.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BI_CONNECTORS.map((c) => (
              <div key={c.name} className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{c.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{c.name}</p>
                    <StatusBadge status={c.status} />
                  </div>
                </div>
                <p className="text-sm text-gray-500">{c.desc}</p>
                {c.status === 'AVAILABLE' ? (
                  <Button size="sm" variant="secondary" className="mt-auto">
                    <Globe className="h-3.5 w-3.5" /> Configure
                  </Button>
                ) : (
                  <p className="text-xs text-gray-400 mt-auto">Coming soon</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
