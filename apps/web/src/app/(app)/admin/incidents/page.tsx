'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { AlertCircle, Plus } from 'lucide-react';
type Incident = { id: string; title: string; severity: string; status: string; affectedTenants?: number; createdAt: string; resolvedAt?: string };
export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get<{ data: Incident[] }>('/platform/incidents?limit=50').then((r) => setIncidents(r.data ?? [])).catch(() => setIncidents([])).finally(() => setLoading(false));
  }, []);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><AlertCircle className="h-6 w-6 text-red-600" /> Incidents</h1><p className="text-sm text-gray-500">Platform incidents and outage tracking</p></div>
        <Button size="sm"><Plus className="h-4 w-4" /> Report Incident</Button>
      </div>
      <Table>
        <thead><tr><Th>Title</Th><Th>Severity</Th><Th>Status</Th><Th>Affected Tenants</Th><Th>Started</Th><Th>Resolved</Th></tr></thead>
        <tbody>
          {loading ? <LoadingRow colSpan={6} /> : !incidents.length ? <EmptyRow colSpan={6} message="No incidents — system is healthy" /> :
           incidents.map((i) => (
             <tr key={i.id}>
               <Td className="font-medium text-gray-900">{i.title}</Td>
               <Td><StatusBadge status={i.severity} /></Td>
               <Td><StatusBadge status={i.status} /></Td>
               <Td className="text-sm text-gray-600">{i.affectedTenants ?? 0}</Td>
               <Td className="text-xs text-gray-500">{formatDateTime(i.createdAt)}</Td>
               <Td className="text-xs text-gray-500">{i.resolvedAt ? formatDateTime(i.resolvedAt) : <span className="text-amber-600">Ongoing</span>}</Td>
             </tr>
           ))}
        </tbody>
      </Table>
    </div>
  );
}
