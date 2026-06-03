'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import {
  Plus, Search, Phone, Users, FileText, ArrowDownToLine,
  ArrowUpFromLine, UserCheck, Package,
} from 'lucide-react';

type LogEntry = {
  id: string; type: string; visitorName?: string | null; callerName?: string | null;
  purpose?: string | null; status: string; handledBy?: { name: string } | null; createdAt: string;
};

type DocumentLog = {
  id: string; direction: 'IN' | 'OUT'; documentTitle: string;
  from?: string | null; to?: string | null; deliveredBy?: string | null;
  matter?: { title: string; matterCode: string } | null;
  assignedTo?: { name: string } | null; status: string; receivedAt: string; notes?: string | null;
};

type Tab = 'visitors' | 'calls' | 'docs_in' | 'docs_out';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'visitors',  label: 'Visitor Log',    icon: <Users className="h-4 w-4" /> },
  { key: 'calls',     label: 'Call Log',        icon: <Phone className="h-4 w-4" /> },
  { key: 'docs_in',   label: 'Documents In',   icon: <ArrowDownToLine className="h-4 w-4" /> },
  { key: 'docs_out',  label: 'Documents Out',  icon: <ArrowUpFromLine className="h-4 w-4" /> },
];

export default function ReceptionPage() {
  const [tab, setTab]       = useState<Tab>('visitors');
  const [logs, setLogs]     = useState<LogEntry[]>([]);
  const [docLogs, setDocs]  = useState<DocumentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery]   = useState('');

  useEffect(() => {
    setLoading(true);
    setQuery('');
    if (tab === 'visitors' || tab === 'calls') {
      const type = tab === 'visitors' ? 'VISITOR' : 'CALL';
      api.get<{ data: LogEntry[] }>(`/reception/logs?type=${type}&limit=30`)
        .then((r) => setLogs(r.data ?? [])).catch(() => setLogs([]))
        .finally(() => setLoading(false));
    } else {
      const dir = tab === 'docs_in' ? 'IN' : 'OUT';
      api.get<{ data: DocumentLog[] }>(`/reception/documents?direction=${dir}&limit=30`)
        .then((r) => setDocs(r.data ?? [])).catch(() => setDocs([]))
        .finally(() => setLoading(false));
    }
  }, [tab]);

  const filterLogs = logs.filter((l) =>
    !query || (l.visitorName ?? l.callerName ?? '').toLowerCase().includes(query.toLowerCase())
  );

  const filterDocs = docLogs.filter((d) =>
    !query || d.documentTitle.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reception</h1>
          <p className="text-sm text-gray-500">Visitor logs, calls, and document handling (in/out)</p>
        </div>
        <div className="flex gap-2">
          {(tab === 'visitors') && <Button size="sm"><Plus className="h-4 w-4" /> Log Visitor</Button>}
          {(tab === 'calls')    && <Button size="sm"><Plus className="h-4 w-4" /> Log Call</Button>}
          {(tab === 'docs_in')  && <Button size="sm"><Plus className="h-4 w-4" /> Record Incoming Doc</Button>}
          {(tab === 'docs_out') && <Button size="sm"><Plus className="h-4 w-4" /> Record Outgoing Doc</Button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-gray-200">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input type="search" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} className="form-input pl-9 w-full" />
      </div>

      {/* Visitor / Call logs */}
      {(tab === 'visitors' || tab === 'calls') && (
        <Table>
          <thead>
            <tr>
              <Th>{tab === 'visitors' ? 'Visitor' : 'Caller'}</Th>
              <Th>Purpose</Th>
              <Th>Handled By</Th>
              <Th>Status</Th>
              <Th>Time</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow colSpan={5} /> :
             !filterLogs.length ? <EmptyRow colSpan={5} message={`No ${tab === 'visitors' ? 'visitor' : 'call'} logs`} /> :
             filterLogs.map((l) => (
               <tr key={l.id}>
                 <Td className="font-medium text-gray-900">{l.visitorName ?? l.callerName ?? '—'}</Td>
                 <Td className="text-gray-600 text-sm">{l.purpose ?? '—'}</Td>
                 <Td className="text-gray-600 text-sm">{l.handledBy?.name ?? '—'}</Td>
                 <Td><StatusBadge status={l.status} /></Td>
                 <Td className="text-gray-500 text-xs">{formatDateTime(l.createdAt)}</Td>
               </tr>
             ))}
          </tbody>
        </Table>
      )}

      {/* Document logs */}
      {(tab === 'docs_in' || tab === 'docs_out') && (
        <>
          {/* Summary chips */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" />{docLogs.length} documents</span>
            <span>·</span>
            <span className="flex items-center gap-1"><UserCheck className="h-3.5 w-3.5" />{docLogs.filter((d) => d.status === 'ASSIGNED').length} assigned</span>
            <span>·</span>
            <span>{docLogs.filter((d) => d.status === 'PENDING').length} pending assignment</span>
          </div>

          <Table>
            <thead>
              <tr>
                <Th>Document</Th>
                <Th>{tab === 'docs_in' ? 'From' : 'To'}</Th>
                <Th>{tab === 'docs_in' ? 'Delivered By' : 'Sent By'}</Th>
                <Th>Matter</Th>
                <Th>Assigned To</Th>
                <Th>Status</Th>
                <Th>Date/Time</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {loading ? <LoadingRow colSpan={8} /> :
               !filterDocs.length ? <EmptyRow colSpan={8} message={`No ${tab === 'docs_in' ? 'incoming' : 'outgoing'} documents`} /> :
               filterDocs.map((d) => (
                 <tr key={d.id} className={d.status === 'PENDING' ? 'bg-amber-50/30' : ''}>
                   <Td>
                     <div className="flex items-center gap-2">
                       <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                       <span className="font-medium text-gray-900">{d.documentTitle}</span>
                     </div>
                   </Td>
                   <Td className="text-gray-600 text-sm">{tab === 'docs_in' ? (d.from ?? '—') : (d.to ?? '—')}</Td>
                   <Td className="text-gray-600 text-sm">{d.deliveredBy ?? '—'}</Td>
                   <Td className="text-xs text-gray-600">{d.matter ? `${d.matter.matterCode}` : '—'}</Td>
                   <Td className="text-sm text-gray-600">
                     {d.assignedTo?.name ?? (
                       <button className="text-xs text-amber-600 hover:underline font-medium">Assign →</button>
                     )}
                   </Td>
                   <Td><StatusBadge status={d.status} /></Td>
                   <Td className="text-xs text-gray-500">{formatDateTime(d.receivedAt)}</Td>
                   <Td>
                     {d.notes && (
                       <span className="text-xs text-gray-400 italic truncate max-w-[100px] block">{d.notes}</span>
                     )}
                   </Td>
                 </tr>
               ))}
            </tbody>
          </Table>
        </>
      )}
    </div>
  );
}
