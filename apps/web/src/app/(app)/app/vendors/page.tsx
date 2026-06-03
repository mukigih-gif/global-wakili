'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Plus, Search } from 'lucide-react';

type Vendor = {
  id: string;
  name: string;
  vendorCode?: string | null;
  email?: string | null;
  phone?: string | null;
  category?: string | null;
  status: string;
  createdAt: string;
};

type Bill = {
  id: string;
  billNumber: string;
  vendor?: { name: string } | null;
  amount: number;
  currency: string;
  status: string;
  dueDate?: string | null;
  createdAt: string;
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'vendors' | 'bills'>('vendors');
  const [query, setQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('search', query);
    if (tab === 'vendors') {
      api.get<{ data: Vendor[] }>(`/procurement/vendors?${params}`)
        .then((r) => setVendors(r.data ?? []))
        .catch(() => setVendors([]))
        .finally(() => setLoading(false));
    } else {
      api.get<{ data: Bill[] }>(`/procurement/bills?${params}`)
        .then((r) => setBills(r.data ?? []))
        .catch(() => setBills([]))
        .finally(() => setLoading(false));
    }
  }, [tab, query]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendors & Procurement</h1>
          <p className="text-sm text-gray-500">Supplier register and purchase bills</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4" /> {tab === 'vendors' ? 'New Vendor' : 'New Bill'}</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['vendors', 'bills'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setQuery(''); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 capitalize transition-colors ${
              tab === t
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          placeholder={`Search ${tab}…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="form-input pl-9 w-full"
        />
      </div>

      {tab === 'vendors' ? (
        <Table>
          <thead>
            <tr>
              <Th>Code</Th><Th>Name</Th><Th>Category</Th><Th>Email</Th><Th>Phone</Th><Th>Status</Th><Th>Since</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow colSpan={7} /> :
             !vendors.length ? <EmptyRow colSpan={7} message="No vendors found" /> :
             vendors.map((v) => (
               <tr key={v.id}>
                 <Td><span className="font-mono text-xs text-gray-600">{v.vendorCode ?? '—'}</span></Td>
                 <Td className="font-medium text-gray-900">{v.name}</Td>
                 <Td className="text-gray-600 text-xs">{v.category?.replace(/_/g, ' ') ?? '—'}</Td>
                 <Td className="text-gray-600 text-sm">{v.email ?? '—'}</Td>
                 <Td className="text-gray-600 text-sm">{v.phone ?? '—'}</Td>
                 <Td><StatusBadge status={v.status} /></Td>
                 <Td className="text-gray-500 text-xs">{formatDate(v.createdAt)}</Td>
               </tr>
             ))}
          </tbody>
        </Table>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Bill No.</Th><Th>Vendor</Th><Th>Amount</Th><Th>Status</Th><Th>Due Date</Th><Th>Created</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow colSpan={6} /> :
             !bills.length ? <EmptyRow colSpan={6} message="No bills found" /> :
             bills.map((b) => (
               <tr key={b.id}>
                 <Td><span className="font-mono text-xs text-gray-600">{b.billNumber}</span></Td>
                 <Td className="font-medium text-gray-900">{b.vendor?.name ?? '—'}</Td>
                 <Td className="text-gray-900 font-medium">{b.currency} {b.amount.toLocaleString()}</Td>
                 <Td><StatusBadge status={b.status} /></Td>
                 <Td className="text-gray-500 text-xs">{b.dueDate ? formatDate(b.dueDate) : '—'}</Td>
                 <Td className="text-gray-500 text-xs">{formatDate(b.createdAt)}</Td>
               </tr>
             ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
