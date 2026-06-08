'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/utils';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertCircle, Clock, CheckCircle, MessageSquare } from 'lucide-react';
import Link from 'next/link';

type ClientIssue = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  firstResponseAt?: string | null;
  resolvedAt?: string | null;
  client?: { name: string; clientCode?: string } | null;
  assignedTo?: { name: string } | null;
};

const PRIORITY_COLOR: Record<string, 'red' | 'yellow' | 'blue' | 'gray'> = {
  URGENT: 'red', HIGH: 'yellow', NORMAL: 'blue', LOW: 'gray',
};

export default function ClientIssuesPage() {
  const [issues, setIssues] = useState<ClientIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    api.get<{ data: ClientIssue[] }>(`/clients/issues?${params}`)
      .then((r) => setIssues(r.data ?? []))
      .catch(() => setIssues([]))
      .finally(() => setLoading(false));
  }, [status]);

  const open     = issues.filter((i) => i.status === 'OPEN').length;
  const progress = issues.filter((i) => i.status === 'IN_PROGRESS').length;
  const resolved = issues.filter((i) => ['RESOLVED','CLOSED'].includes(i.status)).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Issues</h1>
          <p className="text-sm text-gray-500">Client complaints, requests, and follow-ups raised with the firm</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Open"       value={open}     icon={<AlertCircle className="h-5 w-5" />} deltaType={open > 0 ? 'down' : 'neutral'} />
        <StatCard label="In Progress" value={progress} icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Resolved"   value={resolved}  icon={<CheckCircle className="h-5 w-5" />} deltaType="up" />
      </div>

      <div className="flex gap-3">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="form-select w-44">
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="WAITING_ON_CLIENT">Waiting on Client</option>
          <option value="ESCALATED">Escalated</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      <Table>
        <thead>
          <tr><Th>Subject</Th><Th>Client</Th><Th>Category</Th><Th>Priority</Th><Th>Status</Th><Th>Assignee</Th><Th>First Response</Th><Th>Opened</Th><Th></Th></tr>
        </thead>
        <tbody>
          {loading ? <LoadingRow colSpan={9} /> :
           !issues.length ? <EmptyRow colSpan={9} message="No client issues found" /> :
           issues.map((issue) => (
             <tr key={issue.id}>
               <Td className="font-medium text-sm max-w-xs truncate">{issue.subject}</Td>
               <Td className="text-xs text-gray-600">{issue.client?.name ?? '—'}</Td>
               <Td className="text-xs text-gray-500">{issue.category.replace(/_/g,' ')}</Td>
               <Td><Badge variant={PRIORITY_COLOR[issue.priority] ?? 'gray'}>{issue.priority}</Badge></Td>
               <Td><StatusBadge status={issue.status} /></Td>
               <Td className="text-xs text-gray-600">{issue.assignedTo?.name ?? <span className="text-gray-400 italic">Unassigned</span>}</Td>
               <Td className="text-xs text-gray-500">{issue.firstResponseAt ? formatDateTime(issue.firstResponseAt) : <span className="text-orange-500">No response yet</span>}</Td>
               <Td className="text-xs text-gray-500">{formatDate(issue.createdAt)}</Td>
               <Td>
                 <span className="text-xs text-gray-300 cursor-not-allowed flex items-center gap-1" title="Issue detail view coming soon">
                   <MessageSquare className="h-3 w-3" /> Open
                 </span>
               </Td>
             </tr>
           ))
          }
        </tbody>
      </Table>
    </div>
  );
}
