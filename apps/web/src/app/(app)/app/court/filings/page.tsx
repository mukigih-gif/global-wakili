'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { StatCard } from '@/components/ui/Card';
import { FileText, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

type CourtFiling = {
  id: string;
  title: string;
  filingType: string;
  status: string;
  courtRef?: string | null;
  filedAt?: string | null;
  dueDate?: string | null;
  scanUrl?: string | null;
  matter?: { title: string; matterCode: string } | null;
  hearing?: { title: string; hearingDate: string } | null;
  filedBy?: { name: string } | null;
};

type Dashboard = {
  totalFilings: number;
  overdueCount: number;
  dueSoonCount: number;
  statusBreakdown: Record<string, number>;
  overdueFilings: CourtFiling[];
  dueSoonFilings: CourtFiling[];
};

const FILING_TYPE_LABELS: Record<string, string> = {
  NOTICE_OF_MOTION: 'Notice of Motion',
  APPLICATION: 'Application',
  PETITION: 'Petition',
  AFFIDAVIT: 'Affidavit',
  WRITTEN_SUBMISSIONS: 'Written Submissions',
  PLEADING: 'Pleading',
  RESPONSE: 'Response',
  REPLY: 'Reply',
  NOTICE_OF_APPEAL: 'Notice of Appeal',
  MEMORANDUM: 'Memorandum',
  OTHER: 'Other',
};

export default function CourtFilingsPage() {
  const [filings, setFilings] = useState<CourtFiling[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');

  useEffect(() => {
    api.get<Dashboard>('/court/filings/dashboard').then(setDashboard).catch(() => null);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (type) params.set('filingType', type);
    api.get<{ data: CourtFiling[] }>(`/court/filings?${params}`)
      .then((r) => setFilings(r.data ?? []))
      .catch(() => setFilings([]))
      .finally(() => setLoading(false));
  }, [status, type]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Court Filings Registry</h1>
        <p className="text-sm text-gray-500">Track all court filings — clerks can record, scan and update filing receipts</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Filings" value={dashboard?.totalFilings ?? 0} icon={<FileText className="h-5 w-5" />} />
        <StatCard label="Overdue" value={dashboard?.overdueCount ?? 0} icon={<AlertTriangle className="h-5 w-5" />} deltaType={dashboard?.overdueCount ? 'down' : 'neutral'} />
        <StatCard label="Due This Week" value={dashboard?.dueSoonCount ?? 0} icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Filed" value={dashboard?.statusBreakdown?.FILED ?? 0} icon={<CheckCircle className="h-5 w-5" />} deltaType="up" />
      </div>

      {(dashboard?.overdueCount ?? 0) > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            {dashboard!.overdueCount} filing{dashboard!.overdueCount > 1 ? 's' : ''} past deadline. Immediate action required.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="form-select w-44">
          <option value="">All Statuses</option>
          <option value="PREPARED">Prepared</option>
          <option value="FILED">Filed</option>
          <option value="RECEIVED_BY_COURT">Court Receipt Confirmed</option>
          <option value="REJECTED_BY_COURT">Rejected by Court</option>
          <option value="SERVED">Served</option>
          <option value="COMPLETED">Completed</option>
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className="form-select w-48">
          <option value="">All Types</option>
          {Object.entries(FILING_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <Table>
        <thead>
          <tr><Th>Filing</Th><Th>Type</Th><Th>Matter</Th><Th>Status</Th><Th>Court Ref</Th><Th>Filed By</Th><Th>Filed At</Th><Th>Due</Th><Th>Scan</Th></tr>
        </thead>
        <tbody>
          {loading ? <LoadingRow colSpan={9} /> :
           !filings.length ? <EmptyRow colSpan={9} message="No court filings found" /> :
           filings.map((f) => {
             const overdue = f.dueDate && new Date(f.dueDate) < new Date() && !['FILED','RECEIVED_BY_COURT','COMPLETED'].includes(f.status);
             return (
               <tr key={f.id} className={overdue ? 'bg-red-50/30' : ''}>
                 <Td className="font-medium text-sm max-w-xs truncate">{f.title}</Td>
                 <Td className="text-xs text-gray-600">{FILING_TYPE_LABELS[f.filingType] ?? f.filingType}</Td>
                 <Td className="text-xs text-gray-500">{f.matter?.title ?? '—'}</Td>
                 <Td><StatusBadge status={f.status} /></Td>
                 <Td className="text-xs font-mono text-gray-500">{f.courtRef ?? '—'}</Td>
                 <Td className="text-xs text-gray-500">{f.filedBy?.name ?? '—'}</Td>
                 <Td className="text-xs text-gray-500">{formatDate(f.filedAt)}</Td>
                 <Td className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                   {formatDate(f.dueDate)}{overdue && ' ⚠'}
                 </Td>
                 <Td>
                   {f.scanUrl
                     ? <a href={f.scanUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline">View</a>
                     : <span className="text-xs text-gray-400">No scan</span>
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
