'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Plus, Search, AlertCircle, TrendingUp } from 'lucide-react';

type Client = {
  id: string;
  name: string;
  clientCode: string;
  email?: string | null;
  phoneNumber?: string | null;
  status: string;
  riskBand?: string | null;
  createdAt: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('search', query);
    if (status) params.set('status', status);
    api.get<{ data: Client[] }>(`/clients?${params}`)
      .then((r) => setClients(r.data ?? []))
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }, [query, status]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500">Client register and relationship management</p>
        </div>
        <div className="flex gap-2">
          <Link href="/app/clients/issues">
            <Button size="sm" variant="secondary"><AlertCircle className="h-4 w-4" /> Issues</Button>
          </Link>
          <Link href="/app/clients/prospects">
            <Button size="sm" variant="secondary"><TrendingUp className="h-4 w-4" /> Prospects</Button>
          </Link>
          <Link href="/app/clients/new">
            <Button size="sm"><Plus className="h-4 w-4" /> New Client</Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search clients…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="form-input pl-9 w-full"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="form-select w-40">
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="PROSPECT">Prospect</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Code</Th>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Phone</Th>
            <Th>Risk</Th>
            <Th>Status</Th>
            <Th>Since</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {loading ? <LoadingRow colSpan={8} /> :
           !clients.length ? <EmptyRow colSpan={8} message="No clients found" /> :
           clients.map((c) => (
             <tr key={c.id}>
               <Td><span className="font-mono text-xs text-gray-600">{c.clientCode}</span></Td>
               <Td><Link href={`/app/clients/${c.id}`} className="font-medium text-primary-700 hover:underline">{c.name}</Link></Td>
               <Td className="text-gray-600 text-sm">{c.email ?? '—'}</Td>
               <Td className="text-gray-600 text-sm">{c.phoneNumber ?? '—'}</Td>
               <Td>{c.riskBand ? <StatusBadge status={c.riskBand} /> : <span className="text-gray-400 text-xs">—</span>}</Td>
               <Td><StatusBadge status={c.status} /></Td>
               <Td className="text-gray-500 text-xs">{formatDate(c.createdAt)}</Td>
               <Td>
                 <Link href={`/app/clients/${c.id}`} className="text-xs text-primary-600 hover:underline">View</Link>
               </Td>
             </tr>
           ))
          }
        </tbody>
      </Table>
    </div>
  );
}
