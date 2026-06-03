'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate, statusColor } from '@/lib/utils';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Plus, Search } from 'lucide-react';

type Matter = {
  id: string;
  title: string;
  matterCode: string;
  status: string;
  category: string;
  createdAt: string;
  client?: { name: string } | null;
  assignedLawyer?: { name: string } | null;
};

export default function MattersPage() {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('search', query);
    if (status) params.set('status', status);
    api.get<{ data: Matter[] }>(`/matters?${params}`)
      .then((r) => setMatters(r.data ?? []))
      .catch(() => setMatters([]))
      .finally(() => setLoading(false));
  }, [query, status]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Matters</h1>
          <p className="text-sm text-gray-500">Legal cases and matters under management</p>
        </div>
        <Link href="/app/matters/new">
          <Button size="sm"><Plus className="h-4 w-4" /> New Matter</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search matters…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="form-input pl-9 w-full"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="form-select w-40">
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="CLOSED">Closed</option>
          <option value="ON_HOLD">On Hold</option>
        </select>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Matter Code</Th>
            <Th>Title</Th>
            <Th>Client</Th>
            <Th>Category</Th>
            <Th>Status</Th>
            <Th>Opened</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {loading ? <LoadingRow colSpan={7} /> :
           !matters.length ? <EmptyRow colSpan={7} message="No matters found" /> :
           matters.map((m) => (
             <tr key={m.id}>
               <Td><span className="font-mono text-xs text-gray-600">{m.matterCode}</span></Td>
               <Td><Link href={`/app/matters/${m.id}`} className="font-medium text-primary-700 hover:underline">{m.title}</Link></Td>
               <Td className="text-gray-600">{m.client?.name ?? '—'}</Td>
               <Td className="text-gray-600 text-xs">{m.category?.replace(/_/g, ' ')}</Td>
               <Td><StatusBadge status={m.status} /></Td>
               <Td className="text-gray-500 text-xs">{formatDate(m.createdAt)}</Td>
               <Td>
                 <Link href={`/app/matters/${m.id}`} className="text-xs text-primary-600 hover:underline">Open</Link>
               </Td>
             </tr>
           ))
          }
        </tbody>
      </Table>
    </div>
  );
}
