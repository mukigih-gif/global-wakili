export const dynamic = 'force-dynamic';
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { StatCard } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Building, DollarSign, AlertCircle, Users, Shield } from 'lucide-react';

type PlatformSummary = {
  totalTenants: number;
  activeTenants: number;
  totalRevenue: string;
  openIncidents: number;
};

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  lifecycleStatus?: string;
  plan?: string;
  createdAt: string;
};

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<PlatformSummary | null>(null);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ overview: PlatformSummary }>('/platform/monitoring/overview').catch(() => null),
      api.get<{ data: TenantRow[] }>('/platform/tenants?limit=10').catch(() => ({ data: [] })),
    ]).then(([sum, ten]) => {
      setSummary(sum?.overview ?? null);
      setTenants(ten?.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Control Plane</h1>
          <p className="text-sm text-gray-500">Super Admin — Global Wakili Platform Administration</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Tenants" value={loading ? '—' : (summary?.totalTenants ?? tenants.length)} icon={<Building className="h-5 w-5" />} />
        <StatCard label="Active Tenants" value={loading ? '—' : (summary?.activeTenants ?? '—')} icon={<Users className="h-5 w-5" />} deltaType="up" />
        <StatCard label="Platform Revenue" value={loading ? '—' : (summary?.totalRevenue ?? '—')} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard label="Open Incidents" value={loading ? '—' : (summary?.openIncidents ?? 0)} icon={<AlertCircle className="h-5 w-5" />} deltaType={summary?.openIncidents ? 'down' : 'neutral'} />
      </div>

      {/* Tenants */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="font-semibold">Tenant Registry</h2>
          <a href="/admin/tenants" className="text-xs text-primary-600 hover:underline">View all tenants</a>
        </div>
        <Table>
          <thead>
            <tr><Th>Firm Name</Th><Th>Slug</Th><Th>Plan</Th><Th>Status</Th><Th>Created</Th><Th></Th></tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow colSpan={6} /> :
             !tenants.length ? <EmptyRow colSpan={6} message="No tenants found" /> :
             tenants.map((t) => (
               <tr key={t.id}>
                 <Td className="font-medium">{t.name}</Td>
                 <Td className="font-mono text-xs text-gray-500">{t.slug}</Td>
                 <Td>{t.plan ? <span className="badge-blue">{t.plan}</span> : '—'}</Td>
                 <Td><StatusBadge status={t.lifecycleStatus ?? 'UNKNOWN'} /></Td>
                 <Td className="text-gray-500 text-xs">{formatDate(t.createdAt)}</Td>
                 <Td>
                   <a href={`/admin/tenants/${t.id}`} className="text-xs text-primary-600 hover:underline">Manage</a>
                 </Td>
               </tr>
             ))
            }
          </tbody>
        </Table>
      </div>

      {/* Admin quick links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Tenants', href: '/admin/tenants' },
          { label: 'Subscriptions', href: '/admin/subscriptions' },
          { label: 'Monitoring', href: '/admin/monitoring' },
          { label: 'Incidents', href: '/admin/incidents' },
          { label: 'Impersonation', href: '/admin/impersonation' },
          { label: 'Audit Logs', href: '/admin/audit' },
        ].map((link) => (
          <a key={link.label} href={link.href} className="card p-3 text-center text-sm font-medium text-primary-700 hover:bg-primary-50 hover:border-primary-200 transition-colors">
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}
