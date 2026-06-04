'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Building, Plus, Search } from 'lucide-react';
type Tenant = { id: string; name: string; slug: string; status?: string; plan?: string; createdAt: string };
export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  useEffect(() => {
    api.get<{ data: Tenant[] }>('/platform/tenants?limit=100').then((r) => setTenants(r.data ?? [])).catch(() => setTenants([])).finally(() => setLoading(false));
  }, []);
  const filtered = tenants.filter((t) => !query || t.name.toLowerCase().includes(query.toLowerCase()) || t.slug.includes(query.toLowerCase()));
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Building className="h-6 w-6 text-primary-600" /> Tenant Registry</h1><p className="text-sm text-gray-500">All law firms onboarded to Global Wakili</p></div>
        <Button size="sm"><Plus className="h-4 w-4" /> New Tenant</Button>
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type="search" placeholder="Search tenants…" value={query} onChange={(e) => setQuery(e.target.value)} className="form-input pl-9 w-full" /></div>
      <Table>
        <thead><tr><Th>Firm Name</Th><Th>Slug</Th><Th>Plan</Th><Th>Status</Th><Th>Created</Th><Th></Th></tr></thead>
        <tbody>
          {loading ? <LoadingRow colSpan={6} /> : !filtered.length ? <EmptyRow colSpan={6} message="No tenants found" /> :
           filtered.map((t) => (
             <tr key={t.id}>
               <Td className="font-medium text-gray-900">{t.name}</Td>
               <Td><span className="font-mono text-xs text-gray-500">{t.slug}</span></Td>
               <Td>{t.plan ? <span className="badge-blue">{t.plan}</span> : '—'}</Td>
               <Td><StatusBadge status={t.status ?? 'ACTIVE'} /></Td>
               <Td className="text-xs text-gray-500">{formatDate(t.createdAt)}</Td>
               <Td><button className="text-xs text-primary-600 hover:underline">Manage</button></Td>
             </tr>
           ))}
        </tbody>
      </Table>
    </div>
  );
}
