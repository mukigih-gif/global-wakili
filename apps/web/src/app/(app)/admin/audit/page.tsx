'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Shield, Search } from 'lucide-react';
type AuditLog = { id: string; action: string; entityType: string; entityId?: string; userId?: string; tenantId?: string; severity: string; success: boolean; createdAt: string };
export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  useEffect(() => {
    api.get<{ data: AuditLog[] }>('/audit?limit=100').then((r) => setLogs(r.data ?? [])).catch(() => setLogs([])).finally(() => setLoading(false));
  }, []);
  const filtered = logs.filter((l) => !query || l.action?.toLowerCase().includes(query.toLowerCase()) || l.entityType?.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Shield className="h-6 w-6 text-primary-600" /> Platform Audit Log</h1><p className="text-sm text-gray-500">Tamper-evident audit trail across all tenant activities</p></div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type="search" placeholder="Filter by action or entity…" value={query} onChange={(e) => setQuery(e.target.value)} className="form-input pl-9 w-full" /></div>
      <Table>
        <thead><tr><Th>Action</Th><Th>Entity</Th><Th>Tenant</Th><Th>Severity</Th><Th>Result</Th><Th>Timestamp</Th></tr></thead>
        <tbody>
          {loading ? <LoadingRow colSpan={6} /> : !filtered.length ? <EmptyRow colSpan={6} message="No audit logs" /> :
           filtered.map((l) => (
             <tr key={l.id}>
               <Td className="font-mono text-xs text-gray-700">{l.action}</Td>
               <Td className="text-xs text-gray-600">{l.entityType}{l.entityId ? ` / ${l.entityId.slice(-8)}` : ''}</Td>
               <Td className="text-xs font-mono text-gray-400">{l.tenantId?.slice(-8) ?? '—'}</Td>
               <Td><StatusBadge status={l.severity ?? 'INFO'} /></Td>
               <Td>{l.success ? <span className="text-green-600 text-xs">✓ Success</span> : <span className="text-red-600 text-xs">✗ Failed</span>}</Td>
               <Td className="text-xs text-gray-500">{formatDateTime(l.createdAt)}</Td>
             </tr>
           ))}
        </tbody>
      </Table>
    </div>
  );
}
