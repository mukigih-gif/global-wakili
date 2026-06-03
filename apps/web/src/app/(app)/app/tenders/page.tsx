'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { StatCard } from '@/components/ui/Card';
import { Briefcase, Clock, AlertTriangle, TrendingUp } from 'lucide-react';

type Tender = {
  id: string;
  tenderName: string;
  tenderNumber?: string | null;
  issuedBy?: string | null;
  category: string;
  status: string;
  estimatedValue?: string | null;
  currency: string;
  deadline?: string | null;
  submittedAt?: string | null;
  outcome?: string | null;
  matter?: { title: string; matterCode: string } | null;
  assignedTo?: { name: string } | null;
};

type Dashboard = {
  totalTenders: number;
  overdueCount: number;
  deadlineSoonCount: number;
  statusBreakdown: Record<string, number>;
};

const STATUS_LABELS: Record<string, string> = {
  IDENTIFIED: 'Identified',
  DOCUMENTS_PREPARATION: 'Documents Prep.',
  SUBMITTED: 'Submitted',
  EVALUATION: 'Under Evaluation',
  AWARDED: 'Awarded',
  NOT_AWARDED: 'Not Awarded',
  CANCELLED: 'Cancelled',
  WITHDRAWN: 'Withdrawn',
};

export default function TendersPage() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  useEffect(() => {
    api.get<Dashboard>('/tenders/dashboard').then(setDashboard).catch(() => null);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    api.get<{ data: Tender[] }>(`/tenders?${params}`)
      .then((r) => setTenders(r.data ?? []))
      .catch(() => setTenders([]))
      .finally(() => setLoading(false));
  }, [status]);

  const awarded = dashboard?.statusBreakdown?.AWARDED ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tender Management</h1>
        <p className="text-sm text-gray-500">Track tendering activities — documents, deadlines, submissions, and outcomes</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Tenders" value={dashboard?.totalTenders ?? 0} icon={<Briefcase className="h-5 w-5" />} />
        <StatCard label="Overdue Deadline" value={dashboard?.overdueCount ?? 0} icon={<AlertTriangle className="h-5 w-5" />} deltaType={dashboard?.overdueCount ? 'down' : 'neutral'} />
        <StatCard label="Deadline This Week" value={dashboard?.deadlineSoonCount ?? 0} icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Awarded" value={awarded} icon={<TrendingUp className="h-5 w-5" />} deltaType="up" />
      </div>

      {(dashboard?.overdueCount ?? 0) > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            {dashboard!.overdueCount} tender deadline{dashboard!.overdueCount > 1 ? 's' : ''} passed without submission.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="form-select w-48">
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <Table>
        <thead>
          <tr><Th>Tender Name</Th><Th>No.</Th><Th>Issued By</Th><Th>Matter</Th><Th>Category</Th><Th>Value</Th><Th>Status</Th><Th>Deadline</Th><Th>Submitted</Th><Th>Outcome</Th></tr>
        </thead>
        <tbody>
          {loading ? <LoadingRow colSpan={10} /> :
           !tenders.length ? <EmptyRow colSpan={10} message="No tenders found" /> :
           tenders.map((t) => {
             const overdue = t.deadline && new Date(t.deadline) < new Date() && !['SUBMITTED','AWARDED','NOT_AWARDED','CANCELLED','WITHDRAWN'].includes(t.status);
             return (
               <tr key={t.id} className={overdue ? 'bg-red-50/30' : ''}>
                 <Td className="font-medium text-sm">{t.tenderName}</Td>
                 <Td className="text-xs font-mono text-gray-500">{t.tenderNumber ?? '—'}</Td>
                 <Td className="text-xs text-gray-600">{t.issuedBy ?? '—'}</Td>
                 <Td className="text-xs text-gray-500">{t.matter?.title ?? '—'}</Td>
                 <Td className="text-xs text-gray-500">{t.category}</Td>
                 <Td className="text-sm font-medium">{t.estimatedValue ? formatCurrency(t.estimatedValue, t.currency) : '—'}</Td>
                 <Td><StatusBadge status={t.status} label={STATUS_LABELS[t.status]} /></Td>
                 <Td className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                   {formatDate(t.deadline)}{overdue && ' ⚠'}
                 </Td>
                 <Td className="text-xs text-gray-500">{formatDate(t.submittedAt)}</Td>
                 <Td>
                   {t.outcome
                     ? <span className={t.outcome === 'AWARDED' ? 'badge-green' : 'badge-red'}>{t.outcome}</span>
                     : <span className="text-xs text-gray-400">Pending</span>
                   }
                 </Td>
               </tr>
             );
           })
          }
        </tbody>
      </Table>
    </div>
  );
}
