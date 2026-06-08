'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { ArrowLeft, Building } from 'lucide-react';

type Tenant = {
  id: string;
  name: string;
  slug: string;
  status?: string;
  plan?: string;
  subscriptionStatus?: string;
  createdAt: string;
};

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    // No single-fetch endpoint yet — resolve from the tenant registry list.
    api.get<{ data: Tenant[] }>('/platform/tenants?limit=500')
      .then((r) => setTenant((r.data ?? []).find((t) => t.id === id) ?? null))
      .catch(() => setTenant(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-32 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-center py-16 text-gray-400">
        Tenant not found. <Link href="/admin/tenants" className="text-primary-600 underline">Back to Tenant Registry</Link>
      </div>
    );
  }

  const rows: [string, string | undefined][] = [
    ['Firm Name', tenant.name],
    ['Slug', tenant.slug],
    ['Plan', tenant.plan],
    ['Subscription', tenant.subscriptionStatus],
    ['Onboarded', formatDate(tenant.createdAt)],
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/admin/tenants" className="mt-1 text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building className="h-6 w-6 text-primary-600" /> {tenant.name}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5 font-mono">{tenant.slug}</p>
          </div>
        </div>
        {tenant.status && <StatusBadge status={tenant.status} />}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Tenant Information</h2>
        <dl className="space-y-3 text-sm">
          {rows.filter(([, v]) => v).map(([label, value]) => (
            <div key={label} className="flex gap-3">
              <dt className="text-gray-500 w-32 flex-shrink-0">{label}</dt>
              <dd className="text-gray-900 font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-700">
        Tenant administration (modules, quotas, subscription changes) is managed from the
        platform control plane. Deeper tenant management views are part of WIP-001.
      </div>
    </div>
  );
}
