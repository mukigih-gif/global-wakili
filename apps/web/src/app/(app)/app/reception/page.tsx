'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Plus, Search, Phone, Users } from 'lucide-react';

type LogEntry = {
  id: string;
  type: 'VISITOR' | 'CALL' | 'FILE_RECEIVED';
  visitorName?: string | null;
  callerName?: string | null;
  purpose?: string | null;
  status: string;
  handledBy?: { name: string } | null;
  createdAt: string;
};

const LOG_TABS = [
  { key: 'visitor', label: 'Visitor Logs', icon: <Users className="h-4 w-4" /> },
  { key: 'call',    label: 'Call Logs',    icon: <Phone className="h-4 w-4" /> },
];

export default function ReceptionPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'visitor' | 'call'>('visitor');
  const [query, setQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('type', tab === 'visitor' ? 'VISITOR' : 'CALL');
    if (query) params.set('search', query);
    api.get<{ data: LogEntry[] }>(`/reception/logs?${params}`)
      .then((r) => setLogs(r.data ?? []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [tab, query]);

  const displayName = (entry: LogEntry) =>
    entry.visitorName ?? entry.callerName ?? '—';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reception</h1>
          <p className="text-sm text-gray-500">Visitor logs, call logs, and front-desk activity</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4" /> New Log</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {LOG_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as 'visitor' | 'call')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          placeholder={`Search ${tab} logs…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="form-input pl-9 w-full"
        />
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Purpose</Th>
            <Th>Handled By</Th>
            <Th>Status</Th>
            <Th>Time</Th>
          </tr>
        </thead>
        <tbody>
          {loading ? <LoadingRow colSpan={5} /> :
           !logs.length ? <EmptyRow colSpan={5} message={`No ${tab} logs found`} /> :
           logs.map((l) => (
             <tr key={l.id}>
               <Td className="font-medium text-gray-900">{displayName(l)}</Td>
               <Td className="text-gray-600 text-sm">{l.purpose ?? '—'}</Td>
               <Td className="text-gray-600 text-sm">{l.handledBy?.name ?? '—'}</Td>
               <Td><StatusBadge status={l.status} /></Td>
               <Td className="text-gray-500 text-xs">{formatDate(l.createdAt)}</Td>
             </tr>
           ))
          }
        </tbody>
      </Table>
    </div>
  );
}
